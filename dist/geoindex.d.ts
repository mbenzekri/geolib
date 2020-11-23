import { Geofile, GeofileHandle, GeofileFeature, GeofileFilter } from './geofile';
declare class Uint32ArraySeq {
    int32arr: Uint32Array;
    setted: number;
    lastbunch: number;
    get array(): Uint32Array;
    get length(): number;
    constructor(bytes?: number);
    private expand;
    add(...uint32: number[]): void;
    set(i: number, uint32: number): void;
    get(i: number): number;
}
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
    get array(): ArrayBuffer;
    abstract getRecord(rank: any): {
        rank: number;
        [key: string]: any;
    };
    abstract get count(): number;
    abstract begin(): void;
    abstract index(feature: GeofileFeature): void;
    abstract end(): void;
    assertRank(idxrank: number): asserts idxrank;
    protected constructor(type: GeofileIndexType, attribute: string, geofile: Geofile, dv?: DataView);
    static create(type: GeofileIndexType, attribute: string, geofile: Geofile, dv?: DataView): GeofileIndex;
}
export declare class GeofileIndexHandle extends GeofileIndex {
    static RECSIZE: number;
    seq: Uint32ArraySeq;
    get count(): number;
    constructor(geofile: Geofile, dv?: DataView);
    begin(): void;
    index(feature: GeofileFeature): void;
    end(): void;
    getRecord(rank: number): GeofileHandle;
    setMinibox(feature: GeofileFeature, bounds: number[]): void;
    getMinibox(rank: number, bounds: number[]): number[];
}
export declare class GeofileIndexRtree extends GeofileIndex {
    static RECSIZE: number;
    get count(): number;
    get extent(): number[];
    private rtree;
    private clusters;
    private cluster;
    private bounds;
    private idxhandle;
    constructor(geofile: Geofile, dv?: DataView);
    setIndexHandle(idxhandle: GeofileIndexHandle): void;
    begin(): void;
    index(feature: GeofileFeature): void;
    end(): void;
    getRecord(rank: number): {
        rank: number;
    };
    bbox(bbox: number[], options?: GeofileFilter): Promise<GeofileFeature[]>;
    point(lon: number, lat: number, options?: GeofileFilter): Promise<GeofileFeature[]>;
    nearest(lon: number, lat: number, radius: number | number[], options?: GeofileFilter): Promise<GeofileFeature>;
    private bboxextend;
}
export declare abstract class GeofileIndexAttribute extends GeofileIndex {
    private next;
    protected binarySearch(searched: any[], compare: (a: any, b: any) => number, options: GeofileFilter, imin?: number, imax?: number): Promise<GeofileFeature[]>;
}
export declare class GeofileIndexOrdered extends GeofileIndexAttribute {
    get recsize(): number;
    static RECSIZE: number;
    get count(): number;
    attlist: {
        value: any;
        rank: number;
    }[];
    constructor(attribute: string, geofile: Geofile, dv: DataView);
    begin(): void;
    index(feature: GeofileFeature): void;
    end(): void;
    getRecord(idxrank: number): {
        rank: number;
    };
    search(searched: any[], options?: GeofileFilter): Promise<GeofileFeature[]>;
    private compare;
}
export declare class GeofileIndexFuzzy extends GeofileIndexAttribute {
    static RECSIZE: number;
    get count(): number;
    attlist: {
        hash: number;
        rank: number;
    }[];
    constructor(attribute: string, geofile: Geofile, dv: DataView);
    begin(): void;
    index(feature: GeofileFeature): void;
    end(): void;
    getRecord(idxrank: number): {
        rank: number;
        hash: number;
    };
    search(searched: string, options?: GeofileFilter): Promise<GeofileFeature[]>;
}
export declare class GeofileIndexPrefix extends GeofileIndexAttribute {
    static RECSIZE: number;
    get count(): number;
    preflist: {
        value: string;
        rank: number;
    }[];
    constructor(attribute: string, geofile: Geofile, dv: DataView);
    begin(): void;
    index(feature: GeofileFeature): void;
    end(): void;
    getRecord(idxrank: number): {
        rank: number;
        prefix: string;
    };
    search(searched: string, options?: GeofileFilter): Promise<GeofileFeature[]>;
    private intersect;
    private bsearch;
}
export {};
