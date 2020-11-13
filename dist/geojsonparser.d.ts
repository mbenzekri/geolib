import { GeofileHandle, GeofileParser } from "./geofile";
export declare class GeojsonParser extends GeofileParser {
    private file;
    private rank;
    private state;
    private stack;
    private pos;
    private charcode;
    private line;
    private col;
    private ignore;
    private pending;
    private onhandle;
    constructor(file: File | Blob);
    init(onhandle: (handle: GeofileHandle) => Promise<void>): File | Blob;
    process(byte: number): void;
    ended(): Promise<void>;
    private automata;
    private push;
    private pop;
    private put;
    private unexpected;
}
