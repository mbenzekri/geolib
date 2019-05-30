import * as gt from './geotools';
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
export declare class GeofileFeature {
    geometry?: gt.Geometry;
    properties?: any;
    proj?: string;
    bbox?: number[];
    geofile?: Geofile;
    rank?: number;
    pos?: number;
    len?: number;
    distance?: number;
}
export interface GeofileOptions {
    /** unique symbolic name to identify the dataset */
    name?: string;
    /** human readable name for the dataset (for list)*/
    title?: string;
    /** longer description */
    desc?: string;
    /** name to group datasets together */
    group?: string;
    /** property name for id usage for the dataset */
    idprop?: string;
    /** Spatial Reference System for the geometry coodinates (ex: EPSG:4326) */
    srs?: string;
    /** minimum scale denominator for visible scale */
    minscale?: number;
    /** maximum scale denominator for visible scale */
    maxscale?: number;
    /** style function  */
    style?: Function;
    /** schema to describe data structure */
    schema?: any;
}
interface GeofileHandle {
    rank: number;
    pos: number;
    len: number;
    tmin: number;
    tmax: number;
}
/**
 * filter / action option struct
 */
export interface GeofileFilterOptions {
    /** target projection all feature will be transform into this projection if necessary */
    proj?: string;
    /** do not use (used for internal index filtering ) */
    _filter?: ((feature: GeofileFeature) => boolean)[];
    /** filter function only features that match this test function are returned*/
    filter?: (feature: GeofileFeature) => boolean;
    /** action function applied to all returned features (caution! above projection applied)*/
    action?: (feature: GeofileFeature) => void;
    /** cache for optimisation */
    cache?: Map<number, GeofileFeature>;
    /** tolerance for pointSearch */
    tolerance?: number;
    /** max levenshtein distance for fuzzy search */
    maxlevenshtein?: number;
}
declare enum GeofileIndexType {
    handle = "handle",
    rtree = "rtree",
    ordered = "ordered",
    fuzzy = "fuzzy",
    prefix = "prefix"
}
/** Index structure handled by Geofile class */
interface GeofileIndex {
    /** attribute name indexed */
    attribute: string;
    /** index type name  */
    type: GeofileIndexType;
    /** dataview on the index data  when loaded */
    dv: DataView;
}
/**
 * File System spatial data class
 */
