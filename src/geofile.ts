/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
'use strict';
import * as gt from './geotools';
import { GeofileIndexType, GeofileIndexDef, GeofileIndex } from './geoindex'
import { GeofileIndexHandle, GeofileIndexRtree, GeofileIndexOrdered, GeofileIndexPrefix, GeofileIndexFuzzy } from './geoindex'

// a handle is a location of a feature in the data file 
export interface GeofileHandle {
    rank: number;
    pos: number;
    len: number;
}

export enum GeofileFiletype {
    CSV,
    GEOJSON,
    SHP,
    DBF,
    PRJ,
    GML2,
    GML3,
    KML
}

export class GeofileFeature {
    geometry?: gt.Geometry;
    properties?: { [key: string]: unknown } = {};
    proj?: string;
    bbox?: number[];
    geofile?: Geofile;
    rank: number;
    pos: number;
    len: number;
    distance?: number;
}

export abstract class GeofileParser {
    abstract init(onhandle: (handle: GeofileHandle) => Promise<void>): File | Blob
    abstract process(byte: number)
    abstract async ended()
}

// -- header  is {tag:char[8], count:uint32, index:uint32}
// tag: is file signature must be equal HEADER_TAG,
// count: is feature count,
// index: is index count
const UINT32_LEN = 4
const HEADER_RSIZE = 16
const HEADER_TAG = 'GEOFILEX';
const TAG_LEN = HEADER_TAG.length
const HEADER_OFFSETS: {[key:string]: number} = { tag: 0, count: TAG_LEN, idxcount: TAG_LEN + UINT32_LEN }

// -- index metadata record is { attribute:char[ATTRIBUTE_LEN], type:char[INDEXTYPE_LEN], offset:uint32, length:uint32 }
// attribute: attribute name (blank right padded)
// type: index type (see GeofileIndexType),
// offset: index data start offset in index file
// length: index data length in bytes
const METADAS_RSIZE = 68;
const ATTRIBUTE_LEN = 50
const INDEXTYPE_LEN = 10
const METADATAS_OFFSETS: {[key:string]: number} = { attribute: 0, type: ATTRIBUTE_LEN, offset: ATTRIBUTE_LEN + INDEXTYPE_LEN, length: ATTRIBUTE_LEN + INDEXTYPE_LEN + UINT32_LEN }

const getoffsets =  (offset:number,offsets: {[key:string]: number}) : {[key:string]: number} => {
    return Object.keys(offsets).reduce( (res,key) => { res[key] = offset + offsets[key]; return res }, {})
}


/**
 * filter / action option struct
 */
export interface GeofileFilter {
    targetProjection?: string;
    featureFilter?: (feature: GeofileFeature) => boolean;
    featureAction?: (feature: GeofileFeature) => void;
    pointSearchTolerance?: number;
    maxTextDistance?: number;
    maxFeature?: number;
    _internalFilter?: ((feature: GeofileFeature) => boolean)[];
}
export const setFilter = (gf: GeofileFilter, filter: (feature: GeofileFeature) => boolean): GeofileFilter => {
    const options: GeofileFilter = gf.applyTo({}) as any;
    options._internalFilter = options._internalFilter ||  [] 
    options._internalFilter.push(filter);
    return options;
}

/**
 * File System spatial data class
 */
export abstract class Geofile {

    private static readonly GEOFILE_MAP = new Map<string, Geofile>();
    static get all() { return Geofile.GEOFILE_MAP.values() }
    static get(name: string) { return Geofile.GEOFILE_MAP.get(name) }
    static clear() { Geofile.GEOFILE_MAP.clear() }
    static delete(name: string) { Geofile.GEOFILE_MAP.delete(name) }

    readonly name: string
    readonly proj: string = 'EPSG:4326'
    private _loaded: boolean
    private indexFile: File | Blob
    private handles: GeofileIndexHandle
    private geoidx: GeofileIndexRtree
    private indexes: Map<string, GeofileIndex>
    get count() { return this.handles ? this.handles.count : 0 }
    get loaded() { return this._loaded }
    private getIndex(attribute: string, type: GeofileIndexType): GeofileIndex {
        return this.indexes.get(`${attribute}/${type}`)
    }

    abstract get parser(): GeofileParser
    abstract load(): Promise<any>
    abstract release(): Promise<any>
    abstract readFeature(rank: number | GeofileHandle): Promise<GeofileFeature>
    abstract readFeatures(rank: number, limit: number): Promise<GeofileFeature[]>

