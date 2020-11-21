"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofileParser = void 0;
const gt = __importStar(require("./geotools"));
class GeofileParser {
    constructor(isbinary = false) {
        this.isbinary = false;
        this._pos = 0;
        this._line = 1;
        this._col = 0;
        this.rank = 0;
        this.pending = 0;
        this.collected = [];
        this.isbinary = isbinary;
    }
    get pos() { return this._pos; }
    get line() { return this._line; }
    get col() { return this._col; }
    consume(byte) {
        if (!this.isbinary) {
            // count lines and cols
            if (byte === 0x0A) {
                this._line++;
                this._col = 0;
            }
            this._col++;
        }
        try {
            this.process(byte);
        }
        catch (err) {
            return { msg: err.toString() + '\n' + err.stack, line: this._line, col: this._col, offset: this._pos };
        }
        this._pos++;
        return false;
    }
    produce(feature) {
        this.pending--;
        feature.bbox = feature.geometry ? gt.bbox_g(feature.geometry) : null;
        this.collected.push(feature);
    }
    expected() {
        this.pending++;
        return this.rank++;
    }
    waitend() {
        const loop = (resolve) => (this.pending > 0) ? setTimeout(() => loop(resolve), 0) : resolve();
        return new Promise(loop);
    }
}
exports.GeofileParser = GeofileParser;
//# sourceMappingURL=geofileparser.js.map