import { GeofileParser, GeofileFeature } from "./geofile";
export declare class GeojsonParser extends GeofileParser {
    private file;
    private rank;
    private state;
    private pos;
    private charcode;
    private line;
    private col;
    private pending;
    private separator;
    private lonfield;
    private latfield;
    private quote;
    private start;
    private ilon;
    private ilat;
    private field;
    private row;
    private header;
    private handle;
    private onhandle;
    constructor(file: Blob);
    init(onhandle: (feature: GeofileFeature) => Promise<void>): File | Blob;
    process(byte: number): {
        msg: string;
        line: number;
        col: number;
    };
    ended(): Promise<void>;
    pushField(): void;
    buildFeature(): void;
    private automata;
}