    assert(value: boolean, msg: string): asserts value is true {
        if (value) return;
        throw Error(`geofile [${this.name}] :${msg}`)
    }

    constructor(name: string, indexFile?: File | Blob) {
        this.indexFile = indexFile
        this.name = name;
        this.proj = 'EPSG:4326'
        this._loaded = false
        Geofile.GEOFILE_MAP.set(this.name, this)
    }


    open(): Promise<void> {
        return this.loadIndexes()
            .then(() => this.load())
            .then(() => this.assertTerminated())
    }

    close(): Promise<void> {
        return this.release().then(() => {
            this._loaded = false
            this.indexFile = null
            this.handles = null
            this.geoidx = null
            this.indexes = null
        })
    }

    getHandle(rank: number): GeofileHandle {
        this.assertRank(rank)
        return this.handles.getRecord(rank)
    }
    private initFeature(feature: GeofileFeature, rank): GeofileFeature {
        feature.rank = rank;
        feature.geofile = this;
        feature.proj = this.proj;
        feature.bbox = gt.bbox_g(feature.geometry);
        return feature
    }

    async getFeature(rank: number, options: GeofileFilter = {}): Promise<GeofileFeature> {
        this.assertLoaded()
        this.assertRank(rank)
        const feature = await this.readFeature(rank);
        return this.apply(this.initFeature(feature, rank), options);
    }

    async getFeatures(rank: number, limit = 100, options: GeofileFilter = {}): Promise<GeofileFeature[]> {
        this.assertLoaded();
        limit = (limit <= 0) ? 1 : Math.min(limit, this.count - rank);
        const features = await this.readFeatures(rank, limit);
        return features
            .map((feature,i) => this.apply(this.initFeature(feature, rank+i), options))
            .filter(f => f);
    }

    /** internal method to load all data indexes */
    private loadIndexes(): Promise<void> {
        if (!this.indexFile) return Promise.resolve()
        return new Promise((resolve, reject) => {
            const f = this.indexFile;
            const r = new FileReader();
            r.onerror = () => reject(`unable to load indexes due to ${r.error.message}`)
            r.onload = () => resolve(this.parseIndexes(r.result as ArrayBuffer))
            r.readAsArrayBuffer(f)
        })
    }
    parseIndexes(buffer: ArrayBuffer) {
        const indexes: GeofileIndex[] = []

        // read feature count and index count (length = HEADER_TSIZE)
        let dv = new DataView(buffer,0, HEADER_RSIZE)
        const offsets = getoffsets(0,HEADER_OFFSETS)
        this.assertIndexTag(buffer.slice(offsets.tag, TAG_LEN))
        const count = dv.getUint32(offsets.count,true);
        const idxcount = dv.getUint32(offsets.idxcount,true);

        dv = new DataView(buffer, HEADER_RSIZE, idxcount * METADAS_RSIZE);
        for (let i = 0, pos = 0; i < idxcount; i++) {
            const offsets = getoffsets(pos,METADATAS_OFFSETS)
            const attribute = dv.getUtf8(offsets.attribute,ATTRIBUTE_LEN)
            const type = GeofileIndexType[dv.getUtf8(offsets.type,INDEXTYPE_LEN)]
            const offset = dv.getUint32(offsets.offset,true);
            const length = dv.getUint32(offsets.length,true);
            const indexdv = new DataView(buffer, offset, length);
            const index = GeofileIndex.create(type, this, indexdv, attribute)
            indexes.push(index)
            pos+=METADAS_RSIZE
        }
        this.indexes = new Map()
        for (const index of indexes) {
            this.indexes.set(index.name, index)
            if (index.type === GeofileIndexType.handle) this.handles = index as GeofileIndexHandle
            if (index.type === GeofileIndexType.rtree) this.geoidx = index as GeofileIndexRtree
        }
        if (!this.handles || count !== this.handles.count) {
            throw new Error(`Geofile.parseIndexes(): missing mandatory handle index in index file`)
        }
    }

