/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Geofile, GeofileHandle, GeofileFeature, GeofileFilter, setFilter } from './geofile'
import * as gt from './geotools';
import { BinRtree } from './binrtree';
import { binrbush } from './binrbush';
import proj4 from 'proj4';
const WGS84 = 'EPSG:4326';

export enum GeofileIndexType {
    handle = 'handle',
    rtree = 'rtree',
    ordered = 'ordered',
    fuzzy = 'fuzzy',
    prefix = 'prefix'
}

export interface GeofileIndexDef {
    attribute: string,
    type: GeofileIndexType
}

export abstract class GeofileIndex {

    readonly type: GeofileIndexType;
    readonly attribute: string;
    protected dv: DataView;
    protected geofile: Geofile;
    get size() { return this.dv ? this.dv.byteLength : 0 }
    get name() { return `${this.attribute}/${this.type}`} 
    abstract getRecord(rank): { rank: number, [key: string]: any }
    abstract get count(): number

    assertRank(idxrank: number): asserts idxrank {
        if (idxrank >= 0 && idxrank < this.count) return;
        throw Error(`GeofileIndexPrefix [${this.geofile.name}/${this.attribute}] :  rank=${idxrank} not in domain [0,${this.count}[`)
    }

    protected constructor(geofile: Geofile, type: GeofileIndexType, attribute: string, dv?: DataView) {
        this.attribute = attribute
        this.type = type
        this.dv = dv
        this.geofile = geofile
    }

    static async build(type: GeofileIndexType, geofile: Geofile, attribute: string): Promise<ArrayBuffer> {
        switch (type) {
            case GeofileIndexType.handle: return GeofileIndexHandle.compile(geofile)
            case GeofileIndexType.rtree: return GeofileIndexRtree.compile(geofile)
            case GeofileIndexType.ordered: return GeofileIndexOrdered.compile(geofile, attribute)
            case GeofileIndexType.prefix: return GeofileIndexPrefix.compile(geofile, attribute)
            case GeofileIndexType.fuzzy: return GeofileIndexFuzzy.compile(geofile, attribute)
        }
        throw Error(`Geofile.create() : unknown index type "${type}"`)
    }
    static create(type: GeofileIndexType, geofile: Geofile, dv: DataView, attribute: string): GeofileIndex {
        switch (type) {
            case GeofileIndexType.handle: return new GeofileIndexHandle(geofile, dv)
            case GeofileIndexType.rtree: return new GeofileIndexRtree(geofile, dv)
            case GeofileIndexType.ordered: return new GeofileIndexOrdered(geofile, dv, attribute)
            case GeofileIndexType.prefix: return new GeofileIndexPrefix(geofile, dv, attribute)
            case GeofileIndexType.fuzzy: return new GeofileIndexFuzzy(geofile, dv, attribute)
            default: throw Error(`Geofile.create() : unknown index type "${type}"`)
        }
    }


}

export class GeofileIndexHandle extends GeofileIndex {

    // index handle record is : { pos:uint32, len:uint32 }
    // pos: is offset in datafile to retrieve feature data
    // len: is length in bytes of the feature data
    static RECSIZE = 8 // 2 x uint32
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexHandle.RECSIZE : 0 }

    constructor(geofile: Geofile, dv?: DataView,) {
        super(geofile, GeofileIndexType.handle, 'rank', dv)
    }

    static async compile(geofile: Geofile): Promise<ArrayBuffer> {
        const array: number[] = []
        for await (const feature of geofile.parse()) {
            array.push(feature.pos, feature.len)
        }
        return new Uint32Array(array).buffer
    }

    getRecord(rank: number): GeofileHandle {
        const offset = rank * GeofileIndexHandle.RECSIZE
        const pos = this.dv.getUint32(offset,true)
        const len = this.dv.getUint32(offset + 4,true)
        return { rank, pos, len }
    }


}

export class GeofileIndexRtree extends GeofileIndex {

