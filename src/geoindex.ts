/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Geofile, GeofileHandle, GeofileFeature, GeofileFilter, setFilter } from './geofile'
import * as gt from './geotools';
import { BinRtree } from './binrtree';
import { binrbush } from './binrbush';
import proj4 from 'proj4';
const WGS84 = 'EPSG:4326';

const EXPARRAY_INIT = 1024
const EXPARRAY_MAX = 64 * 1024

class Uint32ArraySeq {
    int32arr: Uint32Array
    setted: number
    lastbunch: number

    get array() { return this.int32arr.slice(0, this.setted) }
    get length() { return this.setted }

    constructor(bytes?: number) {
        this.int32arr = new Uint32Array(bytes || EXPARRAY_INIT)
        this.lastbunch = EXPARRAY_INIT
        this.setted = 0
    }
    private expand() {
        const old = this.int32arr
        this.lastbunch = this.lastbunch < EXPARRAY_MAX ? this.lastbunch * 2 : this.lastbunch
        this.int32arr = new Uint32Array(old.length + this.lastbunch)
        this.int32arr.set(old)
    }
    add(...uint32: number[]) {
        while (this.setted + uint32.length > this.int32arr.length) this.expand()
        this.int32arr.set(uint32, this.setted)
        this.setted += uint32.length
    }
}
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
    get name() { return `${this.attribute}/${this.type}` }
    get array() { return this.dv ? this.dv.buffer : null}
    abstract getRecord(rank): { rank: number, [key: string]: any }
    abstract get count(): number
    abstract begin(): void
    abstract index(feature: GeofileFeature): void
    abstract end(): void

    assertRank(idxrank: number): asserts idxrank {
        if (idxrank >= 0 && idxrank < this.count) return;
        throw Error(`GeofileIndex ${this.type} [${this.geofile.name}/${this.attribute}] :  rank=${idxrank} not in domain [0,${this.count}[`)
    }

    protected constructor(type: GeofileIndexType, attribute: string, geofile: Geofile, dv?: DataView) {
        this.type = type
        this.attribute = attribute
        this.dv = dv
        this.geofile = geofile
    }

    static create(type: GeofileIndexType, attribute: string, geofile: Geofile, dv?: DataView): GeofileIndex {
        switch (type) {
            case GeofileIndexType.handle: return new GeofileIndexHandle(geofile, dv)
            case GeofileIndexType.rtree: return new GeofileIndexRtree(geofile, dv)
            case GeofileIndexType.ordered: return new GeofileIndexOrdered(attribute, geofile, dv)
            case GeofileIndexType.prefix: return new GeofileIndexPrefix(attribute, geofile, dv)
            case GeofileIndexType.fuzzy: return new GeofileIndexFuzzy(attribute, geofile, dv)
            default: throw Error(`Geofile.create() : unknown index type "${type}"`)
        }
    }
}

export class GeofileIndexHandle extends GeofileIndex {

    // index handle record is : { pos:uint32, len:uint32 }
    // pos: is offset in datafile to retrieve feature data
    // len: is length in bytes of the feature data
    static RECSIZE = 8 // 2 x uint32
    // only used durind build index phase (begin/index/end )
    seq: Uint32ArraySeq

    get count() { return this.dv ? this.dv.byteLength / GeofileIndexHandle.RECSIZE : 0 }

    constructor(geofile: Geofile, dv?: DataView,) {
        super(GeofileIndexType.handle, 'rank', geofile, dv)
    }

    begin() {
        this.seq = new Uint32ArraySeq()
    }
    index(feature: GeofileFeature) {
        this.seq.add(feature.pos, feature.len)
    }
    end() {
        this.dv = new DataView(this.seq.array.buffer)
        this.seq = null;
    }

