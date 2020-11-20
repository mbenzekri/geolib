declare global {
    interface String {
        levenshtein(this: string, str2: any): number;
        clean(this: string): string;
        wordlist(this: string): string[];
        prefix(this: string): string[];
        fuzzyhash(this: string): number;
        titlecase(this: string): string;
        trimzero(this: string): string;
    }
    interface StringConstructor {
        fuzzyExtend(fuzzyh: number): number[];
    }
    interface Array<T> {
        flatten(this: Array<T>, flat?: Array<T>): Array<T>;
    }
    interface PromiseConstructor {
        clean<T>(values: readonly (T | PromiseLike<T> | PromiseLike<T[]>)[]): Promise<T[]>;
    }
    interface Object {
        applyTo(to: Object): Object;
    }
    interface DataView {
        getUtf8(offset: number, length: number): string;
        setAscii(offset: number, str: string, length?: number): void;
        getAscii(offset: number, length: number): string;
    }
    interface Blob {
        read(offset?: number, length?: number): Promise<ArrayBuffer>;
        readText(offset?: number, length?: number): Promise<string>;
        readDv(offset?: number, length?: number): Promise<DataView>;
    }
    interface ArrayBuffer {
        getUtf8(offset: number, length: number): string;
    }
    interface Uint8Array {
        getUtf8(offset: number, length: number): string;
    }
    interface SharedArrayBuffer {
        getUtf8(offset: number, length: number): string;
    }
}
declare function _(): void;
export { _ };
