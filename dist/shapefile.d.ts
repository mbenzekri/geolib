import './polyfill';
import { Geofile, GeofileFeature } from './geofile';
import { ShapefileParser } from './shapefileparser';
/**
 * File System Shapefile class
 */
export declare class Shapefile extends Geofile {
    private shpfile;
    private dbffile;
    private shpheader;
    private dbfheader;
    constructor(name: string, shpfile: Blob, dbffile?: Blob, indexfile?: Blob);
    get extent(): number[];
    get parser(): ShapefileParser;
    open(): Promise<void>;
    close(): Promise<void>;
    readFeature(rank: number): Promise<GeofileFeature>;
    readFeatures(rank: number, limit: number): Promise<GeofileFeature[]>;
}
export * from './shapefileparser';