    getRecord(rank: number): GeofileHandle {
        const offset = rank * GeofileIndexHandle.RECSIZE
        const pos = this.dv.getUint32(offset, true)
        const len = this.dv.getUint32(offset + 4, true)
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
    // only used durind build index phase (begin/index/end )
    private clusters: number[][]
    private cluster = []
    private bounds: number[]

    private rtree: BinRtree
    get extent(): number[] { return this.rtree.extent(); }

    constructor(geofile: Geofile, dv?: DataView,) {
        super(GeofileIndexType.rtree, 'geometry', geofile, dv)
        this.rtree = new BinRtree(dv);
    }

    begin() {
        this.clusters = []
        this.cluster = []
        this.bounds = [null, null, null, null, 0, 0]
    }

    index(feature: GeofileFeature) {
        const clustersize = 200
        if (this.cluster.length === clustersize && !this.bounds.some(val => val === null)) {
            this.clusters.push(this.bounds);
            this.cluster = []
            this.bounds = [null, null, null, null, feature.rank, 0];
        }
        this.cluster.push(feature)
        if (feature.bbox) this.bboxextend(this.bounds, feature.bbox)
    }

    end() {
        if (this.cluster.length > 0 && !this.bounds.some(val => val === null)) this.clusters.push(this.bounds)
        const tree = new binrbush();
        (<any>tree).load(this.clusters);
        const array = tree.toBinary()
        this.dv = new DataView(array)
        this.rtree = new BinRtree(this.dv);
        this.clusters = null
        this.cluster = null
        this.bounds = null
    }

    getRecord(rank: number) {
        // not to be used (all is in BinRtree)
        return { rank }
    }

    bbox(bbox: number[], options: GeofileFilter = {}): Promise<GeofileFeature[]> {
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
        return Promise.all(promises).then(array => 
            array.reduce((res,arr) => { 
                res.push(...arr); return res 
            },[])
        )
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

    private bboxextend(bounds: number[], bbox: number[]) {
        if (bounds[0] == null || bbox[0] < bounds[0]) { bounds[0] = bbox[0]; }
        if (bounds[1] == null || bbox[1] < bounds[1]) { bounds[1] = bbox[1]; }
        if (bounds[2] == null || bbox[2] > bounds[2]) { bounds[2] = bbox[2]; }
        if (bounds[3] == null || bbox[3] > bounds[3]) { bounds[3] = bbox[3]; }
        bounds[5]++;
    }

}

export abstract class GeofileIndexAttribute extends GeofileIndex {

    private next(idxrank: number, searched: any[], compare: (a: unknown, b: unknown) => number, options: GeofileFilter, found: GeofileFeature[] = []): Promise<GeofileFeature[]> {
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
    // only used durind build index phase (begin/index/end )
    attlist: { value: any, rank: number }[]

    constructor(attribute: string, geofile: Geofile, dv: DataView) {
        super(GeofileIndexType.ordered, attribute, geofile, dv)
    }

    begin() {
        this.attlist=[]
    }
    index(feature: GeofileFeature) {
        const value = feature.properties[this.attribute];
        this.attlist.push({ value, rank: feature.rank });
    }
    end() {
        this.attlist.sort((a,b) => this.compare(a.value,b.value,a.rank,b.rank));
        const array = Uint32Array.from(this.attlist.map(o => o.rank))
        this.dv = new DataView(array.buffer)
        this.attlist = null
    }

    getRecord(idxrank: number) {
        this.assertRank(idxrank)
        const offset = idxrank * 4
        const rank = this.dv.getUint32(offset, true);
        return { rank };
    }

    search(searched: any[], options: GeofileFilter = {}): Promise<GeofileFeature[]> {
        const filter = (feature) => {
            const value = feature.properties[this.attribute]
            return feature && searched.some(v => v === value);
        };
        const compare = (key, feature) => this.compare(key,feature.properties[this.attribute])
        options = setFilter(options, filter)
        return this.binarySearch(searched, compare, options);
    }

    private compare (a: any, b: any , ra = 0, rb = 0) {
        a = (a === undefined) ? null : a;
        b = (b === undefined) ? null : b;
        const rdiff = (ra - rb)
        if (a === null) return (b === null) ? rdiff : -1
        if (b === null) return  1
        if (a < b) return -1
        if (a > b) return 1
        return rdiff
    }


}

export class GeofileIndexFuzzy extends GeofileIndexAttribute {

    // this.dv dataview is an ordered array of records { hash:uint32, rank:uint32 }
    // hash: is the fuzzy hash of the attribute  
    // rank: rank of a feature associated to the fuzzy hash
    static RECSIZE = 8  // 2 x uint32
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexFuzzy.RECSIZE : 0 }
    // only used durind build index phase (begin/index/end )
    attlist: { hash: number, rank: number }[]

    constructor(attribute: string, geofile: Geofile, dv: DataView) {
        super(GeofileIndexType.fuzzy, attribute, geofile, dv)
    }
    begin() {
        this.attlist = []
    }
    index(feature: GeofileFeature) {
            const value = feature.properties[this.attribute].toString();
            const hash = value ? value.fuzzyhash() : 0;
            this.attlist.push({ hash, rank: feature.rank });
    }
    end() {
        this.attlist.sort(function (a, b) { return (a.hash < b.hash) ? -1 : (a.hash > b.hash) ? 1 : 0; });
        const data = this.attlist.reduce((res, att) => { res.push(att.hash, att.rank); return res }, [])
        const array = Uint32Array.from(data);
        this.dv = new DataView(array.buffer)
        this.attlist = null
    }

    getRecord(idxrank: number) {
        this.assertRank(idxrank)
        const offset = idxrank * GeofileIndexFuzzy.RECSIZE
        const hash = this.dv.getUint32(offset, true);
        const rank = this.dv.getUint32(offset + 4, true);
        return { rank, hash };
    }

    search(searched: string, options: GeofileFilter = {}): Promise<GeofileFeature[]> {
        const maxdist = options.maxTextDistance | 5;
        const hashes: Set<number> = new Set();
        hashes.add(searched.fuzzyhash());
        [...hashes.values()].forEach(hash => String.fuzzyExtend(hash).forEach(hash => hashes.add(hash)));
        [...hashes.values()].forEach(hash => String.fuzzyExtend(hash).forEach(hash => hashes.add(hash)));
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
    // only used durind build index phase (begin/index/end )
    preflist: { value: string, rank: number }[]

    constructor(attribute: string, geofile: Geofile, dv: DataView) {
        super(GeofileIndexType.prefix, attribute, geofile, dv)
    }
    begin() {
        this.preflist = [];   
    }

    index(feature: GeofileFeature) {
        const value = feature.properties[this.attribute];
        const wlist = value ? `${value}`.wordlist() : [];
        wlist.forEach((w: string) => this.preflist.push({ value: w.substring(0, 4), rank: feature.rank }));
    }

    end() {
        this.preflist.sort(function (a, b) { return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : (a.rank - b.rank); });
        this.dv = new DataView(new ArrayBuffer(this.preflist.length* GeofileIndexPrefix.RECSIZE));
        this.preflist.reduce((offset, att) => {
            this.dv.setAscii(offset, '    ')
            this.dv.setAscii(offset, att.value, 4)
            this.dv.setUint32(offset + 4, att.rank, true);
            return offset + GeofileIndexPrefix.RECSIZE
        },0);
        this.preflist = null
    }

    getRecord(idxrank: number) {
        this.assertRank(idxrank)
        const offset = idxrank * GeofileIndexPrefix.RECSIZE
        const prefix = this.dv.getAscii(offset, 4)
        const rank = this.dv.getUint32(offset + 4, true);
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

