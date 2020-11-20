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
    get parser() {
        return new shapefileparser_1.ShapefileParser(this.shpfile, this.dbffile);
    }
    async open() {
        const dv = await this.shpfile.readDv(0, 100);
        this.shpheader = shapefileparser_1.ShapefileParser.shpHeaderReader(dv);
        this.dbfheader = { code: 9994, lastUpdate: new Date(), count: 0, headerSize: 0, recordSize: 0, encrypted: 0, fields: new Map() };
        if (this.dbffile) {
            this.dbfheader = await shapefileparser_1.ShapefileParser.dbfHeaderReader(this.dbffile);
        }
    }
    async close() { return; }
    async readFeature(rank) {
        const handle = this.getHandle(rank);
        const attrpos = this.dbfheader.headerSize + (handle.rank * this.dbfheader.recordSize) + 1;
        try {
            const shpdv = await this.shpfile.readDv(handle.pos, handle.len);
            const dbfdv = this.dbffile ? await this.dbffile.readDv(attrpos, this.dbfheader.recordSize) : null;
            const feature = shapefileparser_1.ShapefileParser.buidFeature(handle, shpdv, dbfdv, this.dbfheader.fields);
            return feature;
        }
        catch (err) {
            throw Error(`Shapefile.readFeature(): unable to read feature due to ${err.message}`);
        }
    }
    async readFeatures(rank, limit) {
        try {
            const hmin = this.getHandle(rank);
            const hmax = this.getHandle(rank + limit - 1);
            const length = (hmax.pos - hmin.pos + hmax.len);
            const shpbuf = await this.shpfile.read(hmin.pos, length);
            const amin = this.dbfheader.headerSize + (hmin.rank * this.dbfheader.recordSize) + 1;
            const alen = limit * this.dbfheader.recordSize;
            const dbfbuf = this.dbffile ? await this.dbffile.read(amin, alen) : null;
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
    }
}
exports.Shapefile = Shapefile;
__exportStar(require("./shapefileparser"), exports);
//# sourceMappingURL=shapefile.js.map