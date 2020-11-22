import * as gt from './geotools';
import { GeofileIndexType, GeofileIndexDef } from './geoindex';
import { GeofileParser } from './geofileparser';
export interface GeofileHandle {
    rank: number;
    pos: number;
    len: number;
}
export declare enum GeofileFiletype {
    CSV = 0,
    GEOJSON = 1,
    SHP = 2,
    DBF = 3,
    PRJ = 4,
    GML2 = 5,
    GML3 = 6,
    KML = 7
}
export interface GeofileFeature {
    type?: string;
    geometry?: gt.Geometry;
    properties?: {
        [key: string]: unknown;
    };
    proj?: string;
    bbox?: number[];
    geofile?: Geofile;
    rank: number;
    pos: number;
    len: number;
    distance?: number;
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
export declare const setFilter: (gf: GeofileFilter, filter: (feature: GeofileFeature) => boolean) => GeofileFilter;
/**
 * File System spatial data class
 */
export declare abstract class Geofile {
    private static readonly GEOFILE_MAP;
    static get all(): IterableIterator<Geofile>;
    static get(name: string): Geofile;
    static clear(): void;
    static delete(name: string): void;
    readonly name: string;
    readonly proj: string;
    private _loaded;
    private indexFile;
    private handles;
    private geoidx;
    private indexes;
    get count(): number;
    get loaded(): boolean;
    get extent(): number[];
    private getIndex;
    abstract get parser(): GeofileParser;
    abstract open(): Promise<any>;
    abstract close(): Promise<any>;
    abstract readFeature(rank: number): Promise<GeofileFeature>;
    abstract readFeatures(rank: number, limit: number): Promise<GeofileFeature[]>;
    assert(value: boolean, msg: string): asserts value is true;
    constructor(name: string, indexFile?: Blob);
    load(): Promise<void>;
    unload(): Promise<void>;
    getHandle(rank: number): GeofileHandle;
    private initFeature;
    getFeature(rank: number, options?: GeofileFilter): Promise<GeofileFeature>;
    getFeatures(rank: number, limit?: number, options?: GeofileFilter): Promise<GeofileFeature[]>;
    private loadIndexes;
    buildIndexes(idxlist: GeofileIndexDef[], onprogress?: (state: {
        read: number;
        size: number;
        count: number;
    }) => void): Promise<void>;
    getIndexBuffer(): Blob;
    protected apply(feature: GeofileFeature, options: GeofileFilter): GeofileFeature;
    parse(onprogress: (state: {
        read: number;
        size: number;
        count: number;
    }) => void): AsyncGenerator<GeofileFeature>;
    forEach(options?: GeofileFilter, rank?: number): Promise<void>;
    bbox(bbox: number[], options?: GeofileFilter): Promise<GeofileFeature[]>;
    point(lon: number, lat: number, options?: GeofileFilter): Promise<GeofileFeature[]>;
    nearest(lon: number, lat: number, radius: number | number[], options?: GeofileFilter): Promise<GeofileFeature>;
    search(attr: string, values: any[], options?: GeofileFilter): Promise<GeofileFeature[]>;
    fuzzy(attr: string, prefixes: string, options?: GeofileFilter): Promise<GeofileFeature[]>;
    prefix(attr: string, prefixes: string, options?: GeofileFilter): Promise<GeofileFeature[]>;
    getScale(resolution: number, projection: string): number;
    getResolution(scale: number, projection: string): number;
    addIndexTiles(map: any, ol: any): void;
    /**
     * add this geofile to an openlayer Map as an ol.layer.Vector
     * @param map an openlayers 3+ Map
     * @param ol an openlayers 3+ global object
     */
    addToMap(map: any, ol: any, minscale: number, maxscale: number, style: any): void;
    assertLoaded(dummy?: boolean): asserts dummy;
    assertRank(rank: number): asserts rank;
    assertIndex(attribute: string, type: GeofileIndexType): asserts attribute;
    assertTerminated(dummy?: boolean): asserts dummy is true;
    assertIndexTag(tag: ArrayBuffer): asserts tag;
}
export * from './geofileparser';
export * from './geoindex';
