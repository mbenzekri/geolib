import { Geofile, GeofileHandle, GeofileFeature, GeofileFilter } from './geofile';
export declare enum GeofileIndexType {
    handle = "handle",
    rtree = "rtree",
    ordered = "ordered",
    fuzzy = "fuzzy",
    prefix = "prefix"
}
export interface GeofileIndexDef {
    attribute: string;
    type: GeofileIndexType;
}
export declare abstract class GeofileIndex {
    readonly type: GeofileIndexType;
    readonly attribute: string;
    protected dv: DataView;
    protected geofile: Geofile;
    get size(): number;
    get name(): string;
    abstract getRecord(rank: any): {
        rank: number;
        [key: string]: any;
    };
    abstract get count(): number;
    assertRank(idxrank: number): asserts idxrank;
    protected constructor(geofile: Geofile, type: GeofileIndexType, attribute: string, dv?: DataView);
    static build(type: GeofileIndexType, geofile: Geofile, attribute: string): Promise<ArrayBuffer>;
    static create(type: GeofileIndexType, geofile: Geofile, dv: DataView, attribute: string): GeofileIndex;
}
export declare class GeofileIndexHandle extends GeofileIndex {
    static RECSIZE: number;
    get count(): number;
    constructor(geofile: Geofile, dv?: DataView);
    static compile(geofile: Geofile): Promise<ArrayBuffer>;
    getRecord(rank: number): GeofileHandle;
}
export declare class GeofileIndexRtree extends GeofileIndex {
    static RECSIZE: number;
    get count(): number;
    private rtree;
    get extent(): number[];
    constructor(geofile: Geofile, dv?: DataView);
    static compile(geofile: Geofile): Promise<ArrayBuffer>;
    getRecord(rank: number): {
        rank: number;
    };
    bbox(bbox: number[], options?: GeofileFilter): Promise<GeofileFeature[]>;
    point(lon: number, lat: number, options?: GeofileFilter): Promise<GeofileFeature[]>;
    nearest(lon: number, lat: number, radius: number | number[], options?: GeofileFilter): Promise<GeofileFeature>;
    private static bboxextend;
    private logtimes;
}
export declare abstract class GeofileIndexAttribute extends GeofileIndex {
    private next;
    protected binarySearch(searched: any[], compare: (a: any, b: any) => number, options: GeofileFilter, imin?: number, imax?: number): Promise<GeofileFeature[]>;
}
export declare class GeofileIndexOrdered extends GeofileIndexAttribute {
    get recsize(): number;
    static RECSIZE: number;
    get count(): number;
    constructor(geofile: Geofile, dv: DataView, attribute: string);
    static compile(geofile: Geofile, attribute: string): Promise<ArrayBuffer>;
    getRecord(idxrank: number): {
        rank: number;
    };
    search(searched: any[], options?: GeofileFilter): Promise<GeofileFeature[]>;
}
export declare class GeofileIndexFuzzy extends GeofileIndexAttribute {
    static RECSIZE: number;
    get count(): number;
    constructor(geofile: Geofile, dv: DataView, attribute: string);
    static compile(geofile: Geofile, attribute: string): Promise<ArrayBuffer>;
    getRecord(idxrank: number): {
        rank: number;
        hash: number;
    };
    search(searched: string, options?: GeofileFilter): Promise<GeofileFeature[]>;
}
export declare class GeofileIndexPrefix extends GeofileIndexAttribute {
    static RECSIZE: number;
    get count(): number;
    constructor(geofile: Geofile, dv: DataView, attribute: string);
    static compile(geofile: Geofile, attribute: string): Promise<ArrayBuffer>;
    getRecord(idxrank: number): {
        rank: number;
        prefix: string;
    };
    search(searched: string, options?: GeofileFilter): Promise<GeofileFeature[]>;
    private intersect;
    private bsearch;
}
