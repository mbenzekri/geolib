"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFile = void 0;
const fs_1 = __importDefault(require("fs"));
const FILE_MAX_OPEN = 100;
const FILE_OPENED = [];
class NodeFile extends Blob {
    constructor(name, type = 'application/octet-stream') {
        super([' '], { type });
        this.name = name;
        const stats = fs_1.default.statSync(name);
        this.fsize = stats.size;
    }
    get size() { return this.fsize; }
    open() {
        if (this.fd === null || this.fd === undefined) {
            this.release();
            this.fd = fs_1.default.openSync(this.name, 'r');
            FILE_OPENED.push(this);
        }
    }
    slice(start, end, type = this.type) {
        this.open();
        const length = end - start;
        const buffer = Buffer.alloc(length, 0);
        const read = fs_1.default.readSync(this.fd, buffer, 0, length, start);
        return new Blob([buffer.buffer.slice(0, read)], { type });
    }
    close() {
        if (this.fd !== null) {
            const index = FILE_OPENED.findIndex(file => this === file);
            if (index >= 0)
                FILE_OPENED.splice(index, 1);
            fs_1.default.closeSync(this.fd);
            this.fd = null;
        }
    }
    release() {
        if (FILE_OPENED.length === FILE_MAX_OPEN) {
            const file = FILE_OPENED.shift();
            fs_1.default.closeSync(file.fd);
            file.fd = null;
        }
    }
}
exports.NodeFile = NodeFile;
//# sourceMappingURL=NodeFile.js.map