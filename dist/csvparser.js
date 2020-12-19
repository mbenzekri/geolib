"use strict";
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
exports.CsvParser = void 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const polyfill_1 = require("./polyfill");
const geofile_1 = require("./geofile");
const CR = '\n'.charCodeAt(0);
const LF = '\r'.charCodeAt(0);
class CsvParser extends geofile_1.GeofileParser {
    constructor(file, options) {
        super(false);
        this.chars = [];
        this.file = file;
        this.options = options;
    }
    begin() {
        return __awaiter(this, void 0, void 0, function* () {
            this.start = this.pos;
            return this.file;
        });
    }
    process(byte) {
        switch (true) {
            case this.toskip(): // skip first lines and header
            case byte === LF: // wait for LF and ignore
                break;
            case byte === CR: // wait for CR
                if (!this.isempty() && !this.iscomment()) {
                    const line = polyfill_1.toUtf8(Uint8Array.from(this.chars), 0, this.chars.length);
                    const handle = { rank: this.expected(), pos: this.start, len: this.pos - this.start };
                    const feature = CsvParser.build(line, handle, this.options);
                    this.produce(feature);
                }
                this.start = this.pos; // restart line
                this.chars = [];
                break;
            default:
                // store line chars
                this.chars.push(byte);
                break;
        }
    }
    end() {
        const _super = Object.create(null, {
            waitend: { get: () => super.waitend }
        });
        return __awaiter(this, void 0, void 0, function* () { return _super.waitend.call(this); });
    }
    toskip() {
        return this.line <= (this.options.skip + (this.options.header ? 1 : 0));
    }
    isempty() {
        return this.chars.length === 0;
    }
    iscomment() {
        return this.options.comment === this.chars[0];
    }
    static splitLine(line, options) {
        const values = line.split(String.fromCharCode(options.separator))
            .map(value => (value === '') ? null : value.replace(/^\s*"/, '').replace(/"\s*$/, ''));
        return values;
    }
    static build(line, handle, options) {
        let geometry = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const properties = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const values = CsvParser.splitLine(line, options);
        if (options.lon >= 0 && options.lat >= 0) {
            const lon = parseFloat(values[options.lon]);
            const lat = parseFloat(values[options.lat]);
            values[options.lon] = lon;
            values[options.lat] = lat;
            geometry = { type: 'Point', coordinates: [lon, lat] };
        }
        values.forEach((value, i) => { if (options.colnames[i])
            properties[options.colnames[i]] = value; });
        if (options.wkt) {
            throw Error(`WKT CSV options not yet implemented !`);
        }
        return { rank: handle.rank, pos: handle.pos, len: handle.len, geometry, properties };
    }
    static parseHeader(file, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // read column names in header
            const maxscan = 1024 * options.maxscan;
            const buffer = yield file.arrayBuffer(0, maxscan + 10);
            const array = new Uint8Array(buffer);
            let offset = 0, length = array.indexOf(CR);
            for (let line = 0; line < options.skip && offset < maxscan && length >= 0; line++) {
                offset += length + 1;
                length = array.indexOf(CR, offset) - offset;
            }
            if (length === -1)
                throw Error('Csv header not found in ${this.options.maxscan}k first bytes');
            while (offset < maxscan && length >= 0) {
                if (length > 0 && array[offset] !== options.comment) {
                    const line = polyfill_1.toUtf8(buffer, offset, length);
                    return CsvParser.splitLine(line, options);
                }
                offset += length + 1;
                length = array.indexOf(CR, offset) - offset;
            }
            if (length === -1)
                throw Error('Csv header not found in ${this.options.maxscan}k first bytes');
        });
    }
}
exports.CsvParser = CsvParser;
//# sourceMappingURL=csvparser.js.map