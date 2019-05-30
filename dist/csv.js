'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var jsts = require("jsts");
var polyfill_1 = require("./polyfill");
var geofile_1 = require("./geofile");
var fs = require("./sync");
polyfill_1._();
var WKTREADER = new jsts.io.WKTReader();
var GEOJSONWRITER = new jsts.io.GeoJSONWriter();
var wktread = function (wkt) {
    var geometry = WKTREADER.read(wkt);
    var gjsgeom = GEOJSONWRITER.write(geometry);
    return gjsgeom;
};
var STATE;
(function (STATE) {
    STATE["ROW"] = "ROW";
    STATE["FIELD"] = "FIELD";
    STATE["QFIELD"] = "QFIELD";
    STATE["COMMA"] = "COMMA";
    STATE["QQUOTE"] = "QQUOTE";
    STATE["EOL"] = "EOL";
})(STATE || (STATE = {}));
var TOKEN;
(function (TOKEN) {
    TOKEN["SPACE"] = " ";
    TOKEN["TAB"] = "\t";
    TOKEN["QUOTE"] = "\"";
    TOKEN["COMMA"] = ",";
    TOKEN["SEMICOLON"] = ";";
    TOKEN["LF"] = "\r";
    TOKEN["CR"] = "\n";
})(TOKEN || (TOKEN = {}));
var CsvOptions = /** @class */ (function () {
    function CsvOptions() {
    }
    return CsvOptions;
}());
var CsvParser = /** @class */ (function (_super) {
    __extends(CsvParser, _super);
    function CsvParser(filename, options) {
        var _this = _super.call(this, filename, geofile_1.GeofileFiletype.CSV, true) || this;
        _this.options = {
            separator: ',',
            header: null,
            lonfield: 'lon',
            latfield: 'lat',
            escape: 0x22,
            quote: 0X22,
            skip: 0,
        };
        _this.state = STATE.ROW;
        _this.field = '';
        _this.row = [];
        if (options.separator) {
            _this.options.separator = options.separator;
        }
        if (options.header) {
            _this.options.header = options.header;
        }
        if (options.lonfield) {
            _this.options.lonfield = options.lonfield;
        }
        if (options.latfield) {
            _this.options.latfield = options.latfield;
        }
        return _this;
    }
    CsvParser.parse = function (toparse, options) {
        var parser = new CsvParser(toparse, options);
        return parser.collection;
    };
    // send data to the automata 
    CsvParser.prototype.onData = function (buffer) {
        var dv = new DataView(buffer);
        for (var i = 0; i < buffer.byteLength; i++) {
            this.onChar(String.fromCharCode(dv.getUint8(i)));
            this.offset += 1;
        }
    };
    CsvParser.prototype.onChar = function (char) {
        this[this.state](char);
    };
    CsvParser.prototype.pushField = function () {
        this.row.push(this.field);
        this.field = '';
    };
    CsvParser.prototype.buildFeature = function () {
        var _this = this;
        var properties = this.row;
        var geometry = null;
        if (this.options.header) {
            properties = this.options.header.reduce(function (obj, name, i) {
                obj[name] = _this.row[i];
                return obj;
            }, {});
            var ilon = this.options.header.indexOf(this.options.lonfield);
            var ilat = this.options.header.indexOf(this.options.latfield);
            if (ilon > 0 && ilat > 0
                && properties[this.options.header[ilon]] !== null
                && properties[this.options.header[ilat]] !== null) {
                var lon = parseFloat(properties[this.options.header[ilon]]);
                var lat = parseFloat(properties[this.options.header[ilat]]);
                geometry = { type: 'Point', coordinates: [lon, lat] };
            }
            this.collection.push({ geometry: geometry, properties: properties });
        }
        else {
            this.options.header = this.row;
            if (this.row.length === 1) {
                var line = this.row[0];
                if (line.split(TOKEN.COMMA).length > 1) {
                    this.options.header = line.split(TOKEN.COMMA).map(function (f) { return f.replace(/^"|"$/g, ''); });
                    this.options.separator = TOKEN.COMMA;
                }
            }
        }
        this.row = [];
        this.field = '';
    };
    CsvParser.prototype.ROW = function (char) {
        switch (char) {
            case TOKEN.QUOTE:
                this.state = STATE.QFIELD;
                break;
            case this.options.separator:
                this.pushField();
                this.state = STATE.ROW;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.pushField();
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    };
    CsvParser.prototype.FIELD = function (char) {
        switch (char) {
            case this.options.separator:
                this.pushField();
                this.state = STATE.FIELD;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.pushField();
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    };
    CsvParser.prototype.QFIELD = function (char) {
        switch (char) {
            case TOKEN.QUOTE:
                this.state = STATE.QQUOTE;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    };
    CsvParser.prototype.QQUOTE = function (char) {
        switch (char) {
            case TOKEN.QUOTE:
                this.field += '"';
                this.state = STATE.QFIELD;
                break;
            case TOKEN.COMMA:
                this.pushField();
                this.state = STATE.ROW;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.pushField();
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.state = STATE.COMMA;
                break;
        }
    };
    CsvParser.prototype.COMMA = function (char) {
        switch (char) {
            case TOKEN.COMMA:
                this.state = STATE.ROW;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.state = STATE.COMMA;
                break;
        }
    };
    CsvParser.prototype.EOL = function (char) {
        switch (char) {
            case TOKEN.CR:
            case TOKEN.LF:
                this.state = STATE.EOL;
                break;
            case TOKEN.QUOTE:
                this.state = STATE.QFIELD;
                break;
            case this.options.separator:
                this.pushField();
                this.state = STATE.ROW;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    };
    return CsvParser;
}(geofile_1.GeofileBinaryParser));
exports.CsvParser = CsvParser;
/**
 * File System csv class
 */
var Csv = /** @class */ (function (_super) {
    __extends(Csv, _super);
    /** construct a Geojson object (dont use private use static geosjon() method) */
    function Csv(filename, opts) {
        if (opts === void 0) { opts = {}; }
        return _super.call(this, filename, opts) || this;
    }
    /**
     * promise that resolve to a new created and loaded csv
     * @param filename complete full path and name of the csv file to load
     * @param opts options to configure the created geojson object (see. GeofileOptions)
     * @returns the promise
     */
    Csv.get = function (filename, opts) {
        if (opts === void 0) { opts = {}; }
        var csv = new Csv(filename, opts);
        return csv.load();
    };
    /** internal method to get File object for Geojson file for random access */
    Csv.prototype.loadFeatures = function () {
        var _this = this;
        return fs.FSFile.get(this.filename)
            .then(function (file) {
            _this.file = file;
            var handle = _this.getHandle(0);
            return fs.FSFile.slice(_this.file, fs.FSFormat.text, 0, handle.pos);
        })
            .then(function (slice) {
            _this.header = CsvParser.parse(slice, { separator: ';' })[0];
        });
    };
    Csv.prototype.getFeature_ = function (rank, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var handle = this.getHandle(rank);
        return fs.FSFile.slice(this.file, fs.FSFormat.text, handle.pos, handle.len)
            .then(function (slice) {
            var properties = CsvParser.parse(slice, { separator: ';', header: _this.header })[0];
            if (properties.geometry) {
                var geometry = wktread(properties.geometry);
                delete properties.geometry;
                var feature = { geometry: geometry, properties: properties };
                return feature;
            }
            return null;
        });
    };
    Csv.prototype.getFeatures_ = function (rank, count, options) {
        var _this = this;
        if (count === void 0) { count = 1000; }
        if (options === void 0) { options = {}; }
        var hmin = this.getHandle(rank);
        var hmax = this.getHandle(rank + count - 1);
        return fs.FSFile.slice(this.file, fs.FSFormat.text, hmin.pos, (hmax.pos + hmax.len - hmin.pos))
            .then(function (slice) {
            var array = CsvParser.parse(slice, { separator: ';', header: _this.header });
            var features = array.map(function (properties) {
                if (properties.geometry) {
                    var geometry = wktread(properties.geometry);
                    delete properties.geometry;
                    var feature = { geometry: geometry, properties: properties };
                    return feature;
                }
                return null;
            });
            return features;
        });
    };
    return Csv;
}(geofile_1.Geofile));
exports.Csv = Csv;
//# sourceMappingURL=csv.js.map