    async buildIndexes(idxlist: GeofileIndexDef[]): Promise<void> {

        // build all mandatory indexes and defined indexes
        idxlist = [{ attribute: 'rank', type: GeofileIndexType.handle }, { attribute: 'geometry', type: GeofileIndexType.rtree }, ...idxlist]
        let idxbufs: ArrayBuffer[] = []
        for (const def of idxlist) {
            const index = await GeofileIndex.build(def.type, this, def.attribute)
            idxbufs.push(index)
        }

        // build index header
        const count = idxbufs[0].byteLength / GeofileIndexHandle.RECSIZE
        const hdbuf = new ArrayBuffer(HEADER_RSIZE);
        const hddv = new DataView(hdbuf);
        const offset = 0 
        const offsets = getoffsets(offset,HEADER_OFFSETS) 
        hddv.setAscii(offsets.tag, HEADER_TAG)
        hddv.setUint32(offsets.count, count,true);
        hddv.setUint32(offsets.idxcount, idxlist.length,true);

        // index metadata record is {attribute:char[50], type:char[10], offset:uint32, length: uint32}
        // attribute: name of the indexed attribute ('rank' for handle and 'geometry' for geometry)
        // type: index type (handle,rtree,ordered,fuzzy,prefix)
        // buffer: offset of the index data in index file
        // length: length of the index data in the index file

        // build index metdatas
        const mdbuf = new ArrayBuffer(METADAS_RSIZE * idxlist.length);
        const mddv = new DataView(mdbuf);
        let osfidxdata = hdbuf.byteLength + mdbuf.byteLength
        idxlist.reduce((offset,index, i) => {
            const offsets = getoffsets(offset,METADATAS_OFFSETS) 
            mddv.setAscii(offsets.attribute, index.attribute)
            mddv.setAscii(offsets.type, index.type)
            mddv.setUint32(offsets.offset, osfidxdata,true);
            mddv.setUint32(offsets.length, idxbufs[i].byteLength,true);
            osfidxdata += idxbufs[i].byteLength
            return offset + METADAS_RSIZE
        },0)

        idxbufs = [hdbuf, mdbuf, ...idxbufs]
        const total = idxbufs.reduce((p, c) => p + c.byteLength, 0)
        const array = new Uint8Array(total)
        idxbufs.reduce((offset, buffer) => {
            array.set(new Uint8Array(buffer), offset)
            return offset + buffer.byteLength
        }, 0)
        this.parseIndexes(array.buffer)
        this.assertTerminated()
        return
    }

    protected apply(feature: GeofileFeature, options: GeofileFilter): GeofileFeature {
        if (!feature) return null;
        if (options._internalFilter && options._internalFilter.some(filter => !filter(feature))) { return null; }
        if (options.targetProjection && options.targetProjection !== feature.proj) {
            gt.transform_g(feature.geometry, feature.proj, options.targetProjection);
            feature.proj = options.targetProjection
        }
        if (options.featureFilter && !options.featureFilter(feature)) { return null; }
        if (options.featureAction) { options.featureAction(feature); }
        return feature;
    }

    parse() {
        const collected: GeofileFeature[] = []
        const parser = this.parser
        const bunch = 1024 * 64
        const onhandle = (handle: GeofileHandle) => {
            return this.readFeature(handle)
                .then(f =>  {
                    f.bbox = gt.bbox_g(f.geometry) 
                    f.rank = handle.rank
                    f.pos = handle.pos
                    f.len = handle.len
                    collected.push(f) 
                })
                .catch(e => { console.log(`Error while reading feature ${e}`) })
        }

        const file = parser.init(onhandle)
        const iter = async function* () {
            let offset = 0
            while (offset < file.size) {
                while (collected.length > 0) yield collected.shift()
                await new Promise((resolve, reject) => {
                    const slice = file.slice(offset, offset + bunch)
                    const r = new FileReader();
                    r.onerror = () => reject(`Geojson.readFeature(): unable to read feature due to ${r.error.message}`)
                    r.onload = () => {
                        const array = new Uint8Array(r.result as ArrayBuffer)
                        let err = null
                        for (let i = 0; i < array.byteLength && !err; i++) {
                            const byte = array[i]
                            // console.log(`parsing char[${i}] => "${String.fromCharCode(byte)}"/${byte} `)
                            err = parser.process(byte)
                            if (err) break
                        }
                        return err ? reject(`Geofile.parse(): ${err.msg} at ${err.line}:${err.col}`) : resolve()
                    }
                    r.readAsArrayBuffer(slice)
                })
                offset += bunch
            }
            await parser.ended()
            while (collected.length > 0) yield collected.shift()
            return;
        }
        return iter()

    }

