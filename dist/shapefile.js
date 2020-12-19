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
exports.Shapefile = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
require("./polyfill");
const geofile_1 = require("./geofile");
const shapefileparser_1 = require("./shapefileparser");
/**
 * File System Shapefile class
 */
class Shapefile extends geofile_1.Geofile {
    constructor(name, shpfile, dbffile = null, indexfile) {
        super(name, indexfile);
        this.assert(!!shpfile, `Csv.constructor(): data file paramemter is not provided or nullish`);
        this.shpfile = shpfile;
        this.dbffile = dbffile;
    }
    get extent() {
        return [this.shpheader.xmin, this.shpheader.ymin, this.shpheader.xmax, this.shpheader.ymax];
    }
    get type() { return 'shp'; }
    get parser() {
        return new shapefileparser_1.ShapefileParser(this.shpfile, this.dbffile);
    }
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            const dv = yield this.shpfile.dataview(0, 100);
            this.shpheader = shapefileparser_1.ShapefileParser.shpHeaderReader(dv);
            this.dbfheader = { code: 9994, lastUpdate: new Date(), count: 0, headerSize: 0, recordSize: 0, encrypted: 0, fields: new Map() };
            if (this.dbffile) {
                this.dbfheader = yield shapefileparser_1.ShapefileParser.dbfHeaderReader(this.dbffile);
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () { return; });
    }
    readFeature(rank) {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = this.getHandle(rank);
            const attrpos = this.dbfheader.headerSize + (handle.rank * this.dbfheader.recordSize) + 1;
            try {
                const shpdv = yield this.shpfile.dataview(handle.pos, handle.len);
                const dbfdv = this.dbffile ? yield this.dbffile.dataview(attrpos, this.dbfheader.recordSize) : null;
                const feature = shapefileparser_1.ShapefileParser.buidFeature(handle, shpdv, dbfdv, this.dbfheader.fields);
                return feature;
            }
            catch (err) {
                throw Error(`Shapefile.readFeature(): unable to read feature due to ${err.message}`);
            }
        });
    }
    readFeatures(rank, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const hmin = this.getHandle(rank);
                const hmax = this.getHandle(rank + limit - 1);
                const length = (hmax.pos - hmin.pos + hmax.len);
                const shpbuf = yield this.shpfile.arrayBuffer(hmin.pos, length);
                const amin = this.dbfheader.headerSize + (hmin.rank * this.dbfheader.recordSize) + 1;
                const alen = limit * this.dbfheader.recordSize;
                const dbfbuf = this.dbffile ? yield this.dbffile.arrayBuffer(amin, alen) : null;
                const features = [];
                for (let i = 0; i < limit; i++) {
                    const handle = this.getHandle(rank + i);
                    const shpdv = new DataView(shpbuf, handle.pos - hmin.pos, handle.len);
                    const dbfdv = this.dbffile ? new DataView(dbfbuf, i * this.dbfheader.recordSize, this.dbfheader.recordSize) : null;
                    const feature = shapefileparser_1.ShapefileParser.buidFeature(handle, shpdv, dbfdv, this.dbfheader.fields);
                    features.push(feature);
                }
                return features;
            }
            catch (err) {
                throw Error(`Shapefile.readFeatures(): unable to read features due to ${err.message}`);
            }
        });
    }
}
exports.Shapefile = Shapefile;
__exportStar(require("./shapefileparser"), exports);
//# sourceMappingURL=shapefile.js.map