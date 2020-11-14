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
    private pending;
    private onhandle;
    constructor(file: Blob);
    init(onhandle: (handle: GeofileHandle, line: number, col: number) => Promise<void>): File | Blob;
    process(byte: number): {
        msg: string;
        line: number;
        col: number;
    };
    ended(): Promise<void>;
    private automata;
    private push;
    private pop;
    private put;
    private unexpected;
}
