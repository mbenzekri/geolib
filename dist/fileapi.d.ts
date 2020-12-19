declare global {
    interface Blob {
        arrayBuffer(offset?: number, length?: number): Promise<ArrayBuffer>;
        text(offset?: number, length?: number): Promise<string>;
        dataview(offset?: number, length?: number): Promise<DataView>;
        stream(): ReadableStream<number>;
    }
}
export declare function getFile(name: string, type?: string): File;