    // index rtree record is : { height:uint8, xmin:float32, ymin:float32, xmax:float32, ymax:float32, rank|child:uint32, count/next:uint32 }
    // height: is heigth in rtree (0 is root) 
    // xmin,ymin,xmax,ymax: is is the cluster bbox
    // rank : is the rank of the first feature in geofile
    // count : is the number of feature in the cluster starting from 'rank' 
    // child : is the offset of the first child node
    // next : is the offset of next brother node  
    static RECSIZE = 25 // uint8 + 4 x float32 + 2 x uint32
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexRtree.RECSIZE : 0 }

    private rtree: BinRtree
    get extent(): number[] { return this.rtree.extent(); }

    constructor(geofile: Geofile, dv?: DataView,) {
        super(geofile, GeofileIndexType.rtree, 'geometry', dv)
        this.rtree = new BinRtree(dv);
    }

    static async compile(geofile: Geofile): Promise<ArrayBuffer> {
        const clustersize = 200
        const clusters: number[][] = [];
        let cluster = []
        let bounds = [null, null, null, null, 0, 0];
        for await (const feature of geofile.parse()) {
            if (cluster.length === clustersize && !bounds.some(val => val === null)) {
                clusters.push(bounds);
                cluster = []
                bounds = [null, null, null, null, feature.rank + 1, 0];
            }
            cluster.push(feature)
            this.bboxextend(bounds, feature.bbox)
        }
        if (cluster.length > 0 && !bounds.some(val => val === null)) clusters.push(bounds)
        const tree = new binrbush();
        (<any>tree).load(clusters);
        return tree.toBinary()
    }

    getRecord(rank: number) {
        // not to be used (all is in BinRtree)
        return { rank }
    }

    bbox(bbox: number[], options: GeofileFilter = {}): Promise<GeofileFeature[]> {
        const start = Date.now();
        const projbbox = options.targetProjection ? gt.transform_e(bbox, this.geofile.proj, options.targetProjection) : null;

        // add bbox filter
        options = setFilter(options, (feature: GeofileFeature) => {
            const abbox = (feature.proj === options.targetProjection) ? projbbox : bbox;
            const res = gt.intersects_eg(abbox, feature.geometry);
            return res;
        });

        // scan rtree index.
        const bboxlist: number[][] = this.rtree.search(bbox).filter(ibbox => gt.intersects_ee(ibbox, bbox));
        const promises = bboxlist.map(ibbox => this.geofile.getFeatures(ibbox[4], ibbox[5], options));
        return Promise.clean<GeofileFeature>(promises).then(f => this.logtimes(start, bboxlist, f));
    }

    point(lon: number, lat: number, options: GeofileFilter = {}): Promise<GeofileFeature[]> {
        const tol = options.pointSearchTolerance ? options.pointSearchTolerance : 0.00001;

        // add point / feature intersect filter
        options = setFilter(options, (feature: GeofileFeature) => {
            const point = proj4(this.geofile.proj, feature.proj).forward([lon, lat]);
            return gt.intersects_cg(point, feature.geometry);
        });

        // return features intersecting point found in small bbox arround point 
        return this.bbox([lon - tol, lat - tol, lon + tol, lat + tol], options);
    }

    nearest(lon: number, lat: number, radius: number | number[], options: GeofileFilter = {}): Promise<GeofileFeature> {
        let bbox: number[];
        if (Array.isArray(radius)) {
            bbox = radius;
        } else {
            const wgs84pt = proj4(this.geofile.proj, WGS84).forward([lon, lat]);
            const unitpermeter = 1 / gt.meter_per_unit(this.geofile.proj);
            const wgs84r = radius * unitpermeter;
            bbox = [wgs84pt[0] - wgs84r, wgs84pt[1] - wgs84r, wgs84pt[0] + wgs84r, wgs84pt[1] + wgs84r];
            options = setFilter(options, (feature: GeofileFeature) => {
                const closest = gt.closest_cg([lon, lat], feature.geometry);
                const closest_wgs84 = proj4(feature.proj, WGS84).forward(closest);
                feature.distance = gt.distance_hs(wgs84pt, closest_wgs84);
                return (feature.distance <= radius);
            });
        }
        // return nearest from features found in bbox
        return this.bbox(bbox, options)
            .then((features) => features.length ? features.reduce((prev, cur) => !cur ? prev : !prev ? cur : (prev.distance < cur.distance) ? prev : cur) : null);
    }

    private static bboxextend(bounds: number[], bbox: number[]) {
        if (bounds[0] == null || bbox[0] < bounds[0]) { bounds[0] = bbox[0]; }
        if (bounds[1] == null || bbox[1] < bounds[1]) { bounds[1] = bbox[1]; }
        if (bounds[2] == null || bbox[2] > bounds[2]) { bounds[2] = bbox[2]; }
        if (bounds[3] == null || bbox[3] > bounds[3]) { bounds[3] = bbox[3]; }
        bounds[5]++;
    }

    private logtimes(start: number, bboxlist: number[][], features: GeofileFeature[]): GeofileFeature[] {
        const selectivity = Math.round(100 * bboxlist.reduce((p, c) => p + c[5], 0) / this.geofile.count);
        const elapsed = (Date.now() - start);
        const best = Math.round(100 * features.length / this.geofile.count);
        const objsec = Math.round(features.length / (elapsed / 1000));
        console.log(`Geofile.search [${this.geofile.name}]: ${features.length} o / ${elapsed} ms /  ${objsec} obj/s sel: ${selectivity}% (vs ${best}%)`);
        return features;
    }
}

