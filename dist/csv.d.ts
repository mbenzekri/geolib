import { Geofile, GeofileFeature, GeofileOptions, GeofileFilterOptions, GeofileBinaryParser } from './geofile';
declare class CsvOptions {
    separator?: string;
    header?: string[];
    lonfield?: string;
    latfield?: string;
    escape?: number;
    quote?: number;
    skip?: number;
}
export declare class CsvParser extends GeofileBinaryParser {
    private options;
    private state;
    private field;
    private row;
    constructor(filename: string, options?: any);
    static parse(toparse: string, options?: CsvOptions): any[] | any;
    onData(buffer: ArrayBuffer): void;
    onChar(char: string): void;
    pushField(): void;
    buildFeature(): void;
    ROW(char: string): void;
    FIELD(char: string): void;
    QFIELD(char: string): void;
    QQUOTE(char: string): void;
    COMMA(char: string): void;
    EOL(char: string): void;
}
/**
 * File System csv class
 */
export declare class Csv extends Geofile {
    /** data file csv */
    private file;
    private header;
    /**
     * promise that resolve to a new created and loaded csv
     * @param filename complete full path and name of the csv file to load
     * @param opts options to configure the created geojson object (see. GeofileOptions)
     * @returns the promise
     */
    static get(filename: string, opts?: GeofileOptions): Promise<Geofile>;
    /** construct a Geojson object (dont use private use static geosjon() method) */
    private constructor();
    /** internal method to get File object for Geojson file for random access */
    loadFeatures(): Promise<any>;
    getFeature_(rank: number, options?: GeofileFilterOptions): Promise<GeofileFeature>;
    getFeatures_(rank: number, count?: number, options?: GeofileFilterOptions): Promise<GeofileFeature[]>;
}
export {};
