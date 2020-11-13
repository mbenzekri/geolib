declare global {
    interface String {
        levenshtein(this: string, str2: string): number;
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
}
declare function _(): void;
export { _ };
