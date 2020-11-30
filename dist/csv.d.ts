import './polyfill';
import { Geofile, GeofileHandle, GeofileFeature, GeofileParser } from './geofile';
export interface CsvOptions {
    header?: boolean;
    colnames?: string[];
    lon?: number | string;
    lat?: number | string;
    wkt?: number | string;
    skip?: number;
    separator?: number | string;
    comment?: number | string;
    quote?: number | string;
    escape?: number | string;
    maxscan?: number;
    limit?: number;
}
/**
 * File System Csv class
 */
export declare class Csv extends Geofile {
    private file;
    private options;
    constructor(name: string, datafile: Blob, opts?: CsvOptions, indexfile?: Blob);
    get parser(): GeofileParser;
    open(): Promise<void>;
    close(): Promise<void>;
    readFeature(rank: number | GeofileHandle): Promise<GeofileFeature>;
    readFeatures(rank: number, limit: number): Promise<GeofileFeature[]>;
    private assertOptions;
}
export * from './csvparser';
