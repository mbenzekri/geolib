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
var jsonparse_1 = require("./jsonparse");
var polyfill_1 = require("./polyfill");
var geofile_1 = require("./geofile");
var fs = require("./sync");
polyfill_1._();
/**
 * File System geojson class
 */
var Geojson = /** @class */ (function (_super) {
    __extends(Geojson, _super);
    /** construct a Geojson object (dont use private use static geosjon() method) */
    function Geojson(filename, opts) {
        if (opts === void 0) { opts = {}; }
        return _super.call(this, filename, opts) || this;
    }
    /**
     * promise that resolve to a new created and loaded geojson
     * @param filename complete full path and file name of the geojson to load
     * @param opts options to configure the created geojson object (see. GeofileOptions)
     * @returns the promise
     */
    Geojson.get = function (filename, opts) {
        if (opts === void 0) { opts = {}; }
        var geojson = new Geojson(filename, opts);
        return geojson.load();
    };
    /** internal method to get File object for Geojson file for random access */
    Geojson.prototype.loadFeatures = function () {
        var _this = this;
        return fs.FSFile.get(this.filename)
            .then(function (file) {
            _this.file = file;
        });
    };
    Geojson.prototype.getFeature_ = function (rank, options) {
        if (options === void 0) { options = {}; }
        var handle = this.getHandle(rank);
        return fs.FSFile.slice(this.file, fs.FSFormat.text, handle.pos, handle.len)
            .then(function (slice) {
            var feature = JSON.parse(slice);
            return feature;
        });
    };
    Geojson.prototype.getFeatures_ = function (rank, count, options) {
        var _this = this;
        var hmin = this.getHandle(rank);
        var hmax = this.getHandle(rank + count - 1);
        var length = (hmax.pos + hmax.len - hmin.pos);
        return fs.FSFile.slice(this.file, fs.FSFormat.arraybuffer, hmin.pos, length)
            .then(function (array) {
            var features = [];
            var td = new TextDecoder('utf8');
            for (var i = 0; i < count; i++) {
                var handle = _this.getHandle(rank + i);
                var slice = array.slice(handle.pos - hmin.pos, handle.pos - hmin.pos + handle.len);
                var text = td.decode(slice);
                var feature = JSON.parse(text);
                features.push(feature);
            }
            return features;
        });
    };
    return Geojson;
}(geofile_1.Geofile));
exports.Geojson = Geojson;
var GeojsonParser = /** @class */ (function (_super) {
    __extends(GeojsonParser, _super);
    function GeojsonParser(filename) {
        var _this = _super.call(this) || this;
        // implements GeofileParser
        _this.type = geofile_1.GeofileFiletype.GEOJSON;
        _this.collection = [];
        _this.mandatory = true;
        _this.rank = 0;
        _this.brace = 0;
        _this.features = { rank: -1, reached: false, begin: 0, end: 0 };
        _this.properties = { reached: false, value: '' };
        _this.geometry = { reached: false, value: '' };
        _this.filename = filename;
        return _this;
    }
    // send data to jsonparse
    GeojsonParser.prototype.onData = function (buffer) {
        this.write(Buffer.from(buffer));
    };
    GeojsonParser.prototype.onToken = function (token, value) {
        var _this = this;
        var LEFT_BRACE = 0x1;
        var RIGHT_BRACE = 0x2;
        var STRING = 0xa;
        var NUMBER = 0xb;
        if (token === LEFT_BRACE) {
            this.brace += 1;
        }
        if (token === RIGHT_BRACE) {
            this.brace -= 1;
        }
        if (value === 'features') {
            this.features.reached = true;
        }
        if (!this.features.reached) {
            return;
        }
        if (this.properties.reached && this.brace > 2) {
            this.properties.value += (token === STRING) ? ('"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '" ') : (value + ' ');
        }
        if (this.geometry.reached && this.brace > 2) {
            this.geometry.value += (token === STRING) ? ('"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '" ') : (value + ' ');
        }
        if (this.properties.reached && token === RIGHT_BRACE && this.brace === 2) {
            this.properties.reached = false;
            this.properties.value += '}';
        }
        if (this.geometry.reached && token === RIGHT_BRACE && this.brace === 2) {
            this.geometry.reached = false;
            this.geometry.value += '}';
        }
        // opening brace for a feature, initializing
        if (token === LEFT_BRACE && this.brace === 2) {
            this.features.begin = this.offset;
            this.features.rank = this.rank++;
        }
        // closing brace for a feature add the feature to the feature list
        if (token === RIGHT_BRACE && this.brace === 1) {
            this.features.end = this.offset;
            // tslint:disable-next-line:max-line-length
            // console.log(`features at [${this.features.begin}, ${this.features.end}] len=${this.features.end - this.features.begin}`);
            // calculate bbox
            var geometry = JSON.parse(this.geometry.value);
            var getbbox_1 = function (arr, bounds) {
                if (bounds === void 0) { bounds = [null, null, null, null]; }
                if (!Array.isArray(arr)) {
                    return bounds;
                }
                if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[0] === 'number') {
                    _this.extend(bounds, arr);
                    return bounds;
                }
                arr.forEach(function (item) { return getbbox_1(item, bounds); });
                return bounds;
            };
            var feature = {
                rank: this.features.rank,
                pos: this.features.begin,
                len: this.features.end + 1 - this.features.begin,
                properties: JSON.parse(this.properties.value),
                bbox: getbbox_1(geometry.coordinates)
            };
            // console.log(JSON.stringify(feature));
            this.features = { rank: -1, reached: true, begin: 0, end: 0 };
            this.properties = { reached: false, value: '' };
            this.geometry = { reached: false, value: '' };
            this.collection.push(feature);
        }
        if (token === STRING && value === 'geometry' && this.brace === 2) {
            this.geometry.reached = true;
        }
        if (token === STRING && value === 'properties' && this.brace === 2) {
            this.properties.reached = true;
        }
    };
    GeojsonParser.prototype.extend = function (bounds, point) {
        if (bounds[0] == null || point[0] < bounds[0]) {
            bounds[0] = point[0];
        }
        if (bounds[1] == null || point[1] < bounds[1]) {
            bounds[1] = point[1];
        }
        if (bounds[2] == null || point[0] > bounds[2]) {
            bounds[2] = point[0];
        }
        if (bounds[3] == null || point[1] > bounds[3]) {
            bounds[3] = point[1];
        }
    };
    return GeojsonParser;
}(jsonparse_1.Parser));
exports.GeojsonParser = GeojsonParser;
//# sourceMappingURL=geojson.js.map