export declare abstract class Geofile {
    /** if true time statistics are logged */
    private static TIMEON;
    /** default style of Geofile class when not given */
    static readonly style: any;
    private static readonly ALL;
    /** geofile dataset file name  */
    readonly filename: string;
    /** minimum scale for dataset display */
    readonly minscale: number;
    /** maximum scale for dataset display */
    readonly maxscale: number;
    /** geofile dataset symbolic name */
    readonly name: string;
    /** geofile dataset symbolic human readable name */
    readonly title: string;
    /** grouping name for a set of geofile dataset */
    readonly group: string;
    /** openlayers style function to display features for this datatset */
    readonly style: Function;
    /** geofile dataset projection calculated through this.srs */
    readonly proj: string;
    /** feature count for this datatset */
    readonly count: number;
    /** true if dataset is loaded (call load() method) */
    readonly loaded: boolean;
    /** index Map */
    private indexes;
    /** handles data view */
    private handles;
    /** rbush rtree */
    private rtree;
    /** style file name associated to the geofile file */
    readonly confname: string;
    /** index file name associated to the geofile file */
    readonly idxname: string;
    /** extent of the geofile dataset */
    readonly extent: number[];
    /** array off all geofile */
    static readonly all: IterableIterator<Geofile>;
    /** method to find a geofile by it's name */
    static search(name: string): Geofile;
    /** remove a geofile by it's name */
    static delete(name: string): void;
    /** remove all geofile */
    static clear(): void;
    abstract getFeature_(rank: number, options: GeofileFilterOptions): Promise<GeofileFeature>;
    abstract getFeatures_(rank: number, count: number, options: GeofileFilterOptions): Promise<GeofileFeature[]>;
    abstract loadFeatures(): Promise<any>;
    getFeature(rank: number, options?: GeofileFilterOptions): Promise<GeofileFeature>;
    getFeatures(rank: number, count?: number, options?: GeofileFilterOptions): Promise<GeofileFeature[]>;
    protected getHandle(rank: number): GeofileHandle;
    /** construct a Geofile object (dont use private use static geosjon() method) */
    constructor(filename: string, opts?: GeofileOptions);
    /** internal method to init/construct a Geofile object */
    private init;
    /**
     * assertion: check for loaded geosjon
     */
    assertLoaded(): void;
    /**
     * assertion: check for loaded geosjon
     */
    assertindex(attribute: string, type: GeofileIndexType): GeofileIndex | Error;
    /** internal method to load configuration file for Geofile object */
    private loadConf;
    /** internal method to load all data indexes */
    private loadIndexes;
    /** internal method to set load status when loading is terminated */
    private loadTerminate;
    /**
     * calculate for a given rank (feature) in a cluster its cluster bbox (minitile)
     * @param rank the rank of the feature
     * @param cluster the cluster where the rank was found
     * @returns the calculated bbox
     */
    private clusterBbox;
    protected apply(feature: GeofileFeature, options: GeofileFilterOptions): GeofileFeature;
    private setFilter;
    newCache(): Map<number, GeofileFeature>;
    load(): Promise<Geofile>;
    foreach(options?: GeofileFilterOptions): Promise<null>;
    bboxSearch(bbox: number[], options?: GeofileFilterOptions): Promise<GeofileFeature[]>;
    pointSearch(lon: number, lat: number, options?: GeofileFilterOptions): Promise<GeofileFeature[]>;
    /**
     * search and return the nearest feature arround a point
     * @param gjspt a generic point
     * @param rorb raduis or bbox
     * @param options filter options
     */
    nearestSearch(lon: number, lat: number, rorb: number | number[], options?: GeofileFilterOptions): Promise<GeofileFeature>;
    /**
     * starting with idwrank in the index and by incremental steps search for all the features
     * that match the compare function (stop when first matching fail occurs)
     * @param index search index
     * @param idxrank rank in the index
     * @param searched searched strings
     * @param compare comparison function
     * @param options filter options
     * @param found internal use for recursive calls
     */
    private next;
    private binarySearch;
    attributeSearch(attr: string, values: any[], options?: GeofileFilterOptions): Promise<GeofileFeature[]>;
    fuzzySearch(attr: string, value: string, options?: GeofileFilterOptions): Promise<{
        distance: number;
        feature: GeofileFeature;
    }[]>;
    /** Search with a dichotomic algorithm all ranks associated with an array of prefix
     * a rank found must have all prefixes associated
     * index data is an ordered array of tuple [ prefix:char[4], rank:uint32 ] (each tuple have 8 bytes)
    */
    private binaryPrefixSearch;
    prefixSearch(attr: string, prefix: string, maxfeature?: number): Promise<GeofileFeature[]>;
    /**
     * get scale from resolution
     * @param resolution a resolution
     * @param projection the target map projectiion
     * @returns corresponding resolution for scale
     */
    getScale(resolution: number, projection: string): number;
    /**
     * get resolution from scale
     * @param scale a scale
     * @param projection the target map projectiion
     * @returns corresponding resolution for scale
     */
    getResolution(scale: number, projection: string): number;
    addIndexTiles(map: any, ol: any): void;
    /**
     * add this geofile to an openlayer Map as an ol.layer.Vector
     * @param map an openlayers 3+ Map
     * @param ol an openlayers 3+ global object
     */
    addAsVector(map: any, ol: any): any;
}
export interface GeofileParser {
    type: GeofileFiletype;
    collection: GeofileFeature[];
    filename: string;
    mandatory: boolean;
    mdate: Date;
    onData(buffer: ArrayBuffer): any;
}
export declare class GeofileBinaryParser implements GeofileParser {
    readonly type: GeofileFiletype;
    readonly collection: GeofileFeature[];
    readonly filename: string;
    mandatory: boolean;
    mdate: Date;
    protected offset: number;
    protected read: number;
    private length;
    private callback;
    private buffer;
    constructor(filename: string, type: GeofileFiletype, mandatory: boolean);
    /**
     * data to be provided to the parser.
     * @param arrbuf data array buffer to be pushed to the parser
     */
    onData(arrbuf: ArrayBuffer): void;
    /**
     * Register a callback and length of waited data bytes
     * @param size waited bytes length
     * @param callback callback to be called when waited size reaxhed by parsing
     */
    wait(size: any, callback: any): void;
    skip(bytes: number, next: () => void): void;
}
export declare class GeofileIndexer {
    private idxlist;
    private count;
    private parsers;
    private data;
    private header;
    private metadata;
    private handles;
    private indexes;
    private clusters;
    /** header total header size
     * tag:     char 8 bytes for tag,
     * count:   uint 4 bytes for feature count,
     * index:   uint 4 bytes for index count
     */
    private readonly HEADER_TSIZE;
    /** tag for file type checking geojson index  */
    private readonly HEADER_TAG;
    /** index metadata entry size
     * attribute:   char 50 bytes for attribute name,
     * type:        char 10 bytes for index type,
     * length:      uint 4 bytes for index data offset,
     * offset:      uint 4 bytes for index data length
     */
    private readonly METADAS_RSIZE;
    /** total metadata size  (index count * METADA_RSIZE )*/
    private readonly METADATAS_TSIZE;
    /** handles entry size
     * offset: uint 4 bytes offset in geojson file of the parsable GEOJSON object "{...}"
     * length: uint 4 bytes length of the GEOJSON parsable object
     * xminitile: uint 1 byte minitile x coordinate
     * yminitile: uint 1 byte minitile y coordinate
     */
    private readonly HANDLES_RSIZE;
    /** features in rtree are grouped by RTREE_CLUSTER_SIZE features */
    private readonly RTREE_CLUSTER_SIZE;
    private readonly INDEX_NEXT_OFFSET;
    protected constructor(idxlist: any[], parsers: GeofileParser[]);
    readonly indexfilename: string;
    /** usage is ex: Geofile.index(filename, idxlist, new GeojsonParser()); => promise*/
    static index(idxlist: any[], parsers: GeofileParser[]): Promise<void>;
    private parseAll;
    /**
     * read the data from all the files to parse and write the data to the parsers
     * @param datafile datafile structure
     * @param i index in filelist of the datafile
     */
    private stream;
    private buildIndex;
    private buildHeader;
    private buildHandles;
    private bboxextend;
    private builRtree;
    private setMinitile;
    private buildMetadata;
    buildAttributes(): void;
    buildOrderedIndex(attr: string): void;
    buildFuzzyIndex(attr: string): void;
    buildPrefixIndex(attr: string): void;
    write(): Promise<number>;
}
export {};
