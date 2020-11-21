export declare class NodeFile extends Blob {
    readonly name: string;
    private fd;
    private fsize;
    constructor(name: string, type?: string);
    get size(): number;
    open(): void;
    slice(start: number, end: number, type?: string): Blob;
    close(): void;
    private release;
}
