import { Parser } from './jsonparse';
import { Geofile, GeofileFeature, GeofileOptions, GeofileFilterOptions, GeofileParser, GeofileFiletype } from './geofile';
/**
 * File System geojson class
 */
export declare class Geojson extends Geofile {
    /** data file geojson */
    file: File;
    /**
     * promise that resolve to a new created and loaded geojson
     * @param filename complete full path and file name of the geojson to load
     * @param opts options to configure the created geojson object (see. GeofileOptions)
     * @returns the promise
     */
    static get(filename: string, opts?: GeofileOptions): Promise<Geofile>;
    /** construct a Geojson object (dont use private use static geosjon() method) */
    private constructor();
    /** internal method to get File object for Geojson file for random access */
    loadFeatures(): Promise<any>;
    getFeature_(rank: number, options?: GeofileFilterOptions): Promise<GeofileFeature>;
    getFeatures_(rank: number, count: number, options: GeofileFilterOptions): Promise<GeofileFeature[]>;
}
export declare class GeojsonParser extends Parser implements GeofileParser {
    type: GeofileFiletype;
    collection: any[];
    mandatory: boolean;
    filename: string;
    mdate: Date;
    private rank;
    private brace;
    private features;
    private properties;
    private geometry;
    constructor(filename: string);
    onData(buffer: ArrayBuffer): void;
    onToken(token: number, value: any): void;
    extend(bounds: number[], point: number[]): void;
}
