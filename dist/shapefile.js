"use strict";
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
var geofile_1 = require("./geofile");
var gt = require("./geotools");
var fs = require("./sync");
var ISNODE = (typeof window === 'undefined');
// if (ISNODE) {
var TextDecoder = ISNODE ? require('text-encoding').TextDecoder : window['TextDecoder'];
var GEOMTYPE;
(function (GEOMTYPE) {
    GEOMTYPE[GEOMTYPE["NullShape"] = 0] = "NullShape";
    GEOMTYPE[GEOMTYPE["Point"] = 1] = "Point";
    GEOMTYPE[GEOMTYPE["PolyLine"] = 3] = "PolyLine";
    GEOMTYPE[GEOMTYPE["Polygon"] = 5] = "Polygon";
    GEOMTYPE[GEOMTYPE["MultiPoint"] = 8] = "MultiPoint";
    GEOMTYPE[GEOMTYPE["PointZ"] = 11] = "PointZ";
    GEOMTYPE[GEOMTYPE["PolyLineZ"] = 13] = "PolyLineZ";
    GEOMTYPE[GEOMTYPE["PolygonZ"] = 15] = "PolygonZ";
    GEOMTYPE[GEOMTYPE["MultiPointZ"] = 18] = "MultiPointZ";
    GEOMTYPE[GEOMTYPE["PointM"] = 21] = "PointM";
    GEOMTYPE[GEOMTYPE["PolyLineM"] = 23] = "PolyLineM";
    GEOMTYPE[GEOMTYPE["PolygonM"] = 25] = "PolygonM";
    GEOMTYPE[GEOMTYPE["MultiPointM"] = 28] = "MultiPointM";
    GEOMTYPE[GEOMTYPE["MultiPatch"] = 31] = "MultiPatch";
})(GEOMTYPE || (GEOMTYPE = {}));
var Shapefile = /** @class */ (function (_super) {
    __extends(Shapefile, _super);
    /** construct a Geojson object (dont use private use static geosjon() method) */
    function Shapefile(filename, opts) {
        if (opts === void 0) { opts = {}; }
        var _this = _super.call(this, filename, opts) || this;
        _this.fields = new Map();
        return _this;
    }
    Object.defineProperty(Shapefile.prototype, "dbfname", {
        /** dbf file name associated to the shapefile */
        get: function () { return this.filename.replace(/\.[^/.]+$/, '') + '.dbf'; },
        enumerable: true,
        configurable: true
    });
    Shapefile.get = function (filename, opts) {
        if (opts === void 0) { opts = {}; }
        var shapefile = new Shapefile(filename, opts);
        return shapefile.load();
    };
    /** internal method to get File object for Shapefile for random access */
    Shapefile.prototype.loadFeatures = function () {
        var _this = this;
        return fs.FSFile.get(this.filename)
            .then(function (file) { _this.shpfile = file; })
            .then(function () { return fs.FSFile.get(_this.dbfname); })
            .then(function (file) {
            _this.dbffile = file;
            // _this.adv = new DataView(this.result);
            // _this.attrData = this.result;
            // _this.readDbfHeader();
            // _this.readFields();
        })
            .then(function () { return _this.loadShpHeader(); })
            .then(function () { return _this.loadDbfHeader(); })
            .then(function () { return _this.loadDbfFields(); });
    };
    /*
    Position    Field                   Value   Type        Order
    Byte 0      File Code               9994    Integer     Big
    Byte 4      Unused                  0       Integer     Big
    Byte 8      Unused                  0       Integer     Big
    Byte 12     Unused                  0       Integer     Big
    Byte 16     Unused                  0       Integer     Big
    Byte 20     Unused                  0       Integer     Big
    Byte 24     File Length             length  Integer     Big
    Byte 28     Version                 1000    Integer     Little
    Byte 32     Shape Type              shptype Integer     Little
    Byte 36     Bounding Box            Xmin    Double      Little
    Byte 44     Bounding Box            Ymin    Double      Little
    Byte 52     Bounding Box            Xmax    Double      Little
    Byte 60     Bounding Box            Ymax    Double      Little
    Byte 68*    Bounding Box            Zmin    Double      Little
    Byte 76*    Bounding Box            Zmax    Double      Little
    Byte 84*    Bounding Box            Mmin    Double      Little
    Byte 92*    Bounding Box            Mmax    Double      Little
    */
    Shapefile.prototype.loadShpHeader = function () {
        var _this = this;
        return fs.FSFile.slice(this.shpfile, fs.FSFormat.arraybuffer, 0, 100)
            .then(function (buffer) {
            var dv = new DataView(buffer);
            var code = dv.getInt32(0);
            var length = dv.getInt32(24) * 2;
            var version = dv.getInt32(28, true);
            var type = dv.getInt32(32, true);
            var xmin = dv.getFloat64(36, true);
            var ymin = dv.getFloat64(44, true);
            var xmax = dv.getFloat64(52, true);
            var ymax = dv.getFloat64(60, true);
            var zmin = dv.getFloat64(68, true);
            var zmax = dv.getFloat64(76, true);
            var mmin = dv.getFloat64(84, true);
            var mmax = dv.getFloat64(92, true);
            _this.shpheader = { code: code, length: length, version: version, type: type, xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax, zmin: zmin, zmax: zmax, mmin: mmin, mmax: mmax };
        });
    };
    /**
      * 00	    FoxBase+, FoxPro, dBaseIII+, dBaseIV, no memo - 0x03
      * 01-03   Last update, format YYYYMMDD   **correction: it is YYMMDD**
      * 04-07	Number of records in file (32-bit number)
      * 08-09	Number of bytes in header (16-bit number)
      * 10-11	Number of bytes in record (16-bit number)
      * 12-13	Reserved, fill with 0x00
      * 14	    dBaseIV flag, incomplete transaction
      *         Begin Transaction sets it to 0x01
      *         End Transaction or RollBack reset it to 0x00
      * 15      Encryption flag, encrypted 0x01 else 0x00
      *         Changing the flag does not encrypt or decrypt the records
      * 16-27   dBaseIV multi-user environment use
      * 28	    Production index exists - 0x01 else 0x00
      * 29	    dBaseIV language driver ID
      * 30-31   Reserved fill with 0x00
      * 32-n	Field Descriptor array
      * n+1	    Header Record Terminator - 0x0D
    */
    Shapefile.prototype.loadDbfHeader = function () {
        var _this = this;
        return fs.FSFile.slice(this.dbffile, fs.FSFormat.arraybuffer, 0, 32)
            .then(function (buffer) {
            var dv = new DataView(buffer);
            _this.dbfheader = {
                code: dv.getUint8(0),
                lastUpdate: new Date(1900 + dv.getUint8(1), dv.getUint8(2) - 1, dv.getUint8(3)),
                count: dv.getUint32(4, true),
                headerSize: dv.getUint16(8, true),
                recordSize: dv.getUint16(10, true),
                encrypted: dv.getUint8(15)
            };
        });
    };
    Shapefile.prototype.loadDbfFields = function () {
        var _this = this;
        var fldsize = this.dbfheader.headerSize - 33;
        return fs.FSFile.slice(this.dbffile, fs.FSFormat.arraybuffer, 32, 32 + fldsize)
            .then(function (buffer) {
            var dv = new DataView(buffer);
            var offset = 0;
            var _loop_1 = function (pos) {
                var field = {
                    name: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) {
                        return String.fromCharCode(dv.getUint8(pos + i));
                    }).join('').trimzero(),
                    type: String.fromCharCode(dv.getUint8(pos + 11)),
                    offset: offset,
                    length: dv.getUint8(pos + 16),
                    decimal: dv.getUint8(pos + 17)
                };
                _this.fields.set(field.name, field);
                offset += field.length;
            };
            for (var pos = 0; pos < fldsize; pos += 32) {
                _loop_1(pos);
            }
        });
    };
    Shapefile.prototype.getFeature_ = function (rank, options) {
        var _this = this;
        var handle = this.getHandle(rank);
        var attrpos = this.dbfheader.headerSize + (handle.rank * this.dbfheader.recordSize) + 1;
        var promiseg = fs.FSFile.slice(this.shpfile, fs.FSFormat.arraybuffer, handle.pos, handle.len)
            .then(function (buffer) {
            var dv = new DataView(buffer);
            var geometry = _this.geometryReader(dv);
            return geometry;
        });
        var promisea = fs.FSFile.slice(this.dbffile, fs.FSFormat.arraybuffer, attrpos, attrpos + this.dbfheader.recordSize)
            .then(function (buffer) {
            var dv = new DataView(buffer);
            var properties = _this.propertiesReader(dv);
            return properties;
        });
        return Promise.all([promiseg, promisea])
            .then(function (arr) {
            var geometry = arr[0];
            var properties = arr[1];
            return { geometry: geometry, properties: properties };
        });
    };
    Shapefile.prototype.getFeatures_ = function (rank, count, options) {
        var _this = this;
        var hmin = this.getHandle(rank);
        var hmax = this.getHandle(rank + count - 1);
        var length = (hmax.pos + hmax.len - hmin.pos);
        var promiseg = fs.FSFile.slice(this.shpfile, fs.FSFormat.arraybuffer, hmin.pos, length)
            .then(function (buffer) {
            var geometries = [];
            for (var i = 0; i < count; i++) {
                var handle = _this.getHandle(rank);
                var dv = new DataView(buffer, handle.pos - hmin.pos, handle.len);
                var geometry = _this.geometryReader(dv);
                geometries.push(geometry);
                rank += 1;
            }
            return geometries;
        });
        var attrpmin = this.dbfheader.headerSize + (hmin.rank * this.dbfheader.recordSize) + 1;
        var attrlen = count * this.dbfheader.recordSize;
        var promisea = fs.FSFile.slice(this.dbffile, fs.FSFormat.arraybuffer, attrpmin, attrlen)
            .then(function (buffer) {
            var propsarr = [];
            for (var i = 0; i < count; i++) {
                var dv = new DataView(buffer, (i * _this.dbfheader.recordSize), _this.dbfheader.recordSize);
                var properties = _this.propertiesReader(dv);
                propsarr.push(properties);
            }
            return propsarr;
        });
        return Promise.all([promiseg, promisea])
            .then(function (arr) {
            var geomarr = arr[0];
            var proparr = arr[1];
            var features = geomarr.map(function (geometry, i) {
                var properties = proparr[i];
                return { geometry: geometry, properties: properties };
            });
            return features;
        });
    };
    Shapefile.prototype.propertiesReader = function (dv) {
        var td = new TextDecoder('utf8');
        var properties = new Object();
        this.fields.forEach(function (field, name) {
            // type = C (Character) All OEM code page characters.
            // type = D (Date) Numbers and a character to separate month, day, and year
            //                 (stored internally as 8 digits in YYYYMMDD format).
            // type = F (Floating - . 0 1 2 3 4 5 6 7 8 9 point binary numeric)
            // type = N (Binary - . 0 1 2 3 4 5 6 7 8 9 coded decimal numeric)
            // type = L (Logical) ? Y y N n T t F f (? when not initialized).
            // type = M (Memo) All OEM code page characters (stored internally as 10 digits representing a .DBT block number).
            var value = null;
            var offset = dv.byteOffset + field.offset;
            switch (field.type) {
                case 'C':
                case 'M':
                    value = td.decode(dv.buffer.slice(offset, offset + field.length)).trimzero().trim();
                    break;
                case 'D':
                    var yyyy = td.decode(dv.buffer.slice(offset, offset + 4));
                    var mm = td.decode(dv.buffer.slice(offset + 4, offset + 6));
                    var dd = td.decode(dv.buffer.slice(offset + 6, offset + 8));
                    value = new Date(parseInt(yyyy, 10), parseInt(mm, 10), parseInt(dd, 10));
                    break;
                case 'F':
                case 'N':
                    value = td.decode(dv.buffer.slice(offset, offset + field.length)).trimzero().trim();
                    value = parseFloat(value);
                    break;
                case 'I':
                    value = td.decode(dv.buffer.slice(offset, offset + field.length)).trimzero().trim();
                    value = parseInt(value, 10);
                    break;
                case 'L':
                    value = td.decode(dv.buffer.slice(offset, offset + field.length)).trimzero().trim();
                    value = ['Y', 'y', 'T', 't'].indexOf(value) >= 0;
                    break;
                default:
                    value = td.decode(dv.buffer.slice(offset, offset + field.length)).trimzero().trim();
            }
            properties[name] = value;
        });
        return properties;
    };
    Shapefile.prototype.getbbox = function (dv, pos) {
        return [dv.getFloat64(pos, true), dv.getFloat64(pos + 8, true), dv.getFloat64(pos + 16, true), dv.getFloat64(pos + 24, true)];
    };
    Shapefile.prototype.geometryReader = function (dv) {
        var geomtype = dv.getInt32(0, true);
        switch (geomtype) {
            case GEOMTYPE.Point: return this.geomPoint(dv);
            case GEOMTYPE.PolyLine: return this.geomPolyLine(dv);
            case GEOMTYPE.Polygon: return this.geomPolygon(dv);
            case GEOMTYPE.MultiPoint: return this.geomMultiPoint(dv);
            case GEOMTYPE.NullShape:
            case GEOMTYPE.PointZ:
            case GEOMTYPE.PolyLineZ:
            case GEOMTYPE.PolygonZ:
            case GEOMTYPE.MultiPointZ:
            case GEOMTYPE.PointM:
            case GEOMTYPE.PolyLineM:
            case GEOMTYPE.PolygonM:
            case GEOMTYPE.MultiPointM:
            case GEOMTYPE.MultiPatch:
            default: return this.geomNullShape(dv);
        }
        return null;
    };
    /**
     * Type Null
     * Position    Field       Value   Type    Number  Byte Order
     * Byte 0      Shape Type  0       Integer 1       Little
     */
    Shapefile.prototype.geomNullShape = function (dv) {
        return null;
    };
    /**
     *  read a point geometry from the dataview
     *  Type Point
     *  Position    Field       Value   Type    Number  Byte Order
     *  Byte 0      Shape Type  1       Integer 1       Little
     *  Byte 4      X           X       Double  1       Little
     *  Byte 12     Y           Y       Double  1       Little
     */
    Shapefile.prototype.geomPoint = function (dv) {
        var x = dv.getFloat64(4, true);
        var y = dv.getFloat64(12, true);
        return { type: gt.GeometryType.Point, coordinates: [x, y] };
    };
    /**
     *  read a polyline geometry from the dataview
     *  Position    Field       Value       Type    Number      Byte Order
     *  Byte 0      Shape Type  3           Integer 1           Little
     *  Byte 4      Box         Box         Double  4           Little
     *  Byte 36     NumParts    NumParts    Integer 1           Little
     *  Byte 40     NumPoints   NumPoints   Integer 1           Little
     *  Byte 44     Parts       Parts       Integer NumParts    Little
     *  Byte X      Points      Points      Point   NumPoints   Little
     *
     *  Note: X = 44 + 4 * NumParts
     */
    Shapefile.prototype.geomPolyLine = function (dv) {
        var parts = [];
        var lring = [];
        var numparts = dv.getInt32(36, true);
        var numpoints = dv.getInt32(40, true);
        var ppos = 44;
        for (var part = 0; part < numparts; part++) {
            parts.push(dv.getInt32(ppos + (part * 4), true));
        }
        ppos = 44 + (4 * numparts);
        while (parts.length > 0) {
            var deb = 2 * 8 * parts.shift();
            var fin = 2 * 8 * ((parts.length > 0) ? parts[0] : numpoints);
            for (var i = deb; i < fin; i += 16) {
                var x = dv.getFloat64(ppos + i, true);
                var y = dv.getFloat64(ppos + i + 8, true);
                lring.push([x, y]);
            }
        }
        return { type: gt.GeometryType.Polygon, coordinates: lring };
        ;
    };
    /**
     *  Type Polygon
     *  Position    Field       Value       Type    Number      Byte Order
     *  Byte 0      Shape Type  5           Integer 1           Little
     *  Byte 4      Box         Box         Double  4           Little
     *  Byte 36     NumParts    NumParts    Integer 1           Little
     *  Byte 40     NumPoints   NumPoints   Integer 1           Little
     *  Byte 44     Parts       Parts       Integer NumParts    Little
     *  Byte X      Points      Points      Point   NumPoints   Little
     *
     *  Note: X = 44 + 4 * NumParts
     */
    Shapefile.prototype.geomPolygon = function (dv) {
        var numparts = dv.getInt32(36, true);
        var numpoints = dv.getInt32(40, true);
        var parts = [];
        var ppos = 44;
        for (var part = 0; part < numparts; part++) {
            parts.push(dv.getInt32(ppos + (part * 4), true));
        }
        ppos = 44 + (4 * numparts);
        var mpolygon = [];
        while (parts.length > 0) {
            var lring = [];
            var deb = 2 * 8 * parts.shift();
            var fin = 2 * 8 * ((parts.length > 0) ? parts[0] : numpoints);
            for (var i = deb; i < fin; i += 16) {
                var x = dv.getFloat64(ppos + i, true);
                var y = dv.getFloat64(ppos + i + 8, true);
                lring.push([x, y]);
            }
            lring.push(lring[0]);
            mpolygon.push(lring);
        }
        return { type: gt.GeometryType.Polygon, coordinates: mpolygon };
    };
    /**
     *  Type Point
     * Position    Field       Value       Type        Number      Byte Order
     * Byte 0      Shape Type  8           Integer     1           Little
     * Byte 4      Box         Box         Double      4           Little
     * Byte 36     NumPoints   NumPoints   Integer     1           Little
     * Byte 40     Points      Points      Point       NumPoints   Little
     */
    Shapefile.prototype.geomMultiPoint = function (dv) {
        var numpoints = dv.getInt32(36, true);
        var points = [];
        var ipos = 40;
        for (var i = 0; i < numpoints; i++) {
            var x = dv.getFloat64(ipos, true);
            var y = dv.getFloat64(ipos + 8, true);
            points.push([x, y]);
            ipos += 16;
        }
        return { type: gt.GeometryType.MultiPoint, coordinates: points };
    };
    return Shapefile;
}(geofile_1.Geofile));
exports.Shapefile = Shapefile;
var ShpGeomType;
(function (ShpGeomType) {
    ShpGeomType[ShpGeomType["NullShape"] = 0] = "NullShape";
    ShpGeomType[ShpGeomType["Point"] = 1] = "Point";
    ShpGeomType[ShpGeomType["PolyLine"] = 3] = "PolyLine";
    ShpGeomType[ShpGeomType["Polygon"] = 5] = "Polygon";
    ShpGeomType[ShpGeomType["MultiPoint"] = 8] = "MultiPoint";
    ShpGeomType[ShpGeomType["PointZ"] = 11] = "PointZ";
    ShpGeomType[ShpGeomType["PolyLineZ"] = 13] = "PolyLineZ";
    ShpGeomType[ShpGeomType["PolygonZ"] = 15] = "PolygonZ";
    ShpGeomType[ShpGeomType["MultiPointZ"] = 18] = "MultiPointZ";
    ShpGeomType[ShpGeomType["PointM"] = 21] = "PointM";
    ShpGeomType[ShpGeomType["PolyLineM"] = 23] = "PolyLineM";
    ShpGeomType[ShpGeomType["PolygonM"] = 25] = "PolygonM";
    ShpGeomType[ShpGeomType["MultiPointM"] = 28] = "MultiPointM";
    ShpGeomType[ShpGeomType["MultiPatch"] = 31] = "MultiPatch";
})(ShpGeomType || (ShpGeomType = {}));
var ShapefileDbfParser = /** @class */ (function (_super) {
    __extends(ShapefileDbfParser, _super);
    function ShapefileDbfParser(shpname) {
        var _this = _super.call(this, shpname.replace(/\.[^.]*$/, '.dbf'), geofile_1.GeofileFiletype.DBF, false) || this;
        _this.fields = new Map();
        _this.rank = 0;
        _this.parseDbfHeader();
        return _this;
    }
    ShapefileDbfParser.prototype.parseDbfHeader = function () {
        var _this = this;
        var myself = this;
        // Byte     Contents        Meaning
        // -------  ----------      -------------------------------------------------
        // 0        1byte           Valid dBASE IV file; bits 0-2 indicate version
        //                          number, bit 3 the presence of a dBASE IV memo
        //                          file, bits 4-6 the presence of an SQL table, bit
        //                          7 the presence of any memo file (either dBASE III
        //                          PLUS or dBASE IV).
        // 1-3      3 bytes         Date of last update; formattted as YYMMDD.
        // 4-7      32-bit          number Number of records in the file.
        // 8-9      16-bit number   Number of bytes in the header.
        // 10-11    16-bit number   Number of bytes in the record.
        // 12-13    2 bytes         Reserved; fill with 0.
        // 14       1 byte          Flag indicating incomplete transaction.
        // 15       1 byte          Encryption flag.
        // 16-27    12 bytes        Reserved for dBASE IV in a multi-user environment.
        // 28       1 bytes         Production MDX file flag; 01H if there is an MDX,
        //                          00H if not.
        // 29       1 byte          Language driver ID.
        // 30-31    2 bytes         Reserved; fill with 0.
        // 32-n*    32 bytes        each Field descriptor array (see beelow).
        // n + 1    1 byte          0DH as the field terminator.
        this.wait(32, function (dv) {
            _this.dbfheader = {
                code: dv.getUint8(0),
                lastUpdate: new Date(1900 + dv.getUint8(1), dv.getUint8(2) - 1, dv.getUint8(3)),
                count: dv.getUint32(4, true),
                headerSize: dv.getUint16(8, true),
                recordSize: dv.getUint16(10, true),
                encrypted: dv.getUint8(15)
            };
            _this.parseDbfFields();
        });
    };
    ShapefileDbfParser.prototype.parseDbfFields = function () {
        var _this = this;
        // Byte     Contents        Meaning
        // -------  ------------    --------------------------------------------------
        // 0-10     11 bytes        Field name in ASCII (zero-filled).
        // 11       1 byte          Field type in ASCII (C, D, F, L, M, or N).
        // 12-15    4 bytes         Reserved.
        // 16       1 byte          Field length in binary.
        // 17       1 byte          Field decimal count in binary.
        // 18-19    2 bytes         Reserved.
        // 20       1 byte          Work area ID.
        // 21-30    10 bytes        Reserved.
        // 31       1 byte          Production MDX field flag; 01H if field has an
        //                          index tag in the production MDX file, 00H if not.
        var fldsize = this.dbfheader.headerSize - 33; // la taille du header contient le dbfheader + 0x0D final
        this.wait(fldsize, function (dv) {
            var offset = 0;
            var _loop_2 = function (pos) {
                var field = {
                    name: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return String.fromCharCode(dv.getUint8(pos + i)); }).join('').trimzero(),
                    type: String.fromCharCode(dv.getUint8(pos + 11)),
                    offset: offset,
                    length: dv.getUint8(pos + 16),
                    decimal: dv.getUint8(pos + 17)
                };
                _this.fields.set(field.name, field);
                offset += field.length;
            };
            for (var pos = 0; pos < fldsize; pos += 32) {
                _loop_2(pos);
            }
            _this.skip(2, function () { return _this.parseDbfData(); }); // il y a un caractere 0x0D à la fin du header
        });
    };
    ShapefileDbfParser.prototype.parseDbfData = function () {
        var _this = this;
        this.wait(this.dbfheader.recordSize, function (dv) {
            var td = new TextDecoder('utf8');
            var properties = new Object();
            _this.fields.forEach(function (field, name) {
                // type = C (Character) All OEM code page characters.
                // type = D (Date) Numbers and a character to separate month, day, and year (stored internally as 8 digits in YYYYMMDD format).
                // type = F (Floating - . 0 1 2 3 4 5 6 7 8 9 point binary numeric)
                // type = N (Binary - . 0 1 2 3 4 5 6 7 8 9 coded decimal numeric)
                // type = L (Logical) ? Y y N n T t F f (? when not initialized).
                // type = M (Memo) All OEM code page characters (stored internally as 10 digits representing a .DBT block number).
                var val = null;
                switch (field.type) {
                    case 'C':
                    case 'M':
                        val = td.decode(dv.buffer.slice(dv.byteOffset + field.offset, dv.byteOffset + field.offset + field.length)).trimzero().trim();
                        break;
                    case 'D':
                        var yyyy = td.decode(dv.buffer.slice(dv.byteOffset + field.offset, dv.byteOffset + field.offset + 4));
                        var mm = td.decode(dv.buffer.slice(dv.byteOffset + field.offset + 4, dv.byteOffset + field.offset + 6));
                        var dd = td.decode(dv.buffer.slice(dv.byteOffset + field.offset + 6, dv.byteOffset + field.offset + 8));
                        val = new Date(parseInt(yyyy), parseInt(mm), parseInt(dd));
                        break;
                    case 'F':
                    case 'N':
                        val = td.decode(dv.buffer.slice(dv.byteOffset + field.offset, dv.byteOffset + field.offset + field.length)).trimzero().trim();
                        val = parseFloat(val);
                        break;
                    case 'I':
                        val = td.decode(dv.buffer.slice(dv.byteOffset + field.offset, dv.byteOffset + field.offset + field.length)).trimzero().trim();
                        val = parseInt(val);
                        break;
                    case 'L':
                        val = td.decode(dv.buffer.slice(dv.byteOffset + field.offset, dv.byteOffset + field.offset + field.length)).trimzero().trim();
                        val = ['Y', 'y', 'T', 't'].indexOf(val) >= 0;
                        break;
                    default:
                        val = td.decode(dv.buffer.slice(dv.byteOffset + field.offset, dv.byteOffset + field.offset + field.length)).trimzero().trim();
                }
                properties[name] = val;
            });
            _this.collection.push({ properties: properties, rank: _this.rank, pos: _this.offset, len: _this.dbfheader.recordSize });
            _this.rank += 1;
            //if (rank < this.count) { this.skip('dbf', 1, ()  => this.parseDbfData()); }
            _this.parseDbfData();
        });
    };
    return ShapefileDbfParser;
}(geofile_1.GeofileBinaryParser));
exports.ShapefileDbfParser = ShapefileDbfParser;
var ShapefileShpParser = /** @class */ (function (_super) {
    __extends(ShapefileShpParser, _super);
    function ShapefileShpParser(filename) {
        var _this = _super.call(this, filename, geofile_1.GeofileFiletype.SHP, true) || this;
        _this.count = 0;
        _this.geomtype = ShpGeomType.NullShape;
        _this.eof();
        _this.parseShpHeader();
        return _this;
    }
    /** when end of feature reached reset current */
    ShapefileShpParser.prototype.eof = function () {
        if (this.current) {
            this.collection.push(this.current);
            this.count++;
        }
        this.current = {};
    };
    ShapefileShpParser.prototype.parseShpHeader = function () {
        var _this = this;
        // Position Field           Value       Type        Order
        // Byte 0   File Code       9994        Integer     Big
        // Byte 4   Unused          0           Integer     Big
        // Byte 8   Unused          0           Integer     Big
        // Byte 12  Unused          0           Integer     Big
        // Byte 16  Unused          0           Integer     Big
        // Byte 20  Unused          0           Integer     Big
        // Byte 24  File Length     File Length Integer     Big
        // Byte 28  Version         1000        Integer     Little
        // Byte 32  Shape Type      Shape Type  Integer     Little
        // Byte 36  Bounding Box    Xmin        Double      Little
        // Byte 44  Bounding Box    Ymin        Double      Little
        // Byte 52  Bounding Box    Xmax        Double      Little
        // Byte 60  Bounding Box    Ymax        Double      Little
        // Byte 68* Bounding Box    Zmin        Double      Little (if 0.0 not used)
        // Byte 76* Bounding Box    Zmax        Double      Little (if 0.0 not used)
        // Byte 84* Bounding Box    Mmin        Double      Little (if 0.0 not used)
        // Byte 92* Bounding Box    Mmax        Double      Little (if 0.0 not used)
        this.wait(100, function (dv) {
            _this.shpheader = {
                length: dv.getInt32(24) * 2,
                geomtype: dv.getInt32(32, true),
                xmin: dv.getFloat64(36, true),
                ymin: dv.getFloat64(44, true),
                xmax: dv.getFloat64(52, true),
                ymax: dv.getFloat64(60, true)
            };
            _this.parseShpGeom();
        });
    };
    ShapefileShpParser.prototype.parseShpGeom = function () {
        var _this = this;
        // Position Field           Value           Type    Number  Order
        // Byte 0   Record Number   Record Number   Integer 1       Big
        // Byte 4   Content Length  Content Length  Integer 1       Big
        // Byte 8   Shape Type      Shape Type      Integer 1       Little
        if (this.read >= this.shpheader.length) {
            return;
        }
        this.wait(12, function (dv) {
            _this.current.pos = _this.offset + 8;
            _this.current.rank = _this.count;
            _this.current.len = dv.getInt32(4) * 2;
            var type = dv.getInt32(8, true);
            switch (type) {
                case ShpGeomType.NullShape: return _this.parseShpGeom();
                case ShpGeomType.Point: return _this.parseShpPoint(_this.current.len - 4);
                case ShpGeomType.PointM: return _this.parseShpPoint(_this.current.len - 4);
                case ShpGeomType.PointZ: return _this.parseShpPoint(_this.current.len - 4);
                default: return _this.parseShpNotPoint();
            }
        });
    };
    ShapefileShpParser.prototype.parseShpPoint = function (len) {
        var _this = this;
        // Position Field       Value   Type    Number  Order
        // Byte 0   X           X       Double  1       Little
        // Byte 8   Y           Y       Double  1       Little
        this.wait(len, function (dv) {
            var x = dv.getFloat64(0, true);
            var y = dv.getFloat64(8, true);
            _this.current.bbox = [x, y, x, y];
            _this.eof();
            _this.parseShpGeom();
        });
    };
    ShapefileShpParser.prototype.parseShpNotPoint = function () {
        var _this = this;
        // Position Field       Value   Type    Number  Order
        // Byte 0   Box         Box     Double  4       Little
        // Byte 32        ... geometry remainder...
        this.wait(32, function (dv) {
            var xmin = dv.getFloat64(0, true);
            var ymin = dv.getFloat64(8, true);
            var xmax = dv.getFloat64(16, true);
            var ymax = dv.getFloat64(24, true);
            _this.current.bbox = [xmin, ymin, xmax, ymax];
            var remainder = _this.current.len - 36; //  len - type - bbox
            //console.log(JSON.stringify(this.current));
            _this.eof();
            _this.skip(remainder, function () { return _this.parseShpGeom(); });
        });
    };
    return ShapefileShpParser;
}(geofile_1.GeofileBinaryParser));
exports.ShapefileShpParser = ShapefileShpParser;
//# sourceMappingURL=shapefile.js.map