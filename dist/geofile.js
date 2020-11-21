/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
'use strict';
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Geofile = exports.setFilter = exports.GeofileFiletype = void 0;
const gt = __importStar(require("./geotools"));
const geoindex_1 = require("./geoindex");
var GeofileFiletype;
(function (GeofileFiletype) {
    GeofileFiletype[GeofileFiletype["CSV"] = 0] = "CSV";
    GeofileFiletype[GeofileFiletype["GEOJSON"] = 1] = "GEOJSON";
    GeofileFiletype[GeofileFiletype["SHP"] = 2] = "SHP";
    GeofileFiletype[GeofileFiletype["DBF"] = 3] = "DBF";
    GeofileFiletype[GeofileFiletype["PRJ"] = 4] = "PRJ";
    GeofileFiletype[GeofileFiletype["GML2"] = 5] = "GML2";
    GeofileFiletype[GeofileFiletype["GML3"] = 6] = "GML3";
    GeofileFiletype[GeofileFiletype["KML"] = 7] = "KML";
})(GeofileFiletype = exports.GeofileFiletype || (exports.GeofileFiletype = {}));
// -- header  is {tag:char[8], count:uint32, index:uint32}
// tag: is file signature must be equal HEADER_TAG,
// count: is feature count,
// index: is index count
const UINT32_LEN = 4;
const HEADER_RSIZE = 16;
const HEADER_TAG = 'GEOFILEX';
const TAG_LEN = HEADER_TAG.length;
const HEADER_OFFSETS = { tag: 0, count: TAG_LEN, idxcount: TAG_LEN + UINT32_LEN };
// -- index metadata record is { attribute:char[ATTRIBUTE_LEN], type:char[INDEXTYPE_LEN], offset:uint32, length:uint32 }
// attribute: attribute name (blank right padded)
// type: index type (see GeofileIndexType),
// offset: index data start offset in index file
// length: index data length in bytes
const METADAS_RSIZE = 68;
const ATTRIBUTE_LEN = 50;
const INDEXTYPE_LEN = 10;
const METADATAS_OFFSETS = { attribute: 0, type: ATTRIBUTE_LEN, offset: ATTRIBUTE_LEN + INDEXTYPE_LEN, length: ATTRIBUTE_LEN + INDEXTYPE_LEN + UINT32_LEN };
function getoffsets(offset, offsets) {
    return Object.keys(offsets).reduce((res, key) => { res[key] = offset + offsets[key]; return res; }, {});
}
exports.setFilter = (gf, filter) => {
    const options = gf.applyTo({});
    options._internalFilter = options._internalFilter || [];
    options._internalFilter.push(filter);
    return options;
};
/**
 * File System spatial data class
 */
