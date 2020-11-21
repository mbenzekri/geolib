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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Geojson = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
require("./polyfill");
const geofile_1 = require("./geofile");
const geojsonparser_1 = require("./geojsonparser");
/**
 * File System geojson class
 */
class Geojson extends geofile_1.Geofile {
    constructor(name, datafile, indexfile) {
        super(name, indexfile);
        this.assert(!!datafile, `Geojson.constructor(): data file paramemter is not provided or nullish`);
        this.file = datafile;
    }
    get parser() { return new geojsonparser_1.GeojsonParser(this.file); }
    open() {
        return __awaiter(this, void 0, void 0, function* () { return; });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () { return; });
    }
    readFeature(rank) {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = this.getHandle(rank);
            try {
                const json = yield this.file.readText(handle.pos, handle.len);
                return JSON.parse(json);
            }
            catch (e) {
                throw new Error(`Geojson.readFeature(): unable to read feature due to ${e.message | e.toString()}`);
            }
        });
    }
    readFeatures(rank, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const hmin = this.getHandle(rank);
            const hmax = this.getHandle(rank + limit - 1);
            const length = (hmax.pos - hmin.pos + hmax.len);
            try {
                const array = yield this.file.read(hmin.pos, hmin.pos + length);
                const dv = new DataView(array);
                const features = [];
                for (let i = 0; i < limit; i++) {
                    const handle = this.getHandle(rank + i);
                    const text = dv.getUtf8(handle.pos - hmin.pos, handle.len);
                    const feature = JSON.parse(text);
                    features.push(feature);
                }
                return features;
            }
            catch (e) {
                throw new Error(`Geojson.readFeatures(): unable to read feature due to ${e.message | e.toString()}`);
            }
        });
    }
}
exports.Geojson = Geojson;
__exportStar(require("./geojsonparser"), exports);
//# sourceMappingURL=geojson.js.map