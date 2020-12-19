import './polyfill';
import { Geofile, GeofileFeature, GeofileParser } from './geofile';
/**
 * File System geojson class
 */
export declare class Geojson extends Geofile {
    private file;
    constructor(name: string, datafile: Blob, indexfile?: Blob);
    get type(): string;
    get parser(): GeofileParser;
    open(): Promise<any>;
    close(): Promise<any>;
    readFeature(rank: number): Promise<GeofileFeature>;
    readFeatures(rank: number, limit: number): Promise<GeofileFeature[]>;
}
export * from './geojsonparser';
