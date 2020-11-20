import { Geofile, GeofileHandle, GeofileFeature, GeofileParser } from './geofile';
export interface CsvOptions {
    header: boolean;
    colnames: string[];
    lonlat: number[];
    wkt: number;
    skip: number;
    separator: number;
    comment: number;
    quote: number;
    escape: number;
    maxscan: number;
    limit: number;
}
export interface CsvOptionsParam {
    header?: boolean | string[];
    lonlat?: number[] | string[] | number | string;
    skip?: number;
    separator?: string;
    comment?: string;
    quote?: string;
    escape?: string;
    maxscan?: number;
    limit?: number;
}
/**
 * File System Csv class
 */
export declare class Csv extends Geofile {
    private file;
    private options;
    private params;
    constructor(name: string, datafile: Blob, options?: CsvOptionsParam, indexfile?: Blob);
    get parser(): GeofileParser;
    open(): Promise<void>;
    close(): Promise<void>;
    readFeature(rank: number | GeofileHandle): Promise<GeofileFeature>;
    readFeatures(rank: number, limit: number): Promise<GeofileFeature[]>;
    private assertOptions;
}
export * from './csvparser';