class Geofile {
    constructor(name, indexFile) {
        this.proj = 'EPSG:4326';
        this.indexFile = indexFile;
        this.name = name;
        this.proj = 'EPSG:4326';
        this._loaded = false;
        Geofile.GEOFILE_MAP.set(this.name, this);
    }
    static get all() { return Geofile.GEOFILE_MAP.values(); }
    static get(name) { return Geofile.GEOFILE_MAP.get(name); }
    static clear() { Geofile.GEOFILE_MAP.clear(); }
    static delete(name) { Geofile.GEOFILE_MAP.delete(name); }
    get count() { return this.handles ? this.handles.count : 0; }
    get loaded() { return this._loaded; }
    get extent() { return this.geoidx ? this.geoidx.extent : null; }
    getIndex(attribute, type) {
        return this.indexes.get(`${attribute}/${type}`);
    }
    assert(value, msg) {
        if (value)
            return;
        throw Error(`geofile [${this.name}] :${msg}`);
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.open();
            yield this.loadIndexes();
            this.assertTerminated();
        });
    }
    unload() {
        return this.close().then(() => {
            this._loaded = false;
            this.indexFile = null;
            this.handles = null;
            this.geoidx = null;
            this.indexes = null;
        });
    }
    getHandle(rank) {
        this.assertRank(rank);
        return this.handles.getRecord(rank);
    }
    initFeature(feature, rank) {
        feature.rank = rank;
        feature.geofile = this;
        feature.proj = this.proj;
        feature.bbox = (feature.geometry) ? gt.bbox_g(feature.geometry) : null;
        return feature;
    }
    getFeature(rank, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.assertLoaded();
            this.assertRank(rank);
            const feature = yield this.readFeature(rank);
            return this.apply(this.initFeature(feature, rank), options);
        });
    }
    getFeatures(rank, limit = 100, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.assertLoaded();
            limit = (limit <= 0) ? 1 : Math.min(limit, this.count - rank);
            const features = yield this.readFeatures(rank, limit);
            return features
                .map((feature, i) => this.apply(this.initFeature(feature, rank + i), options))
                .filter(f => f);
        });
    }
    loadIndexes() {
        return __awaiter(this, void 0, void 0, function* () {
            const buffer = yield this.indexFile.read();
            const indexes = [];
            // read feature count and index count (length = HEADER_TSIZE)
            let dv = new DataView(buffer, 0, HEADER_RSIZE);
            const offsets = getoffsets(0, HEADER_OFFSETS);
            this.assertIndexTag(buffer.slice(offsets.tag, TAG_LEN));
            const count = dv.getUint32(offsets.count, true);
            const idxcount = dv.getUint32(offsets.idxcount, true);
            dv = new DataView(buffer, HEADER_RSIZE, idxcount * METADAS_RSIZE);
            for (let i = 0, pos = 0; i < idxcount; i++) {
                const offsets = getoffsets(pos, METADATAS_OFFSETS);
                const attribute = dv.getUtf8(offsets.attribute, ATTRIBUTE_LEN);
                const type = geoindex_1.GeofileIndexType[dv.getUtf8(offsets.type, INDEXTYPE_LEN)];
                const offset = dv.getUint32(offsets.offset, true);
                const length = dv.getUint32(offsets.length, true);
                const indexdv = new DataView(buffer, offset, length);
                const index = geoindex_1.GeofileIndex.create(type, attribute, this, indexdv);
                indexes.push(index);
                pos += METADAS_RSIZE;
            }
            this.indexes = new Map();
            for (const index of indexes) {
                this.indexes.set(index.name, index);
                if (index.type === geoindex_1.GeofileIndexType.handle)
                    this.handles = index;
                if (index.type === geoindex_1.GeofileIndexType.rtree)
                    this.geoidx = index;
            }
            if (!this.handles || count !== this.handles.count) {
                throw new Error(`Geofile.parseIndexes(): missing mandatory handle index in index file`);
            }
        });
    }
    buildIndexes(idxlist) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            // build all mandatory indexes and defined indexes
            idxlist = [{ attribute: 'rank', type: geoindex_1.GeofileIndexType.handle }, { attribute: 'geometry', type: geoindex_1.GeofileIndexType.rtree }, ...idxlist];
            this.indexes = new Map();
            idxlist.forEach(def => {
                const index = geoindex_1.GeofileIndex.create(def.type, def.attribute, this);
                if (index.type === geoindex_1.GeofileIndexType.handle)
                    this.handles = index;
                if (index.type === geoindex_1.GeofileIndexType.rtree)
                    this.geoidx = index;
                this.indexes.set(index.name, index);
            });
            // parse all the features
            for (const index of this.indexes.values())
                index.begin();
            try {
                for (var _b = __asyncValues(this.parse()), _c; _c = yield _b.next(), !_c.done;) {
                    const feature = _c.value;
                    this.indexes.forEach(index => index.index(feature));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            for (const index of this.indexes.values())
                index.end();
            this._loaded = true;
            this.assertTerminated();
            return;
        });
    }
    getIndexBuffer() {
        // build index header
        const hdbuf = new ArrayBuffer(HEADER_RSIZE);
        const hddv = new DataView(hdbuf);
        const offsets = getoffsets(0, HEADER_OFFSETS);
        hddv.setAscii(offsets.tag, HEADER_TAG);
        hddv.setUint32(offsets.count, this.count, true);
        hddv.setUint32(offsets.idxcount, this.indexes.size, true);
        // index metadata record is {attribute:char[50], type:char[10], offset:uint32, length: uint32}
        // attribute: name of the indexed attribute ('rank' for handle and 'geometry' for geometry)
        // type: index type (handle,rtree,ordered,fuzzy,prefix)
        // buffer: offset of the index data in index file
        // length: length of the index data in the index file
        // build index metdatas
        const mdbuf = new ArrayBuffer(METADAS_RSIZE * this.indexes.size);
        const mddv = new DataView(mdbuf);
        let osfidxdata = hdbuf.byteLength + mdbuf.byteLength;
        let offset = 0;
        this.indexes.forEach((index) => {
            const offsets = getoffsets(offset, METADATAS_OFFSETS);
            mddv.setAscii(offsets.attribute, index.attribute);
            mddv.setAscii(offsets.type, index.type);
            mddv.setUint32(offsets.offset, osfidxdata, true);
            mddv.setUint32(offsets.length, index.array.byteLength, true);
            osfidxdata += index.array.byteLength;
            offset += METADAS_RSIZE;
        }, 0);
        const idxbufs = [...this.indexes.values()].map(idx => idx.array);
        const blob = new Blob([hdbuf, mdbuf, ...idxbufs]);
        return blob;
    }
    apply(feature, options) {
        if (!feature)
            return null;
        if (options._internalFilter && options._internalFilter.some(filter => !filter(feature))) {
            return null;
        }
        if (options.targetProjection && options.targetProjection !== feature.proj) {
            gt.transform_g(feature.geometry, feature.proj, options.targetProjection);
            feature.proj = options.targetProjection;
        }
        if (options.featureFilter && !options.featureFilter(feature)) {
            return null;
        }
        if (options.featureAction) {
            options.featureAction(feature);
        }
        return feature;
    }
    parse() {
        const bunch = 1024 * 64;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const geofile = this;
        const iter = function () {
            return __asyncGenerator(this, arguments, function* () {
                let offset = 0;
                let err = null;
                yield __await(geofile.open());
                const parser = geofile.parser;
                const file = yield __await(parser.begin());
                while (offset < file.size && !err) {
                    while (parser.collected.length > 0)
                        yield yield __await(parser.collected.shift());
                    const buffer = yield __await(file.read(offset, bunch));
                    const array = new Uint8Array(buffer);
                    for (let i = 0; i < array.byteLength && !err; i++) {
                        const byte = array[i];
                        err = parser.consume(byte);
                        if (err)
                            throw Error(`Geofile.parse(): ${err.msg} at ${err.line}:${err.col} offset=${parser.pos}`);
                    }
                    offset += bunch;
                }
                yield __await(parser.end());
                while (parser.collected.length > 0)
                    yield yield __await(parser.collected.shift());
                return yield __await(void 0);
            });
        };
        return iter();
    }
    forEach(options, rank = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            this.assertLoaded();
            const bunch = 1000;
            yield this.getFeatures(rank, bunch, options);
            rank += bunch;
            return (rank < this.count) ? this.forEach(options, rank) : Promise.resolve();
        });
    }
    bbox(bbox, options) {
        this.assertLoaded();
        return this.geoidx.bbox(bbox, options);
    }
    point(lon, lat, options) {
        this.assertLoaded();
        return this.geoidx.point(lon, lat, options);
    }
    nearest(lon, lat, radius, options) {
        this.assertLoaded();
        return this.geoidx.nearest(lon, lat, radius, options);
    }
    search(attr, values, options) {
        this.assertIndex(attr, geoindex_1.GeofileIndexType.ordered);
        const index = this.getIndex(attr, geoindex_1.GeofileIndexType.ordered);
        return index.search(values, options);
    }
    fuzzy(attr, prefixes, options) {
        this.assertIndex(attr, geoindex_1.GeofileIndexType.fuzzy);
        const index = this.getIndex(attr, geoindex_1.GeofileIndexType.fuzzy);
        return index.search(prefixes, options);
    }
    prefix(attr, prefixes, options) {
        this.assertIndex(attr, geoindex_1.GeofileIndexType.prefix);
        const index = this.getIndex(attr, geoindex_1.GeofileIndexType.prefix);
        return index.search(prefixes, options);
    }
    getScale(resolution, projection) {
        // const units = projection.getUnits();
        const dpi = 25.4 / 0.28;
        const mpu = gt.meter_per_unit(projection); // MBZ TODO A REVOIR CALCUL D'ECHELLE
        const scale = resolution * mpu * 39.37 * dpi;
        return scale;
    }
    getResolution(scale, projection) {
        // const units = projection.getUnits();
        const dpi = 25.4 / 0.28;
        const mpu = gt.meter_per_unit(projection);
        const resolution = scale / (mpu * 39.37 * dpi);
        return resolution;
    }
    addIndexTiles(map, ol) {
        const tiles = [];
        const srcproj = this.proj;
        this.geoidx.rtree._all(0, tiles);
        const features = tiles.map(function (tile) {
            const geometry = new ol.geom.Polygon([[
                    [tile[0], tile[1]],
                    [tile[2], tile[1]],
                    [tile[2], tile[3]],
                    [tile[0], tile[3]],
                    [tile[0], tile[1]]
                ]]);
            geometry.transform(srcproj, map.getView().getProjection());
            const feature = new ol.Feature({ num: tile[4] / 100, geometry });
            return feature;
        });
        const vectorSource = new ol.source.Vector({});
        const vlayer = new ol.layer.Vector({
            source: vectorSource,
            style: [new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'red',
                        width: 2
                    })
                })]
        });
        vectorSource.addFeatures(features);
        map.addLayer(vlayer);
        const tilelayer = new ol.layer.Tile({
            source: new ol.source.TileDebug({
                projection: 'EPSG:3857',
                tileGrid: ol.tilegrid.createXYZ({ maxZoom: 22 })
            })
        });
        map.addLayer(tilelayer);
    }
    /**
     * add this geofile to an openlayer Map as an ol.layer.Vector
     * @param map an openlayers 3+ Map
     * @param ol an openlayers 3+ global object
     */
    addToMap(map, ol, minscale, maxscale, style) {
        let last_extent = ol.extent.createEmpty();
        const format = new ol.format.GeoJSON();
        /** default style definition */
        const fill = new ol.style.Fill({
            color: 'rgba(255,255,255,0.4)'
        });
        const stroke = new ol.style.Stroke({
            color: '#3399CC',
            width: 1.25
        });
        const DEFAULT_STYLE = [
            new ol.style.Style({
                image: new ol.style.Circle({
                    fill: fill,
                    stroke: stroke,
                    radius: 5
                }),
                fill: fill,
                stroke: stroke
            })
        ];
        // we define a loader for vector source
        const loader = (extent, resolution, proj) => {
            if (ol.extent.equals(extent, last_extent)) {
                return;
            }
            last_extent = extent;
            const scale = this.getScale(resolution, proj);
            extent = (proj === this.proj) ? extent : ol.proj.transformExtent(extent, proj, this.proj);
            if ((!maxscale || scale < maxscale) && (!minscale || scale >= minscale)) {
                this.bbox(extent, { targetProjection: proj })
                    .then((features) => {
                    vsource.clear();
                    vsource.addFeatures(features.map(f => format.readFeature(f)));
                });
            }
            else {
                vsource.clear();
            }
        };
        const vsource = new ol.source.Vector({ useSpatialIndex: false, strategy: ol.loadingstrategy.bbox, loader });
        // layer created an added to map
        const vlayer = new ol.layer.Vector({
            renderMode: 'image',
            visible: true,
            source: vsource,
            style: style ? style : DEFAULT_STYLE,
            minResolution: this.getResolution(minscale, map.getView().getProjection()),
            maxResolution: this.getResolution(maxscale, map.getView().getProjection())
        });
        map.addLayer(vlayer);
    }
    assertLoaded(dummy = true) {
        if (this.loaded)
            return;
        throw Error(`geofile [${this.name}] : not loaded or load failed`);
    }
    assertRank(rank) {
        if (rank >= 0 && rank < this.count)
            return;
        throw Error(`geofile [${this.name}] : rank=${rank} not in domain [0,${this.count}[`);
    }
    assertIndex(attribute, type) {
        const index = this.getIndex(attribute, type);
        if (index)
            return;
        throw Error(`geofile [${this.name}] :  unable to search no index found for ${attribute}/${type}`);
    }
    assertTerminated(dummy = true) {
        this._loaded = (this.count > 0 && !!this.handles);
        if (this.loaded)
            return;
        throw Error(`Geofile.load() [${this.name}] : load fail `);
    }
    assertIndexTag(tag) {
        const tarray = HEADER_TAG.split('').map(char => char.charCodeAt(0));
        const rarray = [...new Uint8Array(tag)];
        if (tarray.every((code, i) => code === rarray[i]))
            return;
        throw Error(`geofile [${this.name}] : provided file is not an indexfile (incorrect signature)`);
    }
}
exports.Geofile = Geofile;
Geofile.GEOFILE_MAP = new Map();
__exportStar(require("./geofileparser"), exports);
__exportStar(require("./geoindex"), exports);
//# sourceMappingURL=geofile.js.map