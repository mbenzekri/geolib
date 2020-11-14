import { Geofile, GeofileHandle, GeofileFeature, GeofileParser } from './geofile';
/**
 * File System geojson class
 */
export declare class Geojson extends Geofile {
    private file;
    constructor(name: string, datafile: Blob, indexfile?: Blob);
    get parser(): GeofileParser;
    load(): Promise<any>;
    release(): Promise<any>;
    readFeature(rank: number | GeofileHandle): Promise<GeofileFeature>;
    readFeatures(rank: number, limit: number): Promise<GeofileFeature[]>;
}
export * from './geojsonparser';
