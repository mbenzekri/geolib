"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Geojson = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const polyfill_1 = require("./polyfill");
const geofile_1 = require("./geofile");
const geojsonparser_1 = require("./geojsonparser");
polyfill_1._();
/**
 * File System geojson class
 */
class Geojson extends geofile_1.Geofile {
    constructor(name, datafile, indexfile) {
        super(name, indexfile);
        this.file = datafile;
    }
    get parser() {
        return new geojsonparser_1.GeojsonParser(this.file);
    }
    load() {
        return Promise.resolve();
    }
    release() {
        return Promise.resolve();
    }
    readFeature(rank) {
        return new Promise((resolve, reject) => {
            const handle = (typeof rank === 'number') ? this.getHandle(rank) : rank;
            const slice = this.file.slice(handle.pos, handle.pos + handle.len);
            const r = new FileReader();
            r.onerror = () => reject(`Geojson.readFeature(): unable to read feature due to ${r.error.message}`);
            r.onload = () => resolve(JSON.parse(r.result));
            r.readAsText(slice);
        });
    }
    readFeatures(rank, limit) {
        const hmin = this.getHandle(rank);
        const hmax = this.getHandle(rank + limit - 1);
        const length = (hmax.pos - hmin.pos + hmax.len);
        const slice = this.file.slice(hmin.pos, hmin.pos + length);
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(`Geojson.readFeatures(): unable to read feature due to ${r.error.message}`);
            r.onload = () => {
                const array = r.result;
                const features = [];
                const td = new TextDecoder('utf8');
                for (let i = 0; i < limit; i++) {
                    const handle = this.getHandle(rank + i);
                    const slice = array.slice(handle.pos - hmin.pos, handle.pos - hmin.pos + handle.len);
                    const text = td.decode(slice);
                    const feature = JSON.parse(text);
                    features.push(feature);
                }
                resolve(features);
            };
            r.readAsArrayBuffer(slice);
        });
    }
}
exports.Geojson = Geojson;
__exportStar(require("./geojsonparser"), exports);
//# sourceMappingURL=geojson.js.map