import { GeofileFeature } from './geofile';
export declare abstract class GeofileParser {
    readonly isbinary: boolean;
    private _pos;
    private _line;
    private _col;
    private rank;
    private pending;
    collected: any[];
    abstract begin(): Promise<Blob>;
    abstract process(byte: number): any;
    abstract end(): Promise<void>;
    get pos(): number;
    get line(): number;
    get col(): number;
    constructor(isbinary?: boolean);
    consume(byte: number): false | {
        msg: string;
        line: number;
        col: number;
        offset: number;
    };
    produce(feature: GeofileFeature): void;
    expected(): number;
    waitend(): Promise<void>;
}
