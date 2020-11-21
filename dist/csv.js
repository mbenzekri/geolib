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
const polyfill_1 = require("./polyfill");
const geofile_1 = require("./geofile");
const csvparser_1 = require("./csvparser");
polyfill_1._();
/**
 * File System Csv class
 */
class Csv extends geofile_1.Geofile {
    constructor(name, datafile, options = {}, indexfile) {
        super(name, indexfile);
        this.assert(!!datafile, `Csv.constructor(): data file paramemter is not provided or nullish`);
        this.file = datafile;
        this.options = {
            header: false,
            colnames: Array.from({ length: 250 }).map((v, i) => `col${i}`),
            lonlat: null,
            wkt: null,
            skip: 0,
            separator: ','.charCodeAt(0),
            comment: null,
            quote: null,
            escape: '\\'.charCodeAt(0),
            maxscan: 16,
            limit: Infinity
        };
        this.params = options;
        if (typeof this.params.header === 'boolean')
            this.options.header = this.params.header;
        if (Array.isArray(this.params.header))
            this.options.header = false;
        if (Array.isArray(this.params.header))
            this.options.colnames = this.params.header;
        if (typeof this.params.skip === 'number')
            this.options.skip = this.params.skip;
        if (typeof this.params.separator === 'string')
            this.options.separator = this.params.separator.charCodeAt(0);
        if (typeof this.params.comment === 'string')
            this.options.comment = this.params.comment.charCodeAt(0);
        if (typeof this.params.quote === 'string')
            this.options.quote = this.params.quote.charCodeAt(0);
        if (typeof this.params.escape === 'string')
            this.options.escape = this.params.escape.charCodeAt(0);
        if (typeof this.params.maxscan === 'number')
            this.options.maxscan = this.params.maxscan;
        if (typeof this.params.limit === 'number')
            this.options.limit = this.params.limit;
    }
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
                const line = yield this.file.readText(handle.pos, handle.len);
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
                const lines = yield this.file.read(hmin.pos, length);
                const dv = new DataView(lines);
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
    assertOptions(dummy = true) {
        const lonlat = this.params.lonlat;
        if (Array.isArray(lonlat) && lonlat.length === 2 && typeof lonlat[0] === 'number' && typeof lonlat[1] === 'number') {
            if (lonlat[0] < 0 || lonlat[0] >= this.options.colnames.length)
                throw Error(`incorrect option Csv lonlat: lon index  out of range`);
            if (lonlat[1] < 0 || lonlat[1] >= this.options.colnames.length)
                throw Error(`incorrect option Csv lonlat: lat index out of range`);
            this.options.lonlat = lonlat;
        }
        if (Array.isArray(lonlat) && lonlat.length === 2 && typeof lonlat[0] === 'string' && typeof lonlat[1] === 'string') {
            if (!this.options.colnames.find(colname => colname === lonlat[0]))
                throw Error(`incorrect option Csv lonlat: lon column name not found`);
            if (!this.options.colnames.find(colname => colname === lonlat[1]))
                throw Error(`incorrect option Csv lonlat: lat column name not found`);
            this.options.lonlat = [this.options.colnames.indexOf(lonlat[0]), this.options.colnames.indexOf(lonlat[1])];
        }
        if (typeof lonlat === 'number') {
            throw Error(`incorrect option Csv lonlat: WKT not yet implemented`);
        }
        if (typeof lonlat === 'string') {
            throw Error(`incorrect option Csv lonlat: WKT not yet implemented`);
        }
    }
}
exports.Csv = Csv;
__exportStar(require("./csvparser"), exports);
//# sourceMappingURL=csv.js.map