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
exports.Csv = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
require("./polyfill");
const geofile_1 = require("./geofile");
const csvparser_1 = require("./csvparser");
/**
 * File System Csv class
 */
class Csv extends geofile_1.Geofile {
    constructor(name, datafile, opts = {}, indexfile) {
        super(name, indexfile);
        this.assert(!!datafile, `Csv.constructor(): data file paramemter is not provided or nullish`);
        this.file = datafile;
        this.options = {
            header: false,
            colnames: Array.from({ length: 250 }).map((v, i) => `col${i}`),
            lon: null,
            lat: null,
            wkt: null,
            skip: 0,
            separator: ','.charCodeAt(0),
            comment: null,
            quote: null,
            escape: '\\'.charCodeAt(0),
            maxscan: 16,
            limit: Infinity
        };
        Object.assign(this.options, opts);
        ['separator', 'comment', 'quote', 'escape',].forEach(opt => {
            if (typeof this.options[opt] === 'string')
                this.options[opt] = this.options[opt].charCodeAt(0);
        });
    }
    get type() { return 'csv'; }
    get parser() {
        return new csvparser_1.CsvParser(this.file, this.options);
    }
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.header) {
                this.options.colnames = yield csvparser_1.CsvParser.parseHeader(this.file, this.options);
            }
            this.assertOptions();
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () { return; });
    }
    readFeature(rank) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const handle = (typeof rank === 'number') ? this.getHandle(rank) : rank;
                const line = yield this.file.text(handle.pos, handle.len);
                const feature = csvparser_1.CsvParser.build(line, handle, this.options);
                return feature;
            }
            catch (err) {
                throw Error(`Csv.readFeature(): unable to read feature due to ${err.message}`);
            }
        });
    }
    readFeatures(rank, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const hmin = this.getHandle(rank);
                const hmax = this.getHandle(rank + limit - 1);
                const length = (hmax.pos - hmin.pos + hmax.len);
                const dv = yield this.file.dataview(hmin.pos, length);
                const features = [];
                for (let i = 0; i < limit; i++) {
                    const handle = this.getHandle(rank + i);
                    const line = dv.getUtf8(handle.pos - hmin.pos, handle.len);
                    const feature = csvparser_1.CsvParser.build(line, handle, this.options);
                    features.push(feature);
                }
                return features;
            }
            catch (err) {
                throw Error(`Csv.readFeatures(): unable to read features due to ${err.message}`);
            }
        });
    }
    assertOptions() {
        // change all colnames expressed as number to index in colnames
        ['lon', 'lat', 'wkt'].forEach(opt => {
            if (typeof this.options[opt] === 'string')
                this.options[opt] = this.options.colnames.indexOf(this.options[opt]);
        });
        const colcount = this.options.colnames.length;
        if (this.options.lon !== null && (this.options.lon < 0 || this.options.lon >= colcount))
            throw Error(`incorrect option Csv lon: lon colname not found or index  out of range`);
        if (this.options.lat !== null && (this.options.lat < 0 || this.options.lat >= colcount))
            throw Error(`incorrect option Csv lat: lat colname not found or index  out of range`);
        if (this.options.wkt !== null && (this.options.wkt < 0 || this.options.wkt >= colcount))
            throw Error(`incorrect option Csv wkt: WKT not yet implemented !`);
    }
}
exports.Csv = Csv;
__exportStar(require("./csvparser"), exports);
//# sourceMappingURL=csv.js.map