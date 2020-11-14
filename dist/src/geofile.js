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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Geofile = exports.setFilter = exports.GeofileParser = exports.GeofileFeature = exports.GeofileFiletype = void 0;
const gt = __importStar(require("./geotools"));
const geoindex_1 = require("./geoindex");
const geoindex_2 = require("./geoindex");
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
class GeofileFeature {
    constructor() {
        this.properties = {};
    }
}
exports.GeofileFeature = GeofileFeature;
class GeofileParser {
}
exports.GeofileParser = GeofileParser;
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
const getoffsets = (offset, offsets) => {
    return Object.keys(offsets).reduce((res, key) => { res[key] = offset + offsets[key]; return res; }, {});
};
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
    getIndex(attribute, type) {
        return this.indexes.get(`${attribute}/${type}`);
    }
    assert(value, msg) {
        if (value)
            return;
        throw Error(`geofile [${this.name}] :${msg}`);
    }
    open() {
        return this.loadIndexes()
            .then(() => this.load())
            .then(() => this.assertTerminated());
    }
    close() {
        return this.release().then(() => {
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
        feature.bbox = gt.bbox_g(feature.geometry);
        return feature;
    }
    async getFeature(rank, options = {}) {
        this.assertLoaded();
        this.assertRank(rank);
        const feature = await this.readFeature(rank);
        return this.apply(this.initFeature(feature, rank), options);
    }
    async getFeatures(rank, limit = 100, options = {}) {
        this.assertLoaded();
        limit = (limit <= 0) ? 1 : Math.min(limit, this.count - rank);
        const features = await this.readFeatures(rank, limit);
        return features
            .map((feature, i) => this.apply(this.initFeature(feature, rank + i), options))
            .filter(f => f);
    }
    /** internal method to load all data indexes */
    loadIndexes() {
        if (!this.indexFile)
            return Promise.resolve();
        return new Promise((resolve, reject) => {
            const f = this.indexFile;
            const r = new FileReader();
            r.onerror = () => reject(`unable to load indexes due to ${r.error.message}`);
            r.onload = () => resolve(this.parseIndexes(r.result));
            r.readAsArrayBuffer(f);
        });
    }
    parseIndexes(buffer) {
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
            const index = geoindex_1.GeofileIndex.create(type, this, indexdv, attribute);
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
    }
    async buildIndexes(idxlist) {
        // build all mandatory indexes and defined indexes
        idxlist = [{ attribute: 'rank', type: geoindex_1.GeofileIndexType.handle }, { attribute: 'geometry', type: geoindex_1.GeofileIndexType.rtree }, ...idxlist];
        let idxbufs = [];
        for (const def of idxlist) {
            const index = await geoindex_1.GeofileIndex.build(def.type, this, def.attribute);
            idxbufs.push(index);
        }
        // build index header
        const count = idxbufs[0].byteLength / geoindex_2.GeofileIndexHandle.RECSIZE;
        const hdbuf = new ArrayBuffer(HEADER_RSIZE);
        const hddv = new DataView(hdbuf);
        const offset = 0;
        const offsets = getoffsets(offset, HEADER_OFFSETS);
        hddv.setAscii(offsets.tag, HEADER_TAG);
        hddv.setUint32(offsets.count, count, true);
        hddv.setUint32(offsets.idxcount, idxlist.length, true);
        // index metadata record is {attribute:char[50], type:char[10], offset:uint32, length: uint32}
        // attribute: name of the indexed attribute ('rank' for handle and 'geometry' for geometry)
        // type: index type (handle,rtree,ordered,fuzzy,prefix)
        // buffer: offset of the index data in index file
        // length: length of the index data in the index file
        // build index metdatas
        const mdbuf = new ArrayBuffer(METADAS_RSIZE * idxlist.length);
        const mddv = new DataView(mdbuf);
        let osfidxdata = hdbuf.byteLength + mdbuf.byteLength;
        idxlist.reduce((offset, index, i) => {
            const offsets = getoffsets(offset, METADATAS_OFFSETS);
            mddv.setAscii(offsets.attribute, index.attribute);
            mddv.setAscii(offsets.type, index.type);
            mddv.setUint32(offsets.offset, osfidxdata, true);
            mddv.setUint32(offsets.length, idxbufs[i].byteLength, true);
            osfidxdata += idxbufs[i].byteLength;
            return offset + METADAS_RSIZE;
        }, 0);
        idxbufs = [hdbuf, mdbuf, ...idxbufs];
        const total = idxbufs.reduce((p, c) => p + c.byteLength, 0);
        const array = new Uint8Array(total);
        idxbufs.reduce((offset, buffer) => {
            array.set(new Uint8Array(buffer), offset);
            return offset + buffer.byteLength;
        }, 0);
        this.parseIndexes(array.buffer);
        this.assertTerminated();
        return;
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
        const collected = [];
        const parser = this.parser;
        const bunch = 1024 * 64;
        const onhandle = (handle, line, col) => {
            return this.readFeature(handle)
                .then(f => {
                f.bbox = gt.bbox_g(f.geometry);
                f.rank = handle.rank;
                f.pos = handle.pos;
                f.len = handle.len;
                collected.push(f);
            })
                .catch(e => { console.log(`Error while reading feature ${e} line:${line}/col:${col}`); });
        };
        const file = parser.init(onhandle);
        const iter = async function* () {
            let offset = 0;
            while (offset < file.size) {
                while (collected.length > 0)
                    yield collected.shift();
                await new Promise((resolve, reject) => {
                    const slice = file.slice(offset, offset + bunch);
                    const r = new FileReader();
                    r.onerror = () => reject(`Geojson.readFeature(): unable to read feature due to ${r.error.message}`);
                    r.onload = () => {
                        const array = new Uint8Array(r.result);
                        let err = null;
                        for (let i = 0; i < array.byteLength && !err; i++) {
                            const byte = array[i];
                            // console.log(`parsing char[${i}] => "${String.fromCharCode(byte)}"/${byte} `)
                            err = parser.process(byte);
                            if (err)
                                break;
                        }
                        return err ? reject(`Geofile.parse(): ${err.msg} at ${err.line}:${err.col}`) : resolve();
                    };
                    r.readAsArrayBuffer(slice);
                });
                offset += bunch;
            }
            await parser.ended();
            while (collected.length > 0)
                yield collected.shift();
            return;
        };
        return iter();
    }
    async forEach(options, rank = 0) {
        this.assertLoaded();
        const bunch = 1000;
        await this.getFeatures(rank, bunch, options);
        rank += bunch;
        return (rank < this.count) ? this.forEach(options, rank) : Promise.resolve();
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
//# sourceMappingURL=geofile.js.map