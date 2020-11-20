import { GeofileParser } from "./geofile";
export declare class GeojsonParser extends GeofileParser {
    private file;
    private state;
    private stack;
    private curfeat;
    constructor(file: Blob);
    private isfeature;
    begin(): Promise<Blob>;
    process(byte: number): void;
    end(): Promise<void>;
    private automata;
    private push;
    private pop;
    private unexpected;
}
