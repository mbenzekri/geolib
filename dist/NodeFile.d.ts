import './polyfill';
export declare class File extends Blob {
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
export declare class FileReader extends EventTarget {
    readonly total = 0;
    private set _total(value);
    readonly error: Error;
    private set _error(value);
    readonly readyState = 0;
    private set _readyState(value);
    readonly result: ArrayBuffer | Blob | string;
    private set _result(value);
    set onabort(handler: (event: Event) => void);
    set onerror(handler: (event: Event) => void);
    set onload(handler: (event: Event) => void);
    set onloadstart(handler: (event: Event) => void);
    set onloadend(handler: (event: Event) => void);
    set onprogress(handler: (event: Event) => void);
    abort(): void;
    readAsArrayBuffer(blob: Blob): void;
    readAsBinaryString(): void;
    readAsDataURL(): void;
    readAsText(): void;
}