export abstract class GeofileIndexAttribute extends GeofileIndex {

    private next(idxrank: number, searched: any[], compare: (a:unknown,b:unknown) => number, options: GeofileFilter, found: GeofileFeature[] = []): Promise<GeofileFeature[]> {
        if (idxrank >= this.count) return Promise.resolve(found)
        const record = this.getRecord(idxrank);
        return this.geofile.getFeature(record.rank)
            .then(feature => {
                const res = searched.some((search) => compare(search, feature) === 0);
                if (res) {
                    if (feature) { found.push(feature); }
                    return this.next(idxrank + 1, searched, compare, options, found);
                }
                return found;
            });
    }

    // binary search with feature collection
    protected binarySearch(searched: any[], compare: (a, b) => number, options: GeofileFilter,
        imin = 0, imax = (this.count - 1)): Promise<GeofileFeature[]> {
        if (imax < imin) return Promise.resolve([]);

        // calculate midpoint to cut set in 2 parts
        const imid = Math.floor((imax + imin) / 2);

        const record = this.getRecord(imid);
        return this.geofile.getFeature(record.rank).then(feature => {
            const promises = [];
            if (imin === imax) { // end search reached
                promises.push(this.next(imin, searched, compare, options));
            } else {
                // constructing lower and upper subset (lsubset / usubset)
                const lsubset = [], usubset = [];
                // distribution on subsets
                searched.forEach((key, i) => (compare(key, feature) > 0) ? usubset.push(searched[i]) : lsubset.push(searched[i]));
                // preparing search promises for lower and upper subset
                if (usubset.length) { promises.push(this.binarySearch(usubset, compare, options, imid + 1, imax)); }
                if (lsubset.length) { promises.push(this.binarySearch(lsubset, compare, options, imin, imid)); }
            }
            // running promises
            return Promise.clean(promises);
        });
    }

}

export class GeofileIndexOrdered extends GeofileIndexAttribute {

    // index ordered record is : { rank:uint32 }
    // rank: is the rank of the feaure indexed
    get recsize() { return 4 } // 1 x uint32
    static RECSIZE = 4 // 1 x uint32
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexOrdered.RECSIZE : 0 }

    constructor(geofile: Geofile, dv: DataView, attribute: string) {
        super(geofile, GeofileIndexType.ordered, attribute, dv)
    }

    static async compile(geofile: Geofile, attribute: string): Promise<ArrayBuffer> {
        const attlist = [];
        for await (const feature of geofile.parse()) {
            const value = feature.properties[attribute];
            attlist.push({ value, rank: feature.rank });
        }
        attlist.sort(function (a, b) { return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : 0; });
        const array = Uint32Array.from(attlist.map( o => o.rank))
        return array.buffer;
    }

    getRecord(idxrank: number) {
        this.assertRank(idxrank)
        const offset = idxrank * 4
        const rank = this.dv.getUint32(offset,true);
        return { rank };
    }

    search(searched: any[], options: GeofileFilter = {}): Promise<GeofileFeature[]> {
        const filter = (feature) => {
            const value = feature.properties[this.attribute]
            return feature && searched.some(v => v === value);
        };
        const compare = (key, feature) => {
            const value = feature.properties[this.attribute]
            return (feature && key === value) ? 0 : (key > value) ? 1 : -1;
        };
        options = setFilter(options, filter);
        return this.binarySearch(searched, compare, options);
    }

}

export class GeofileIndexFuzzy extends GeofileIndexAttribute {

    // this.dv dataview is an ordered array of records { hash:uint32, rank:uint32 }
    // hash: is the fuzzy hash of the attribute  
    // rank: rank of a feature associated to the fuzzy hash
    static RECSIZE = 8  // 2 x uint32
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexFuzzy.RECSIZE : 0 }

    constructor(geofile: Geofile, dv: DataView, attribute: string) {
        super(geofile, GeofileIndexType.fuzzy, attribute, dv)
    }

    static async compile(geofile: Geofile, attribute: string): Promise<ArrayBuffer> {
        const attlist: { hash: number, rank: number }[] = [];
        for await (const feature of geofile.parse()) {
            const value = feature.properties[attribute].toString();
            const hash = value ? value.fuzzyhash() : 0;
            attlist.push({ hash, rank: feature.rank });
        }
        attlist.sort(function (a, b) { return (a.hash < b.hash) ? -1 : (a.hash > b.hash) ? 1 : 0; });
        const data = attlist.reduce((res,att) => { res.push(att.hash,att.rank); return res },[])
        const array = Uint32Array.from(data);
        return array.buffer
    }

    getRecord(idxrank: number) {
        this.assertRank(idxrank)
        const offset = idxrank * GeofileIndexFuzzy.RECSIZE
        const hash = this.dv.getUint32(offset,true);
        const rank = this.dv.getUint32(offset + 4,true);
        return { rank, hash };
    }

    search(searched: string, options: GeofileFilter = {}): Promise<GeofileFeature[]> {
        const maxdist = options.maxTextDistance | 5;
        const hashes: Set<number> = new Set();
        hashes.add(searched.fuzzyhash());
        [...hashes.values()].forEach( hash => String.fuzzyExtend(hash).forEach(hash => hashes.add(hash)) );
        [...hashes.values()].forEach( hash => String.fuzzyExtend(hash).forEach(hash => hashes.add(hash)) );
        const values = [...hashes.values()]

        options = setFilter(options, (f: GeofileFeature) => 
            searched.levenshtein(f.properties[this.attribute]) < maxdist
        );
        const compare = (key, feature) => key - feature.properties[this.attribute].fuzzyhash();

        return this.binarySearch(values, compare, options)
            .then((features: GeofileFeature[]) => {
                if (!features || !features.length) return []
                const res = features.map(feature => {
                    feature.distance = searched.levenshtein(feature.properties[this.attribute])
                    return feature
                })
                return res.sort((p1, p2) => p1.distance - p2.distance);
            });
    }
}

