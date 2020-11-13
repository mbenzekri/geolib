"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofileIndexPrefix = exports.GeofileIndexFuzzy = exports.GeofileIndexOrdered = exports.GeofileIndexAttribute = exports.GeofileIndexRtree = exports.GeofileIndexHandle = exports.GeofileIndex = exports.GeofileIndexType = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const geofile_1 = require("./geofile");
const gt = __importStar(require("./geotools"));
const binrtree_1 = require("./binrtree");
const binrbush_1 = require("./binrbush");
const proj4_1 = __importDefault(require("proj4"));
const WGS84 = 'EPSG:4326';
var GeofileIndexType;
(function (GeofileIndexType) {
    GeofileIndexType["handle"] = "handle";
    GeofileIndexType["rtree"] = "rtree";
    GeofileIndexType["ordered"] = "ordered";
    GeofileIndexType["fuzzy"] = "fuzzy";
    GeofileIndexType["prefix"] = "prefix";
})(GeofileIndexType = exports.GeofileIndexType || (exports.GeofileIndexType = {}));
class GeofileIndex {
    constructor(geofile, type, attribute, dv) {
        this.attribute = attribute;
        this.type = type;
        this.dv = dv;
        this.geofile = geofile;
    }
    get size() { return this.dv ? this.dv.byteLength : 0; }
    get name() { return `${this.name}/${this.type}`; }
    assertRank(idxrank) {
        if (idxrank >= 0 && idxrank < this.count)
            return;
        throw Error(`GeofileIndexPrefix [${this.geofile.name}/${this.attribute}] :  rank=${idxrank} not in domain [0,${this.count}[`);
    }
    static async build(type, geofile, attribute) {
        switch (type) {
            case GeofileIndexType.handle: return GeofileIndexHandle.compile(geofile);
            case GeofileIndexType.rtree: return GeofileIndexRtree.compile(geofile);
            case GeofileIndexType.ordered: return GeofileIndexOrdered.compile(geofile, attribute);
            case GeofileIndexType.prefix: return GeofileIndexPrefix.compile(geofile, attribute);
            case GeofileIndexType.fuzzy: return GeofileIndexFuzzy.compile(geofile, attribute);
            default: throw Error(`Geofile.create() : unknown index type "${type}"`);
        }
    }
    static create(type, geofile, dv, attribute) {
        switch (type) {
            case GeofileIndexType.handle: return new GeofileIndexHandle(geofile, dv);
            case GeofileIndexType.rtree: return new GeofileIndexRtree(geofile, dv);
            case GeofileIndexType.ordered: return new GeofileIndexOrdered(geofile, dv, attribute);
            case GeofileIndexType.prefix: return new GeofileIndexPrefix(geofile, dv, attribute);
            case GeofileIndexType.fuzzy: return new GeofileIndexFuzzy(geofile, dv, attribute);
            default: throw Error(`Geofile.create() : unknown index type "${type}"`);
        }
    }
}
exports.GeofileIndex = GeofileIndex;
class GeofileIndexHandle extends GeofileIndex {
    constructor(geofile, dv) {
        super(geofile, GeofileIndexType.handle, 'rank', dv);
    }
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexHandle.RECSIZE : 0; }
    static async compile(geofile) {
        const array = [];
        for await (const feature of geofile.parse()) {
            array.push(feature.pos, feature.len);
        }
        console.log(`geojson ${geofile.name} rank/${GeofileIndexType.handle} indexed `);
        return new Uint32Array(array).buffer;
    }
    getRecord(rank) {
        const offset = rank * GeofileIndexHandle.RECSIZE;
        const pos = this.dv.getUint32(offset);
        const len = this.dv.getUint32(offset + 4);
        return { rank, pos, len };
    }
}
exports.GeofileIndexHandle = GeofileIndexHandle;
// index handle record is : { pos:uint32, len:uint32 }
// pos: is offset in datafile to retrieve feature data
// len: is length in bytes of the feature data
GeofileIndexHandle.RECSIZE = 8; // 2 x uint32
class GeofileIndexRtree extends GeofileIndex {
    constructor(geofile, dv) {
        super(geofile, GeofileIndexType.rtree, 'geometry', dv);
        this.rtree = new binrtree_1.BinRtree(dv);
    }
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexHandle.RECSIZE : 0; }
    get extent() { return this.rtree.extent(); }
    static async compile(geofile) {
        const clustersize = 200;
        const clusters = [];
        let cluster = [];
        let bounds = [null, null, null, null, 0, 0];
        for await (const feature of geofile.parse()) {
            if (cluster.length === clustersize && !bounds.some(val => val === null)) {
                clusters.push(bounds);
                cluster = [];
                bounds = [null, null, null, null, feature.rank + 1, 0];
            }
            this.bboxextend(bounds, feature.bbox);
        }
        if (cluster.length > 0 && !bounds.some(val => val === null))
            clusters.push(bounds);
        const tree = new binrbush_1.binrbush();
        tree.load(clusters);
        console.log(`geojson ${geofile.name} geometry/${GeofileIndexType.rtree} indexed `);
        return tree.toBinary();
    }
    getRecord(rank) {
        // not to be used (all is in BinRtree)
        return { rank };
    }
    bbox(bbox, options = new geofile_1.GeofileFilter()) {
        const start = Date.now();
        const projbbox = options.targetProjection ? gt.transform_e(bbox, this.geofile.proj, options.targetProjection) : null;
        // add bbox filter
        options = options.setFilter((feature) => {
            const abbox = (feature.proj === options.targetProjection) ? projbbox : bbox;
            const res = gt.intersects_eg(abbox, feature.geometry);
            return res;
        });
        // scan rtree index.
        const bboxlist = this.rtree.search(bbox).filter(ibbox => gt.intersects_ee(ibbox, bbox));
        const promises = bboxlist.map(ibbox => this.geofile.getFeatures(ibbox[4], ibbox[5], options));
        return Promise.clean(promises).then(f => this.logtimes(start, bboxlist, f));
    }
    point(lon, lat, options = new geofile_1.GeofileFilter()) {
        const tol = options.pointSearchTolerance ? options.pointSearchTolerance : 0.00001;
        // add point / feature intersect filter
        options = options.setFilter((feature) => {
            const point = proj4_1.default(this.geofile.proj, feature.proj).forward([lon, lat]);
            return gt.intersects_cg(point, feature.geometry);
        });
        // return features intersecting point found in small bbox arround point 
        return this.bbox([lon - tol, lat - tol, lon + tol, lat + tol], options);
    }
    nearest(lon, lat, radius, options = new geofile_1.GeofileFilter()) {
        let bbox;
        if (Array.isArray(radius)) {
            bbox = radius;
        }
        else {
            const wgs84pt = proj4_1.default(this.geofile.proj, WGS84).forward([lon, lat]);
            const unitpermeter = 1 / gt.meter_per_unit(this.geofile.proj);
            const wgs84r = radius * unitpermeter;
            bbox = [wgs84pt[0] - wgs84r, wgs84pt[1] - wgs84r, wgs84pt[0] + wgs84r, wgs84pt[1] + wgs84r];
            options = options.setFilter((feature) => {
                const closest = gt.closest_cg([lon, lat], feature.geometry);
                const closest_wgs84 = proj4_1.default(feature.proj, WGS84).forward(closest);
                feature.distance = gt.distance_hs(wgs84pt, closest_wgs84);
                return (feature.distance <= wgs84r);
            });
        }
        // return nearest from features found in bbox
        return this.bbox(bbox, options)
            .then((features) => features.reduce((prev, cur) => !cur ? prev : !prev ? cur : (prev.distance < cur.distance) ? prev : cur));
    }
    static bboxextend(bounds, bbox) {
        if (bounds[0] == null || bbox[0] < bounds[0]) {
            bounds[0] = bbox[0];
        }
        if (bounds[1] == null || bbox[1] < bounds[1]) {
            bounds[1] = bbox[1];
        }
        if (bounds[2] == null || bbox[2] > bounds[2]) {
            bounds[2] = bbox[2];
        }
        if (bounds[3] == null || bbox[3] > bounds[3]) {
            bounds[3] = bbox[3];
        }
        bounds[5]++;
    }
    logtimes(start, bboxlist, features) {
        const selectivity = Math.round(100 * bboxlist.reduce((p, c) => p + c[5], 0) / this.geofile.count);
        const elapsed = (Date.now() - start);
        const best = Math.round(100 * features.length / this.geofile.count);
        const objsec = Math.round(features.length / (elapsed / 1000));
        console.log(`Geofile.search [${this.geofile.name}]: ${features.length} o / ${elapsed} ms /  ${objsec} obj/s sel: ${selectivity}% (vs ${best}%)`);
        return features;
    }
}
exports.GeofileIndexRtree = GeofileIndexRtree;
// index rtree record is : { height:uint8, xmin:float32, ymin:float32, xmax:float32, ymax:float32, rank|child:uint32, count/next:uint32 }
// height: is heigth in rtree (0 is root) 
// xmin,ymin,xmax,ymax: is is the cluster bbox
// rank : is the rank of the first feature in geofile
// count : is the number of feature in the cluster starting from 'rank' 
// child : is the offset of the first child node
// next : is the offset of next brother node  
GeofileIndexRtree.RECSIZE = 25; // uint8 + 4 x float32 + 2 x uint32
class GeofileIndexAttribute extends GeofileIndex {
    next(idxrank, searched, compare, options, found = []) {
        if (idxrank >= this.count)
            return Promise.resolve(found);
        const record = this.getRecord(idxrank);
        return this.geofile.getFeature(record.rank)
            .then(feature => {
            const res = searched.some((search) => compare(search, feature) === 0);
            if (res) {
                if (feature) {
                    found.push(feature);
                }
                return this.next(idxrank + 1, searched, compare, options, found);
            }
            return found;
        });
    }
    // binary search with feature collection
    binarySearch(searched, compare, options, imin = 0, imax = (this.count - 1)) {
        if (imax < imin)
            return Promise.resolve([]);
        // calculate midpoint to cut set in 2 parts
        const imid = Math.floor((imax + imin) / 2);
        const record = this.getRecord(imid);
        return this.geofile.getFeature(record.rank).then(feature => {
            const promises = [];
            if (imin === imax) { // end search reached
                promises.push(this.next(imin, searched, compare, options));
            }
            else {
                // constructing lower and upper subset (lsubset / usubset)
                const lsubset = [], usubset = [];
                // distribution on subsets
                searched.forEach((key, i) => (compare(key, feature) > 0) ? usubset.push(searched[i]) : lsubset.push(searched[i]));
                // preparing search promises for lower and upper subset
                if (usubset.length) {
                    promises.push(this.binarySearch(usubset, compare, options, imid + 1, imax));
                }
                if (lsubset.length) {
                    promises.push(this.binarySearch(lsubset, compare, options, imin, imid));
                }
            }
            // running promises
            return Promise.clean(promises);
        });
    }
}
exports.GeofileIndexAttribute = GeofileIndexAttribute;
class GeofileIndexOrdered extends GeofileIndexAttribute {
    constructor(geofile, dv, attribute) {
        super(geofile, GeofileIndexType.ordered, attribute, dv);
    }
    // index ordered record is : { rank:uint32 }
    // rank: is the rank of the feaure indexed
    get recsize() { return 4; } // 1 x uint32
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexHandle.RECSIZE : 0; }
    static async compile(geofile, attribute) {
        const attlist = [];
        for await (const feature of geofile.parse()) {
            const value = feature.properties[attribute];
            attlist.push({ value, rank: feature.rank });
        }
        attlist.sort(function (a, b) { return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : 0; });
        const array = new Uint32Array(attlist.length);
        console.log(`geojson ${geofile.name} ${attribute}/${GeofileIndexType.ordered} indexed `);
        return array;
    }
    getRecord(idxrank) {
        this.assertRank(idxrank);
        const offset = idxrank * 4;
        const rank = this.dv.getUint32(offset);
        return { rank };
    }
    search(searched, options) {
        const filter = (feature) => {
            const value = feature.properties[this.attribute];
            return feature && searched.some(v => v === value);
        };
        const compare = (key, feature) => {
            const value = feature.properties[this.attribute];
            return (feature && key === value) ? 0 : (key > value) ? 1 : -1;
        };
        options = options.setFilter(filter);
        return this.binarySearch(searched, compare, options);
    }
}
exports.GeofileIndexOrdered = GeofileIndexOrdered;
GeofileIndexOrdered.RECSIZE = 4; // 1 x uint32
class GeofileIndexFuzzy extends GeofileIndexAttribute {
    constructor(geofile, dv, attribute) {
        super(geofile, GeofileIndexType.fuzzy, attribute, dv);
    }
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexHandle.RECSIZE : 0; }
    static async compile(geofile, attribute) {
        const attlist = [];
        for await (const feature of geofile.parse()) {
            const value = feature.properties[attribute].toString();
            const hash = value ? value.fuzzyhash() : 0;
            attlist.push({ hash, rank: feature.rank });
        }
        attlist.sort(function (a, b) { return (a.hash < b.hash) ? -1 : (a.hash > b.hash) ? 1 : 0; });
        const array = new Uint32Array(2 * attlist.length);
        const dv = new DataView(array);
        attlist.forEach((att, i) => {
            const offset = i * GeofileIndexFuzzy.RECSIZE;
            dv.setUint32(offset, att.hash);
            dv.setUint32(offset + 4, att.rank);
        });
        console.log(`geojson ${geofile.name} ${attribute}/${GeofileIndexType.fuzzy} indexed `);
        return array;
    }
    getRecord(idxrank) {
        this.assertRank(idxrank);
        const offset = idxrank * GeofileIndexFuzzy.RECSIZE;
        const hash = this.dv.getUint32(offset);
        const rank = this.dv.getUint32(offset + 4);
        return { rank, hash };
    }
    search(searched, options = new geofile_1.GeofileFilter()) {
        const maxdist = options.maxTextDistance | 5;
        const clean = searched.clean();
        const hash = searched.fuzzyhash();
        const values = [hash, ...String.fuzzyExtend(hash)];
        options = options.setFilter((f) => clean.levenshtein(f.properties[this.attribute].toString().clean()) < maxdist);
        const compare = (key, feature) => key - feature.properties[this.attribute].fuzzyhash();
        return this.binarySearch(values, compare, options)
            .then((features) => {
            if (!features || !features.length)
                return [];
            const res = features.map(feature => {
                const distance = clean.levenshtein(feature.properties[this.attribute].toString().clean());
                return { distance, feature };
            });
            res.sort((p1, p2) => p1.distance - p2.distance);
            res.map(item => {
                item.feature.distance = item.distance;
                return item.feature;
            });
        });
    }
}
exports.GeofileIndexFuzzy = GeofileIndexFuzzy;
// this.dv dataview is an ordered array of records { hash:uint32, rank:uint32 }
// hash: is the fuzzy hash of the attribute  
// rank: rank of a feature associated to the fuzzy hash
GeofileIndexFuzzy.RECSIZE = 8; // 2 x uint32
class GeofileIndexPrefix extends GeofileIndexAttribute {
    constructor(geofile, dv, attribute) {
        super(geofile, GeofileIndexType.prefix, attribute, dv);
    }
    get count() { return this.dv ? this.dv.byteLength / GeofileIndexHandle.RECSIZE : 0; }
    static async compile(geofile, attribute) {
        const preflist = [];
        for await (const feature of geofile.parse()) {
            const value = feature.properties[attribute];
            const wlist = value ? `${value}`.wordlist() : [];
            wlist.forEach((w) => preflist.push({ value: w.substring(0, 4), rank: feature.rank }));
        }
        preflist.sort(function (a, b) { return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : (a.rank - b.rank); });
        const array = new Uint32Array(2 * preflist.length);
        const dv = new DataView(array);
        preflist.forEach((att, index) => {
            const offset = index * GeofileIndexPrefix.RECSIZE;
            [32, 32, 32, 32].forEach((c, i) => dv.setUint8(offset + i, c)); // white padding
            att.value.split('').forEach((c, i) => dv.setUint8(offset + i, c.charCodeAt(0)));
            dv.setUint32(offset + 4, att.rank);
        });
        console.log(`geojson ${geofile.name} ${attribute}/${GeofileIndexType.prefix} indexed `);
        return array;
    }
    getRecord(idxrank) {
        this.assertRank(idxrank);
        const offset = idxrank * GeofileIndexPrefix.RECSIZE;
        const prefix = String.fromCharCode(...([0, 1, 2, 3].map((c) => this.dv.getUint8(offset + c))));
        const rank = this.dv.getUint32(offset + 4);
        return { rank, prefix };
    }
    search(searched, options) {
        const prefixes = searched.prefix();
        const found = this.bsearch(prefixes);
        const maxfeature = options && options.maxFeature ? options.maxFeature : 100;
        const ranks = Array.from(found.values()).slice(0, Math.min(maxfeature, found.size));
        return Promise.all(ranks.map(rank => this.geofile.getFeature(rank, options)));
    }
    // prefix found from firstrank searching intersection with previously found ranks 
    intersect(firstrank, prefix, previous = new Set()) {
        const intersection = new Set();
        for (let idxrank = firstrank; idxrank < this.count; idxrank++) {
            const record = this.getRecord(idxrank);
            if (record.prefix !== prefix)
                break;
            if (previous.has(record.rank)) {
                intersection.add(record.rank);
            }
        }
        previous = intersection;
        return previous;
    }
    // Search with a dichotomic algorithm all ranks associated with an array of prefix
    bsearch(prefixes, found = null, imin = 0, imax = this.count) {
        // is dichotomy terminated
        if (imax < imin) {
            return new Set();
        }
        // calculate midpoint to divide set
        const imid = Math.floor((imax + imin) / 2);
        const record = this.getRecord(imid);
        if (imin === imax) {
            return this.intersect(imin, record.prefix, found);
        }
        // divide in two subset
        const usubset = [];
        const lsubset = [];
        prefixes.forEach(p => (p.substring(0, 4) > record.prefix) ? usubset.push(p) : lsubset.push(p));
        // search in each subset
        if (usubset.length) {
            found = this.bsearch(usubset, found, imid + 1, imax);
        }
        if (lsubset.length) {
            found = this.bsearch(lsubset, found, imin, imid);
        }
        return found;
    }
}
exports.GeofileIndexPrefix = GeofileIndexPrefix;
// this.dv dataview is an ordered array of records { prefix:char[4], rank:uint32 }
// prefix: 4 chars prefix 
// rank: rank of a feature associated with this prefix
GeofileIndexPrefix.RECSIZE = 8; // 2 x uint32
//# sourceMappingURL=geoindex.js.map