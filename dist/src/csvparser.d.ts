import { GeofileParser, GeofileFeature } from "./geofile";
import { CsvOptions } from "./csv";
import { GeofileHandle } from "./geofile";
export declare class CsvParser extends GeofileParser {
    private file;
    private options;
    private start;
    private chars;
    constructor(file: Blob, options: CsvOptions);
    begin(): Promise<Blob>;
    process(byte: number): void;
    end(): Promise<void>;
    private toskip;
    private isempty;
    private iscomment;
    static splitLine(line: string, options: CsvOptions): string[];
    static build(line: string, handle: GeofileHandle, options: CsvOptions): GeofileFeature;
    static parseHeader(file: Blob, options: CsvOptions): Promise<string[]>;
}