export class GeofileIndexPrefix extends GeofileIndexAttribute {

    // this.dv dataview is an ordered array of records { prefix:char[4], rank:uint32 }
    // prefix: 4 chars prefix 
    // rank: rank of a feature associated with this prefix
    static RECSIZE = 8 // 2 x uint32
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexPrefix.RECSIZE : 0 }

    constructor(geofile: Geofile, dv: DataView, attribute: string) {
        super(geofile, GeofileIndexType.prefix, attribute, dv)
    }

    static async compile(geofile: Geofile, attribute: string): Promise<ArrayBuffer> {
        const preflist: { value: string, rank: number }[] = [];
        for await (const feature of geofile.parse()) {
            const value = feature.properties[attribute];
            const wlist = value ? `${value}`.wordlist() : [];
            wlist.forEach((w: string) => preflist.push({ value: w.substring(0, 4), rank: feature.rank }));
        }

        preflist.sort(function (a, b) { return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : (a.rank - b.rank); });
        const array = new Uint32Array(2 * preflist.length).buffer;
        const dv = new DataView(array);
        preflist.forEach((att, index) => {
            const offset = index * GeofileIndexPrefix.RECSIZE;
            dv.setAscii(offset,'    ')
            dv.setAscii(offset,att.value,4)
            dv.setUint32(offset + 4, att.rank,true);
        });

        return array
    }
    getRecord(idxrank: number) {
        this.assertRank(idxrank)
        const offset = idxrank * GeofileIndexPrefix.RECSIZE
        const prefix = this.dv.getAscii(offset,4)
        const rank = this.dv.getUint32(offset + 4,true);
        return { rank, prefix };
    }

    search(searched: string, options?: GeofileFilter): Promise<GeofileFeature[]> {
        const prefixes = searched.prefix();
        const found = this.bsearch(prefixes);
        const maxfeature = options && options.maxFeature ? options.maxFeature : 100
        const ranks = Array.from(found.values()).slice(0, Math.min(maxfeature, found.size));
        return Promise.all(ranks.map(rank => this.geofile.getFeature(rank, options)))
    }

    // prefix found from firstrank searching intersection with previously found ranks 
    private intersect(firstrank: number, prefix: string, previous: Set<number>): Set<number> {
        const intersection = new Set<number>();
        for (let idxrank = firstrank; idxrank < this.count; idxrank++) {
            const record = this.getRecord(idxrank);
            if (record.prefix !== prefix) break
            if (!previous || previous.has(record.rank)) { intersection.add(record.rank); }
        }
        return intersection;
    }

    // Search with a dichotomic algorithm all ranks associated with an array of prefix

    private bsearch(prefixes: string[], found?: Set<number>, imin = 0, imax = this.count - 1): Set<number> {

        // is dichotomy terminated
        if (imax < imin) { 
            return new Set(); 
        }

        // calculate midpoint to divide set
        const imid = Math.floor((imax + imin) / 2);
        const record = this.getRecord(imid);
        if (imin === imax) { 
            return (prefixes.length > 1) ? new Set() : this.intersect(imin, record.prefix, found); 
        }

        // divide in two subset
        const usubset = [];
        const lsubset = [];
        prefixes.forEach(p => (p.substring(0, 4) > record.prefix) ? usubset.push(p) : lsubset.push(p));

        // search in each subset
        if (usubset.length) { found = this.bsearch(usubset, found, imid + 1, imax); }
        if (lsubset.length) { found = this.bsearch(lsubset, found, imin, imid); }
        return found;
    }




}

