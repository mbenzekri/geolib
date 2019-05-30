'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var binrbush_1 = require("./binrbush");
var proj4_1 = require("proj4");
var gt = require("./geotools");
var polyfill_1 = require("./polyfill");
var binrtree_1 = require("./binrtree");
var fs = require("./sync");
polyfill_1._();
var WGS84 = 'EPSG:4326';
var HANDLE_SIZE = 10;
var INDEX_MD_SIZE = 68;
var GeofileFiletype;
(function (GeofileFiletype) {
    GeofileFiletype[GeofileFiletype["CSV"] = 0] = "CSV";
    GeofileFiletype[GeofileFiletype["GEOJSON"] = 1] = "GEOJSON";
    GeofileFiletype[GeofileFiletype["SHP"] = 2] = "SHP";
    GeofileFiletype[GeofileFiletype["DBF"] = 3] = "DBF";
    GeofileFiletype[GeofileFiletype["PRJ"] = 4] = "PRJ";
    GeofileFiletype[GeofileFiletype["GML2"] = 5] = "GML2";
    GeofileFiletype[GeofileFiletype["GML3"] = 6] = "GML3";
    GeofileFiletype[GeofileFiletype["KML"] = 7] = "KML";
})(GeofileFiletype = exports.GeofileFiletype || (exports.GeofileFiletype = {}));
var GeofileFeature = /** @class */ (function () {
    function GeofileFeature() {
        this.properties = {};
    }
    return GeofileFeature;
}());
exports.GeofileFeature = GeofileFeature;
var GeofileIndexType;
(function (GeofileIndexType) {
    GeofileIndexType["handle"] = "handle";
    GeofileIndexType["rtree"] = "rtree";
    GeofileIndexType["ordered"] = "ordered";
    GeofileIndexType["fuzzy"] = "fuzzy";
    GeofileIndexType["prefix"] = "prefix";
})(GeofileIndexType || (GeofileIndexType = {}));
/**
 * File System spatial data class
 */