    async forEach(options?: GeofileFilter, rank = 0): Promise<void> {
        this.assertLoaded();
        const bunch = 1000
        await this.getFeatures(rank, bunch, options)
        rank += bunch
        return (rank < this.count) ? this.forEach(options, rank) : Promise.resolve()
    }

    bbox(bbox: number[], options?: GeofileFilter): Promise<GeofileFeature[]> {
        this.assertLoaded();
        return this.geoidx.bbox(bbox, options)
    }

    point(lon: number, lat: number, options?: GeofileFilter): Promise<GeofileFeature[]> {
        this.assertLoaded();
        return this.geoidx.point(lon, lat, options)
    }

    nearest(lon: number, lat: number, radius: number | number[], options?: GeofileFilter): Promise<GeofileFeature> {
        this.assertLoaded();
        return this.geoidx.nearest(lon, lat, radius, options)
    }

    search(attr: string, values: any[], options?: GeofileFilter): Promise<GeofileFeature[]> {
        this.assertIndex(attr, GeofileIndexType.ordered)
        const index = this.getIndex(attr, GeofileIndexType.ordered) as GeofileIndexOrdered
        return index.search(values, options)
    }

    fuzzy(attr: string, prefixes: string, options?: GeofileFilter): Promise<GeofileFeature[]> {
        this.assertIndex(attr, GeofileIndexType.fuzzy)
        const index = this.getIndex(attr, GeofileIndexType.fuzzy) as GeofileIndexFuzzy
        return index.search(prefixes, options)
    }

    prefix(attr: string, prefixes: string, options?: GeofileFilter): Promise<GeofileFeature[]> {
        this.assertIndex(attr, GeofileIndexType.prefix)
        const index = this.getIndex(attr, GeofileIndexType.prefix) as GeofileIndexPrefix
        return index.search(prefixes, options)
    }


    getScale(resolution: number, projection: string): number {
        // const units = projection.getUnits();
        const dpi = 25.4 / 0.28;
        const mpu = gt.meter_per_unit(projection); // MBZ TODO A REVOIR CALCUL D'ECHELLE
        const scale = resolution * mpu * 39.37 * dpi;
        return scale;
    }

    getResolution(scale: number, projection: string): number {
        // const units = projection.getUnits();
        const dpi = 25.4 / 0.28;
        const mpu = gt.meter_per_unit(projection);
        const resolution = scale / (mpu * 39.37 * dpi);
        return resolution;
    }

    addIndexTiles(map: any, ol: any) {
        const tiles = [];
        const srcproj = this.proj;
        (this.geoidx as any).rtree._all(0, tiles);
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
    addToMap(map: any, ol: any, minscale: number, maxscale: number, style: any): void {
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
            if (ol.extent.equals(extent, last_extent)) { return; }
            last_extent = extent;
            const scale = this.getScale(resolution, proj);
            extent = (proj === this.proj) ? extent : ol.proj.transformExtent(extent, proj, this.proj);
            if ((!maxscale || scale < maxscale) && (!minscale || scale >= minscale)) {
                this.bbox(extent, {targetProjection: proj})
                    .then((features) => {
                        vsource.clear();
                        vsource.addFeatures(features.map(f => format.readFeature(f)));
                    });
            } else {
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


    assertLoaded(dummy = true): asserts dummy {
        if (this.loaded) return;
        throw Error(`geofile [${this.name}] : not loaded or load failed`)
    }

    assertRank(rank: number): asserts rank {
        if (rank >= 0 && rank < this.count) return;
        throw Error(`geofile [${this.name}] : rank=${rank} not in domain [0,${this.count}[`)
    }

    assertIndex(attribute: string, type: GeofileIndexType): asserts attribute {
        const index = this.getIndex(attribute, type)
        if (index) return
        throw Error(`geofile [${this.name}] :  unable to search no index found for ${attribute}/${type}`)
    }

    assertTerminated(dummy = true): asserts dummy is true {
        this._loaded = (this.count > 0 && !!this.handles)
        if (this.loaded) return;
        throw Error(`Geofile.load() [${this.name}] : load fail `)
    }

    assertIndexTag(tag: ArrayBuffer): asserts tag {
        const tarray = HEADER_TAG.split('').map(char => char.charCodeAt(0))
        const rarray = [...new Uint8Array(tag)]
        if (tarray.every((code, i) => code === rarray[i])) return
        throw Error(`geofile [${this.name}] : provided file is not an indexfile (incorrect signature)`)
    }


}