var Geofile = /** @class */ (function () {
    /** construct a Geofile object (dont use private use static geosjon() method) */
    function Geofile(filename, opts) {
        if (opts === void 0) { opts = {}; }
        /** geofile dataset projection calculated through this.srs */
        this.proj = 'EPSG:4326';
        /** index Map */
        this.indexes = new Map();
        this.filename = filename;
        this.init(opts);
        this.handles = null;
        this.rtree = null;
        this.loaded = false;
        Geofile.ALL.set(this.name, this);
    }
    Object.defineProperty(Geofile.prototype, "confname", {
        /** style file name associated to the geofile file */
        get: function () { return this.filename.replace(/\.[^/.]+$/, '') + '.js'; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Geofile.prototype, "idxname", {
        /** index file name associated to the geofile file */
        get: function () { return this.filename.replace(/\.[^/.]+$/, '') + '.idx'; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Geofile.prototype, "extent", {
        /** extent of the geofile dataset */
        get: function () { return this.rtree.extent(); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Geofile, "all", {
        /** array off all geofile */
        get: function () { return Geofile.ALL.values(); },
        enumerable: true,
        configurable: true
    });
    /** method to find a geofile by it's name */
    Geofile.search = function (name) { return Geofile.ALL.get(name); };
    /** remove a geofile by it's name */
    Geofile.delete = function (name) { Geofile.ALL.delete(name); };
    /** remove all geofile */
    Geofile.clear = function () { Geofile.ALL.clear(); };
    Geofile.prototype.getFeature = function (rank, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.assertLoaded();
        if (rank < 0 || rank >= this.count) {
            return Promise.resolve(null);
        }
        return this.getFeature_(rank, options)
            .then(function (feature) {
            if (feature) {
                feature.bbox = gt.bbox_g(feature.geometry);
                feature.proj = _this.proj;
                feature.rank = rank;
                feature.geofile = _this;
                feature = _this.apply(feature, options);
            }
            return feature;
        });
    };
    Geofile.prototype.getFeatures = function (rank, count, options) {
        var _this = this;
        if (count === void 0) { count = 100; }
        if (options === void 0) { options = {}; }
        this.assertLoaded();
        if (rank < 0 || rank >= this.count) {
            return Promise.resolve([]);
        }
        if (count <= 0) {
            return Promise.resolve([]);
        }
        count = Math.min(count, this.count - rank);
        return this.getFeatures_(rank, count, options)
            .then(function (features) {
            var result = [];
            features.forEach(function (feature) {
                // feature.setId(this.name + '_' + rank);
                feature.proj = _this.proj;
                feature.rank = rank;
                feature.geofile = _this;
                feature = _this.apply(feature, options);
                if (feature) {
                    result.push(feature);
                }
                rank++;
            });
            return result;
        });
    };
    Geofile.prototype.getHandle = function (rank) {
        var pos = this.handles.getUint32(rank * HANDLE_SIZE);
        var len = this.handles.getUint32(rank * HANDLE_SIZE + 4);
        var tmin = this.handles.getUint8(rank * HANDLE_SIZE + 8);
        var tmax = this.handles.getUint8(rank * HANDLE_SIZE + 9);
        return { rank: rank, pos: pos, len: len, tmin: tmin, tmax: tmax };
    };
    /** internal method to init/construct a Geofile object */
    Geofile.prototype.init = function (opts) {
        if (opts === void 0) { opts = {}; }
        this['' + 'minscale'] = opts.minscale || 0;
        this['' + 'maxscale'] = opts.maxscale || 10000;
        this['' + 'name'] = opts.name || this.filename.split('\\').pop().split('/').pop();
        this['' + 'title'] = opts.title || this.name;
        this['' + 'group'] = opts.group || 'root';
        this['' + 'style'] = opts.style || Geofile.style;
        this['' + 'proj'] = opts.srs || 'EPSG:4326';
    };
    /**
     * assertion: check for loaded geosjon
     */
    Geofile.prototype.assertLoaded = function () {
        if (!this.loaded) {
            throw (new Error("geofile [" + this.filename + "] attemting to access data before loading"));
        }
    };
    /**
     * assertion: check for loaded geosjon
     */
    Geofile.prototype.assertindex = function (attribute, type) {
        var index = this.indexes.get(attribute + '/' + type);
        return index ? index : new Error("geofile [" + this.name + "] unable to " + type + " search attribute " + attribute + "  no index found");
    };
    /** internal method to load configuration file for Geofile object */
    Geofile.prototype.loadConf = function () {
        var _this = this;
        // try load configuration file
        return fs.FSFile.read(this.confname, fs.FSFormat.text)
            .then(function (data) {
            try {
                // tslint:disable-next-line:no-eval
                var conf = eval(data);
                _this.init(conf);
                return Promise.resolve();
            }
            catch (e) {
                return Promise.reject(new Error("geofile conf file " + _this.confname + " eval error: " + e.toString() + " !"));
            }
        })
            .catch(function (e) {
            console.log("geofile conf file " + _this.confname + " not found");
            return Promise.resolve();
        });
    };
    /** internal method to load all data indexes */
    Geofile.prototype.loadIndexes = function () {
        var _this = this;
        return fs.FSFile.read(this.idxname, fs.FSFormat.arraybuffer)
            .then(function (idxbuffer) {
            // read feature count and index count
            var dv = new DataView(idxbuffer, 0, 16);
            _this['' + 'count'] = dv.getUint32(8);
            var nbindex = dv.getUint32(12);
            _this.indexes = new Map();
            // load index metadata and data
            var td = new TextDecoder();
            dv = new DataView(idxbuffer.slice(16, 16 + nbindex * INDEX_MD_SIZE));
            var pos = 0;
            for (var i = 0; i < nbindex; i++) {
                var attribute = void 0, type = void 0, buffer = void 0, length_1 = void 0;
                attribute = td.decode(dv.buffer.slice(pos, pos + 50)).replace(/\000/g, '');
                pos += 50;
                type = td.decode(dv.buffer.slice(pos, pos + 10)).replace(/\000/g, '');
                pos += 10;
                buffer = dv.getUint32(pos);
                pos += 4;
                length_1 = dv.getUint32(pos);
                pos += 4;
                var idxdv = new DataView(idxbuffer, buffer, length_1);
                _this.indexes.set(attribute + '/' + GeofileIndexType[type], { attribute: attribute, type: GeofileIndexType[type], dv: idxdv });
                if (type === GeofileIndexType.handle) {
                    _this.handles = idxdv;
                }
                if (type === GeofileIndexType.rtree) {
                    _this.rtree = new binrtree_1.BinRtree(idxdv);
                }
            }
        });
    };
    /** internal method to set load status when loading is terminated */
    Geofile.prototype.loadTerminate = function () {
        this['' + 'loaded'] = (this.count > 0 && this.handles && this.indexes && this.rtree) ? true : false;
        return this.loaded ? Promise.resolve(this) : Promise.reject(new Error('Unable to load Geofile data files'));
    };
    /**
     * calculate for a given rank (feature) in a cluster its cluster bbox (minitile)
     * @param rank the rank of the feature
     * @param cluster the cluster where the rank was found
     * @returns the calculated bbox
     */
    Geofile.prototype.clusterBbox = function (rank, cluster) {
        var handle = this.getHandle(rank);
        var wtile = Math.abs(cluster[2] - cluster[0]) / 16;
        var htile = Math.abs(cluster[3] - cluster[1]) / 16;
        // tslint:disable-next-line:no-bitwise
        var ymin = (0xF & handle.tmin);
        // tslint:disable-next-line:no-bitwise
        var xmin = (handle.tmin >> 4);
        // tslint:disable-next-line:no-bitwise
        var ymax = (0xF & handle.tmax) + 1;
        // tslint:disable-next-line:no-bitwise
        var xmax = (handle.tmax >> 4) + 1;
        return [
            cluster[0] + (xmin * wtile),
            cluster[1] + (ymin * htile),
            cluster[0] + (xmax * wtile),
            cluster[1] + (ymax * htile)
        ];
    };
    Geofile.prototype.apply = function (feature, options) {
        if (options._filter && options._filter.some(function (func) { return !func(feature); })) {
            return undefined;
        }
        if (options.proj && options.proj !== feature.proj) {
            gt.transform_g(feature.geometry, feature.proj, options.proj);
        }
        if (options.filter && !options.filter(feature)) {
            return undefined;
        }
        if (options.action) {
            options.action(feature);
        }
        return feature;
    };
    Geofile.prototype.setFilter = function (opts, filter) {
        var options = opts.applyTo({ _filter: [] });
        options._filter.push(filter);
        return options;
    };
    Geofile.prototype.newCache = function () {
        return new Map();
    };
    Geofile.prototype.load = function () {
        var _this = this;
        var current = null;
        return this.loadConf().catch(function (e) { throw current ? e : new Error(current = e.message + '(during loadConf)'); })
            .then(function () { return _this.loadIndexes(); }).catch(function (e) { throw current ? e : new Error(current = e.message + '(during loadIndexes)'); })
            .then(function () { return _this.loadFeatures(); }).catch(function (e) { throw current ? e : new Error(current = e.message + '(during loadFeatures)'); })
            .then(function () { return _this.loadTerminate(); }).catch(function (e) { throw current ? e : new Error(current = e.message + '(during loadTerminate)'); });
    };
    Geofile.prototype.foreach = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var start = Date.now();
        return new Promise(function (resolve) {
            var loop = function (i) {
                if (i === void 0) { i = 0; }
                _this.assertLoaded();
                if (i < _this.count) {
                    return _this.getFeatures(i, 1000, options).then(function () { return loop(i + 1000); });
                }
                var elapsed = (Date.now() - start) / 1000;
                console.log("Geofile.foreach [" + _this.name + "]: " + _this.count + " o / " + Math.round(elapsed) + " s / " + Math.round(_this.count / elapsed) + " o/s");
                resolve(null);
            };
            loop();
        });
    };
    Geofile.prototype.bboxSearch = function (bbox, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.assertLoaded();
        var projbbox = options.proj ? gt.transform_e(bbox, this.proj, options.proj) : null;
        var start = Date.now();
        options = this.setFilter(options, function (feature) {
            var abbox = (feature.proj === options.proj) ? projbbox : bbox;
            var res = gt.intersects_eg(abbox, feature.geometry);
            return res;
        });
        // parcours de l'index geographique.
        var bboxlist = this.rtree.search(bbox).filter(function (ibbox) { return gt.intersects_ee(ibbox, bbox); });
        var promises = bboxlist.map(function (ibbox) {
            return _this.getFeatures(ibbox[4], ibbox[5], options);
        });
        var selectivity = Math.round(100 * bboxlist.reduce(function (p, c) { return p + c[5]; }, 0) / this.count);
        return Promise.cleanPromiseAll(promises)
            .then(function (features) {
            var elapsed = (Date.now() - start);
            var best = Math.round(100 * features.length / _this.count);
            var objsec = Math.round(features.length / (elapsed / 1000));
            console.log("Geofile.bboxSearch [" + _this.name + "]: " + features.length + " o / " + elapsed + " ms /  " + objsec + " obj/s sel: " + selectivity + "% (vs " + best + "%)");
            return features;
        });
    };
    Geofile.prototype.pointSearch = function (lon, lat, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.assertLoaded();
        var tol = options.tolerance ? options.tolerance : 0.00001;
        options = this.setFilter(options, function (feature) {
            var point = proj4_1.default(_this.proj, feature.proj).forward([lon, lat]);
            return gt.intersects_cg(point, feature.geometry);
        });
        return this.bboxSearch([lon - tol, lat - tol, lon + tol, lat + tol], options);
    };
    /**
     * search and return the nearest feature arround a point
     * @param gjspt a generic point
     * @param rorb raduis or bbox
     * @param options filter options
     */
    Geofile.prototype.nearestSearch = function (lon, lat, rorb, options) {
        if (options === void 0) { options = {}; }
        this.assertLoaded();
        var wgs84pt = proj4_1.default(this.proj, WGS84).forward([lon, lat]);
        var bbox;
        if (Array.isArray(rorb)) {
            bbox = rorb;
        }
        else {
            var unitpermeter = 1 / gt.meter_per_unit(this.proj);
            var wgs84r_1 = rorb * unitpermeter;
            bbox = [wgs84pt[0] - wgs84r_1, wgs84pt[1] - wgs84r_1, wgs84pt[0] + wgs84r_1, wgs84pt[1] + wgs84r_1];
            options = this.setFilter(options, function (feature) {
                var closest = gt.closest_cg([lon, lat], feature.geometry);
                var closest_wgs84 = proj4_1.default(feature.proj, WGS84).forward(closest);
                feature.distance = gt.distance_hs(wgs84pt, closest_wgs84);
                return (feature.distance <= wgs84r_1);
            });
        }
        return this.bboxSearch(bbox, options)
            .then(function (features) { return features.reduce(function (previous, current) {
            return !current ? previous : !previous ? current : (previous.distance < current.distance) ? previous : current;
        }); });
    };
    /**
     * starting with idwrank in the index and by incremental steps search for all the features
     * that match the compare function (stop when first matching fail occurs)
     * @param index search index
     * @param idxrank rank in the index
     * @param searched searched strings
     * @param compare comparison function
     * @param options filter options
     * @param found internal use for recursive calls
     */
    Geofile.prototype.next = function (index, idxrank, searched, compare, options, found) {
        var _this = this;
        if (found === void 0) { found = []; }
        if (idxrank < this.count) {
            var rank = index.dv.getUint32(idxrank * 4);
            return this.getFeature(rank)
                .then(function (feature) {
                var res = searched.some(function (search) { return compare(search, feature) === 0; });
                if (res) {
                    feature = _this.apply(feature, options);
                    if (feature) {
                        found.push(feature);
                    }
                    return _this.next(index, idxrank + 1, searched, compare, options, found);
                }
                return found;
            });
        }
        return Promise.resolve(found);
    };
    Geofile.prototype.binarySearch = function (idxdata, searched, compare, options, imin, imax) {
        var _this = this;
        if (imin === void 0) { imin = 0; }
        if (imax === void 0) { imax = (this.count - 1); }
        // is dichotomy terminated
        if (imax >= imin) {
            // calculate midpoint to cut set in half
            var imid_1 = Math.floor((imax + imin) / 2);
            var rank = idxdata.dv.getUint32(imid_1 * 4);
            return this.getFeature(rank).then(function (feature) {
                var promises = [];
                if (imin === imax) {
                    // end search reached
                    promises.push(_this.next(idxdata, imin, searched, compare, options));
                }
                else {
                    // constructing lower and upper subset (lsubset / usubset)
                    var lsubset_1 = [], usubset_1 = [];
                    // distribution on subsets
                    searched.forEach(function (key, i) { return (compare(key, feature) > 0) ? lsubset_1.push(searched[i]) : usubset_1.push(searched[i]); });
                    // preparing search promises for lower and upper subset
                    if (lsubset_1.length) {
                        promises.push(_this.binarySearch(idxdata, lsubset_1, compare, options, imid_1 + 1, imax));
                    }
                    if (usubset_1.length) {
                        promises.push(_this.binarySearch(idxdata, usubset_1, compare, options, imin, imid_1));
                    }
                }
                // running promises
                return Promise.cleanPromiseAll(promises)
                    .then(function (features) {
                    return features;
                });
            });
        }
        return Promise.resolve([]);
    };
    Geofile.prototype.attributeSearch = function (attr, values, options) {
        if (options === void 0) { options = {}; }
        var index = this.assertindex(attr, GeofileIndexType.ordered);
        if (index instanceof Error) {
            return Promise.reject(index);
        }
        var filter = function (feature) {
            return feature && values.some(function (v) { return v === feature.properties[attr]; });
        };
        var compare = function (key, feature) {
            return (feature && key === feature.properties[attr]) ? 0 : (key > feature.properties[attr]) ? 1 : -1;
        };
        options = this.setFilter(options, filter);
        return this.binarySearch(index, values, compare, options);
    };
    Geofile.prototype.fuzzySearch = function (attr, value, options) {
        if (options === void 0) { options = {}; }
        var index = this.assertindex(attr, GeofileIndexType.fuzzy);
        if (index instanceof Error) {
            return Promise.reject(index);
        }
        var maxlevens = options.maxlevenshtein ? options.maxlevenshtein : 5;
        var compare = function (k, f) { return k - f.properties[attr].fuzzyhash(); };
        var clean = value.clean();
        var hash = value.fuzzyhash();
        var values = String.fuzzyExtend(hash);
        values.push(hash);
        options = this.setFilter(options, function (f) { return clean.levenshtein(f.properties[attr].clean()) < maxlevens; });
        return this.binarySearch(index, values, compare, options)
            .then(function (features) {
            var sorted = [];
            if (features && features.length > 0) {
                var res = features.map(function (feature) { return ({ distance: clean.levenshtein(feature.properties[attr].clean()), feature: feature }); });
                sorted = res.sort(function (p1, p2) { return p1.distance - p2.distance; });
            }
            return sorted;
        });
    };
    /** Search with a dichotomic algorithm all ranks associated with an array of prefix
     * a rank found must have all prefixes associated
     * index data is an ordered array of tuple [ prefix:char[4], rank:uint32 ] (each tuple have 8 bytes)
    */
    Geofile.prototype.binaryPrefixSearch = function (index, arrpref, found, imin, imax) {
        if (found === void 0) { found = null; }
        if (imin === void 0) { imin = 0; }
        if (imax === void 0) { imax = index.dv.byteLength / 8; }
        // ----------------------------------------------------------------------------------------
        // dv dataview points to an ordered array of tuple [ prefix:char[4], rank:uint32 ]
        // this utility function return a tuple for a given tuple index
        // ----------------------------------------------------------------------------------------
        var getentry = function (dv, tuple) {
            var prefix = String.fromCharCode.apply(String, ([0, 1, 2, 3].map(function (c) { return dv.getUint8(tuple * 8 + c); })));
            var rank = dv.getUint32(tuple * 8 + 4);
            return { prefix: prefix, rank: rank };
        };
        // ----------------------------------------------------------------------------------------
        // prefix found from imin searching intersection with previously foundranks
        // ----------------------------------------------------------------------------------------
        var intersect = function (dv, previous) {
            arrpref.map(function (prefix) {
                var intersection = new Map();
                var len = Math.min(4, prefix.length);
                var size = dv.byteLength;
                var samepref = true;
                for (var tuple = imin; samepref && (tuple < dv.byteLength / 8); tuple++) {
                    var e = getentry(dv, tuple);
                    samepref = e.prefix.startsWith(prefix);
                    if (samepref && (!previous || previous.has(e.rank))) {
                        intersection.set(e.rank, prefix);
                    }
                }
                previous = intersection;
            });
            return previous;
        };
        // ----------------------------------------------------------------------------------------
        // test if array is empty
        if (imax < imin) {
            return new Map();
        }
        // calculate midpoint to divide set
        var imid = Math.floor((imax + imin) / 2);
        if (imin === imax) {
            return intersect(index.dv, found);
        }
        var entry = getentry(index.dv, imid);
        var usubset = [];
        var lsubset = [];
        arrpref.forEach(function (p) { return (p.substring(0, 4) > entry.prefix) ? usubset.push(p) : lsubset.push(p); });
        if (usubset.length) {
            found = this.binaryPrefixSearch(index, usubset, found, imid + 1, imax);
        }
        if (lsubset.length) {
            found = this.binaryPrefixSearch(index, lsubset, found, imin, imid);
        }
        return found;
    };
    Geofile.prototype.prefixSearch = function (attr, prefix, maxfeature) {
        var _this = this;
        if (maxfeature === void 0) { maxfeature = 100; }
        var index = this.assertindex(attr, GeofileIndexType.prefix);
        if (index instanceof Error) {
            return Promise.reject(index);
        }
        var arrpref = prefix.prefix();
        // on recherche la première entrée dans l'index pour chaque préfixe
        var found = this.binaryPrefixSearch(index, arrpref);
        // si un des préfixes n'a pas été trouvé aucun résultat
        if (found.size === 0) {
            return Promise.resolve([]);
        }
        // transformer les clés (rank) de la Map found en Array
        var features = [];
        var ranks = Array.from(found.keys());
        var i = 0;
        var filter = function (resolve, reject) {
            if (i >= ranks.length || features.length >= maxfeature) {
                return resolve(features);
            }
            _this.getFeature(ranks[i], {}).then(function (feature) {
                features.push(feature);
                i += 1;
                filter(resolve, reject);
            });
        };
        return new Promise(filter);
    };
    /**
     * get scale from resolution
     * @param resolution a resolution
     * @param projection the target map projectiion
     * @returns corresponding resolution for scale
     */
    Geofile.prototype.getScale = function (resolution, projection) {
        // const units = projection.getUnits();
        var dpi = 25.4 / 0.28;
        var mpu = gt.meter_per_unit(projection); // MBZ TODO A REVOIR CALCUL D'ECHELLE
        var scale = resolution * mpu * 39.37 * dpi;
        return scale;
    };
    /**
     * get resolution from scale
     * @param scale a scale
     * @param projection the target map projectiion
     * @returns corresponding resolution for scale
     */
    Geofile.prototype.getResolution = function (scale, projection) {
        // const units = projection.getUnits();
        var dpi = 25.4 / 0.28;
        var mpu = gt.meter_per_unit(projection);
        var resolution = scale / (mpu * 39.37 * dpi);
        return resolution;
    };
    Geofile.prototype.addIndexTiles = function (map, ol) {
        var tiles = [];
        var srcproj = this.proj;
        this.rtree._all(0, tiles);
        var features = tiles.map(function (tile) {
            var geometry = new ol.geom.Polygon([[
                    [tile[0], tile[1]],
                    [tile[2], tile[1]],
                    [tile[2], tile[3]],
                    [tile[0], tile[3]],
                    [tile[0], tile[1]]
                ]]);
            geometry.transform(srcproj, map.getView().getProjection());
            var feature = new ol.Feature({ num: tile[4] / 100, geometry: geometry });
            return feature;
        });
        var vectorSource = new ol.source.Vector({});
        var vlayer = new ol.layer.Vector({
            source: vectorSource,
            style: [new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'red',
                        width: 2
                    })
                })]
        });
        vectorSource.addFeatures(features);
        map.addLayer(vlayer);
        var tilelayer = new ol.layer.Tile({
            source: new ol.source.TileDebug({
                projection: 'EPSG:3857',
                tileGrid: ol.tilegrid.createXYZ({ maxZoom: 22 })
            })
        });
        map.addLayer(tilelayer);
    };
    /**
     * add this geofile to an openlayer Map as an ol.layer.Vector
     * @param map an openlayers 3+ Map
     * @param ol an openlayers 3+ global object
     */
    Geofile.prototype.addAsVector = function (map, ol) {
        var _this = this;
        var last_extent = ol.extent.createEmpty();
        var cache = this.newCache();
        var vsource;
        var format = new ol.format.GeoJSON();
        /** default style definition */
        var fill = new ol.style.Fill({
            color: 'rgba(255,255,255,0.4)'
        });
        var stroke = new ol.style.Stroke({
            color: '#3399CC',
            width: 1.25
        });
        var DEFAULT_STYLE = [
            new ol.style.Style({
                image: new ol.style.Circle({
                    fill: fill,
                    stroke: stroke,
                    radius: 5
                }),
                fill: fill,
                stroke: stroke
            })
        ];
        // we define a loader for vector source
        var loader = function (extent, resolution, proj) {
            if (ol.extent.equals(extent, last_extent)) {
                return;
            }
            last_extent = extent;
            var scale = _this.getScale(resolution, proj);
            extent = (proj === _this.proj) ? extent : ol.proj.transformExtent(extent, proj, _this.proj);
            if ((!_this.maxscale || scale < _this.maxscale) && (!_this.minscale || scale >= _this.minscale)) {
                _this.bboxSearch(extent, { proj: proj, cache: cache })
                    .then(function (features) {
                    vsource.clear();
                    vsource.addFeatures(features.map(function (f) { return format.readFeature(f); }));
                });
            }
            else {
                vsource.clear();
            }
        };
        vsource = new ol.source.Vector({ useSpatialIndex: false, strategy: ol.loadingstrategy.bbox, loader: loader });
        // layer created an added to map
        var vlayer = new ol.layer.Vector({
            renderMode: 'image',
            visible: true,
            source: vsource,
            style: this.style ? this.style : DEFAULT_STYLE,
            minResolution: this.getResolution(this.minscale, map.getView().getProjection()),
            maxResolution: this.getResolution(this.maxscale, map.getView().getProjection())
        });
        map.addLayer(vlayer);
        return vlayer;
    };
    /** if true time statistics are logged */
    Geofile.TIMEON = true;
    /** default style of Geofile class when not given */
    Geofile.style = null;
    /* geofile objects set */
    Geofile.ALL = new Map();
    return Geofile;
}());
exports.Geofile = Geofile;
var GeofileBinaryParser = /** @class */ (function () {
    function GeofileBinaryParser(filename, type, mandatory) {
        this.collection = [];
        this.mandatory = true;
        this.mdate = null;
        this.offset = 0; // offset in the file of the first byte in buffer
        this.read = 0; // bytes read (but not treated between offset and read )
        this.length = 0; // waiting for length bytes before calling callback
        this.buffer = []; // buffered data
        this.filename = filename;
        this.type = type;
        this.mandatory = mandatory;
    }
    /**
     * data to be provided to the parser.
     * @param arrbuf data array buffer to be pushed to the parser
     */
    GeofileBinaryParser.prototype.onData = function (arrbuf) {
        for (var i = 0, dv_1 = new DataView(arrbuf); i < dv_1.byteLength; i++) {
            this.buffer.push(dv_1.getUint8(i));
        }
        ;
        while (this.length <= this.buffer.length) {
            // waited length data reached calling callback
            var arraybuf = new ArrayBuffer(this.length);
            var dv = new DataView(arraybuf);
            for (var i = 0; i < dv.byteLength; i++) {
                dv.setUint8(i, this.buffer[i]);
            }
            this.buffer = this.buffer.slice(this.length);
            this.read += dv.byteLength;
            this.callback(dv);
            this.offset += dv.byteLength;
        }
    };
    /**
     * Register a callback and length of waited data bytes
     * @param size waited bytes length
     * @param callback callback to be called when waited size reaxhed by parsing
     */
    GeofileBinaryParser.prototype.wait = function (size, callback) {
        if (size < 0)
            throw new Error("Non sense , never wait for less than 1 byte");
        this.length = size;
        this.callback = callback;
    };
    GeofileBinaryParser.prototype.skip = function (bytes, next) {
        this.wait(bytes, function () { return next(); });
    };
    return GeofileBinaryParser;
}());
exports.GeofileBinaryParser = GeofileBinaryParser;
var GeofileIndexer = /** @class */ (function () {
    function GeofileIndexer(idxlist, parsers) {
        if (idxlist === void 0) { idxlist = []; }
        /** header total header size
         * tag:     char 8 bytes for tag,
         * count:   uint 4 bytes for feature count,
         * index:   uint 4 bytes for index count
         */
        this.HEADER_TSIZE = 16;
        /** tag for file type checking geojson index  */
        this.HEADER_TAG = 'GEOFILEX'; // .map(function (c) { return c.charCodeAt(0); }));
        /** index metadata entry size
         * attribute:   char 50 bytes for attribute name,
         * type:        char 10 bytes for index type,
         * length:      uint 4 bytes for index data offset,
         * offset:      uint 4 bytes for index data length
         */
        this.METADAS_RSIZE = 68;
        this.idxlist = idxlist;
        this.count = 0;
        this.indexes = [];
        this.parsers = parsers;
    }
    Object.defineProperty(GeofileIndexer.prototype, "METADATAS_TSIZE", {
        /** total metadata size  (index count * METADA_RSIZE )*/
        get: function () { return this.METADAS_RSIZE * (this.idxlist.length + 2); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeofileIndexer.prototype, "HANDLES_RSIZE", {
        /** handles entry size
         * offset: uint 4 bytes offset in geojson file of the parsable GEOJSON object "{...}"
         * length: uint 4 bytes length of the GEOJSON parsable object
         * xminitile: uint 1 byte minitile x coordinate
         * yminitile: uint 1 byte minitile y coordinate
         */
        get: function () { return 10; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeofileIndexer.prototype, "RTREE_CLUSTER_SIZE", {
        /** features in rtree are grouped by RTREE_CLUSTER_SIZE features */
        get: function () { return 200; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeofileIndexer.prototype, "INDEX_NEXT_OFFSET", {
        get: function () {
            if (this.indexes.length > 0) {
                var lastidx = this.indexes[this.indexes.length - 1];
                return lastidx.offset + lastidx.buffer.byteLength;
            }
            return this.HEADER_TSIZE + this.METADATAS_TSIZE;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeofileIndexer.prototype, "indexfilename", {
        get: function () { return this.parsers[0].filename.replace(/\.[^\.]*$/, '') + '.idx'; },
        enumerable: true,
        configurable: true
    });
    /** usage is ex: Geofile.index(filename, idxlist, new GeojsonParser()); => promise*/
    GeofileIndexer.index = function (idxlist, parsers) {
        if (idxlist === void 0) { idxlist = []; }
        // create the indexer and start parsing
        var indexer = new GeofileIndexer(idxlist, parsers);
        return indexer.parseAll();
    };
    GeofileIndexer.prototype.parseAll = function () {
        var _this = this;
        var start = Date.now();
        // check existence of mandatory files 
        return Promise.all(this.parsers.map(function (p) { return fs.FSFile.metadata(p.filename).catch(function () { return null; }); }))
            .then(function (metadatas) {
            if (metadatas.some(function (m) { return m === undefined || m === null; })) {
                throw new Error("missing mandatory file " + _this.parsers[metadatas.findIndex(function (m) { return m; })].filename);
            }
            _this.parsers.forEach(function (parser, i) { return parser.mdate = metadatas[i].modificationTime; });
            return fs.FSFile.metadata(_this.indexfilename);
        })
            .then(function (metadata) {
            if (metadata && _this.parsers.every(function (parser) { return parser.mdate < metadata.modificationTime; })) {
                console.log("geofile index file " + _this.indexfilename + " indexes up-to-date");
                return null;
            }
            else {
                // loop on each file to parse
                return _this.stream().then(function (_) {
                    // all files parsed then collect data, build and write index
                    _this.data = _this.parsers[0].collection;
                    _this.count = _this.parsers[0].collection.length;
                    if (_this.parsers[1]) {
                        _this.data.forEach(function (pitem, i) { return pitem.properties = _this.parsers[1].collection[i].properties; });
                    }
                    _this.buildIndex();
                    return _this.write().then(function (_) {
                        var time = Date.now() - start;
                        console.log("geofile index file " + _this.indexfilename + " wrote  (" + _this.count + " features / " + time + "ms)");
                    });
                });
            }
        });
    };
    /**
     * read the data from all the files to parse and write the data to the parsers
     * @param datafile datafile structure
     * @param i index in filelist of the datafile
     */
    GeofileIndexer.prototype.stream = function (i) {
        var _this = this;
        if (i === void 0) { i = 0; }
        if (i < this.parsers.length) {
            var parser_1 = this.parsers[i];
            return fs.FSFile.stream(parser_1.filename, fs.FSFormat.arraybuffer, function (data) { parser_1.onData(data); })
                .then(function () { return _this.stream(++i); });
        }
        ;
        return Promise.resolve();
    };
    GeofileIndexer.prototype.buildIndex = function () {
        this.buildHeader();
        this.buildHandles();
        this.builRtree();
        this.buildAttributes();
        this.buildMetadata();
    };
    GeofileIndexer.prototype.buildHeader = function () {
        this.header = new ArrayBuffer(this.HEADER_TSIZE);
        var dv = new DataView(this.header);
        this.HEADER_TAG.split('').forEach(function (c, i) { return dv.setUint8(i, c.charCodeAt(0)); });
        dv.setUint32(this.HEADER_TAG.length, this.count);
        dv.setUint32(this.HEADER_TAG.length + 4, this.idxlist.length + 2);
    };
    GeofileIndexer.prototype.buildHandles = function () {
        var _this = this;
        if (!this.data) {
            return;
        }
        this.handles = new DataView(new ArrayBuffer(this.HANDLES_RSIZE * this.count));
        this.clusters = [];
        this.data.forEach(function (f) {
            var offset = _this.HANDLES_RSIZE * f.rank;
            _this.handles.setUint32(offset, f.pos);
            _this.handles.setUint32(offset + 4, f.len);
            // minitile values will calculated at indexGeometry (default to full tile)
            _this.handles.setUint8(offset + 8, 0x00);
            _this.handles.setUint8(offset + 9, 0xFF);
        });
        var metadata = {
            attribute: 'rank',
            type: 'handle',
            buffer: this.handles.buffer,
            offset: this.INDEX_NEXT_OFFSET,
            length: this.handles.byteLength
        };
        this.indexes.push(metadata);
        console.log("geojson handles    " + this.indexfilename + " indexed / handles");
    };
    GeofileIndexer.prototype.bboxextend = function (bounds, bbox) {
        if (bbox) {
            if (bounds[0] == null || bbox[0] < bounds[0]) {
                bounds[0] = bbox[0];
            }
            if (bounds[1] == null || bbox[1] < bounds[1]) {
                bounds[1] = bbox[1];
            }
            if (bounds[2] == null || bbox[2] > bounds[2]) {
                bounds[2] = bbox[2];
            }
            if (bounds[3] == null || bbox[3] > bounds[3]) {
                bounds[3] = bbox[3];
            }
        }
        bounds[5]++;
    };
    GeofileIndexer.prototype.builRtree = function () {
        for (var i = 0; i < this.count; i += this.RTREE_CLUSTER_SIZE) {
            var bounds = [null, null, null, null, i, 0];
            for (var j = i; j < i + this.RTREE_CLUSTER_SIZE && j < this.count; j++) {
                var feature = this.data[j];
                var bbox = feature.bbox;
                this.bboxextend(bounds, bbox);
            }
            // check if some bounds is null
            if (!bounds.some(function (val) { return val === null; })) {
                this.setMinitile(bounds);
                this.clusters.push(bounds);
            }
        }
        var tree = new binrbush_1.binrbush();
        tree.load(this.clusters);
        var buffer = tree.toBinary();
        var metadata = {
            attribute: 'geometry',
            type: 'rtree',
            buffer: buffer,
            offset: this.INDEX_NEXT_OFFSET,
            length: buffer.byteLength
        };
        this.indexes.push(metadata);
        console.log("geojson rtree      " + this.indexfilename + " indexed / geometry");
    };
    GeofileIndexer.prototype.setMinitile = function (cluster) {
        if (!this.handles) {
            return;
        }
        var wtile = Math.abs(cluster[2] - cluster[0]) / 16;
        var htile = Math.abs(cluster[3] - cluster[1]) / 16;
        var xmin, ymin, xmax, ymax, pos, tmin, tmax, feature, bbox;
        var from = cluster[4];
        var to = cluster[4] + cluster[5];
        for (var rank = from; rank < to; rank++) {
            feature = this.data[rank];
            bbox = feature.bbox;
            if (bbox) {
                xmin = Math.floor(Math.abs(bbox[0] - cluster[0]) / wtile);
                xmax = Math.floor(Math.abs(bbox[2] - cluster[0]) / wtile);
                ymin = Math.floor(Math.abs(bbox[1] - cluster[1]) / htile);
                ymax = Math.floor(Math.abs(bbox[3] - cluster[1]) / htile);
                if (wtile === 0 || isNaN(xmax) || xmax > 15) {
                    xmax = 15;
                }
                if (htile === 0 || ymax > 15) {
                    ymax = 15;
                }
                if (wtile === 0 || isNaN(xmin)) {
                    xmin = 0;
                }
                if (htile === 0 || isNaN(ymin)) {
                    ymin = 0;
                }
                if (xmin > 15) {
                    xmin = 15;
                }
                if (ymin > 15) {
                    ymin = 15;
                }
                // tslint:disable-next-line:no-bitwise
                tmin = (xmin << 4) + ymin;
                // tslint:disable-next-line:no-bitwise
                tmax = (xmax << 4) + ymax;
                pos = rank * this.HANDLES_RSIZE;
                this.handles.setUint8(pos + 8, tmin);
                this.handles.setUint8(pos + 9, tmax);
            }
        }
    };
    GeofileIndexer.prototype.buildMetadata = function () {
        var _this = this;
        // attribute: 50 bytes (string) name of the indexed attribute ('rank' for handle and 'geometry' for geometry)
        // type: 10 bytes (string) index type (handle,rtree,ordered,fuzzy)
        // buffer: 4 bytes (uint32) offset du debut du buffer de l'index
        // length: 4 bytes (uint32) longueur du buffer de l'index
        var ATTR_OFFSET = 0;
        var TYPE_OFFSET = 50;
        var OFFS_OFFSET = 60;
        var LEN_OFFSET = 64;
        this.metadata = new ArrayBuffer(this.METADAS_RSIZE * this.indexes.length);
        var dv = new DataView(this.metadata);
        var offset = 0;
        this.indexes.forEach(function (index, i) {
            for (var c = 0; c < _this.METADAS_RSIZE; c++) {
                dv.setUint8(offset + c, 0);
            }
            index.attribute.split('').forEach(function (vcar, icar) { return dv.setUint8(offset + ATTR_OFFSET + icar, vcar.charCodeAt(0)); });
            index.type.split('').forEach(function (vcar, icar) { return dv.setUint8(offset + TYPE_OFFSET + icar, vcar.charCodeAt(0)); });
            dv.setUint32(offset + OFFS_OFFSET, index.offset);
            dv.setUint32(offset + LEN_OFFSET, index.length);
            offset += _this.METADAS_RSIZE;
        });
    };
    GeofileIndexer.prototype.buildAttributes = function () {
        // Creation des index Attributs
        for (var i = 0; i < this.idxlist.length; i++) {
            var attr = this.idxlist[i].attribute;
            var type = this.idxlist[i].type;
            switch (type) {
                case 'ordered':
                    this.buildOrderedIndex(attr);
                    break;
                case 'fuzzy':
                    this.buildFuzzyIndex(attr);
                    break;
                case 'prefix':
                    this.buildPrefixIndex(attr);
                    break;
                case 'rtree':
                case 'handle':
                    break;
                default: throw new Error("geofile index file " + this.indexfilename + " undefined index type  \"" + type + "\" for attribute \"" + attr + "\"");
            }
        }
    };
    GeofileIndexer.prototype.buildOrderedIndex = function (attr) {
        var attlist = [];
        for (var i = 0; i < this.count; i++) {
            var feature = this.data[i];
            var val = feature.properties[attr];
            attlist.push({ value: val, rank: i });
        }
        // on ordonne sur les valeurs de l'attribut
        attlist.sort(function (a, b) { return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : 0; });
        var buf = new ArrayBuffer(4 * attlist.length);
        var dv = new DataView(buf);
        attlist.forEach(function (att, i) {
            dv.setUint32(i * 4, att.rank);
            // console.log(`${att.rank} ==> ${att.value}`)
        });
        var metadata = {
            attribute: attr,
            type: 'ordered',
            buffer: buf,
            offset: this.INDEX_NEXT_OFFSET,
            length: buf.byteLength
        };
        console.log("geojson ordered    " + this.indexfilename + " indexed / " + attr);
        this.indexes.push(metadata);
    };
    GeofileIndexer.prototype.buildFuzzyIndex = function (attr) {
        var attlist = [];
        for (var i = 0; i < this.count; i++) {
            var feature = this.data[i];
            var val = feature.properties[attr];
            var hash = val ? val.fuzzyhash() : 0;
            attlist.push({ hash: hash, rank: i });
        }
        // we sort on fuzzyhash value
        attlist.sort(function (a, b) { return (a.hash < b.hash) ? -1 : (a.hash > b.hash) ? 1 : 0; });
        var buf = new ArrayBuffer(4 * attlist.length);
        var dv = new DataView(buf);
        attlist.forEach(function (att, i) { return dv.setUint32(i * 4, att.rank); });
        var metadata = {
            attribute: attr,
            type: 'fuzzy',
            buffer: buf,
            offset: this.INDEX_NEXT_OFFSET,
            length: buf.byteLength
        };
        this.indexes.push(metadata);
        console.log("geojson fuzzy      " + this.indexfilename + " indexed / " + attr);
    };
    GeofileIndexer.prototype.buildPrefixIndex = function (attr) {
        // collecting prefix tuples
        var preflist = [];
        var _loop_1 = function (i) {
            var feature = this_1.data[i];
            var val = feature.properties[attr];
            var wlist = val ? (val + '').wordlist() : [];
            // console.log(val); console.log(wlist);
            wlist.forEach(function (w) { return preflist.push({ value: w.substring(0, 4), rank: i }); });
        };
        var this_1 = this;
        for (var i = 0; i < this.count; i++) {
            _loop_1(i);
        }
        // we sort on prefix
        preflist.sort(function (a, b) { return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : (a.rank - b.rank); });
        var buf = new ArrayBuffer(8 * preflist.length);
        var dv = new DataView(buf);
        preflist.forEach(function (att, i) {
            [32, 32, 32, 32].forEach(function (c, idx) { return dv.setUint8(i * 8 + idx, c); }); // white padding
            att.value.split('').forEach(function (c, idx) { return dv.setUint8(i * 8 + idx, c.charCodeAt(0)); });
            dv.setUint32(i * 8 + 4, att.rank);
        });
        var metadata = {
            attribute: attr,
            type: 'prefix',
            buffer: buf,
            offset: this.INDEX_NEXT_OFFSET,
            length: buf.byteLength
        };
        this.indexes.push(metadata);
        console.log("geojson prefix     " + this.indexfilename + " indexed / " + attr);
    };
    GeofileIndexer.prototype.write = function () {
        var total = this.header.byteLength + this.metadata.byteLength + this.indexes.reduce(function (p, c) { return p + c.buffer.byteLength; }, 0);
        var buf = new ArrayBuffer(total);
        var target = new Uint8Array(buf);
        var offset = 0;
        // copying data in one buffer 
        (new Uint8Array(this.header)).forEach(function (val, i) { return target[offset++] = val; });
        (new Uint8Array(this.metadata)).forEach(function (val, i) { return target[offset++] = val; });
        ;
        this.indexes.forEach(function (index) {
            (new Uint8Array(index.buffer)).forEach(function (val, i) { return target[offset++] = val; });
        });
        return fs.FSFile.write(this.indexfilename, buf);
    };
    return GeofileIndexer;
}());
exports.GeofileIndexer = GeofileIndexer;
//# sourceMappingURL=geofile.js.map