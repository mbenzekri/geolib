"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var proj4_1 = require("proj4");
/**
 * simple geometric 2D calculation tools on Geojson geometries
 * keep this libray simple , no complex data structures
 * c: coordinate is array [x, y] of type number[]
 * s: segment is expressed by two coordinates, a start coordinate and an end coordinate each of type number[]
 * e: extent is array [xmin, ymin, xmax, ymax] of type number[];
 * mc: multi point/coordinate is array of coordinate of type number[][]
 * l: linestring is array of coordinate of type number[][]
 * ml: multi linestring is array of linestring of type number[][][]
 * lr: linearring is array of coordinate of type number[][] (first and last coordinates are equals )
 * p: polygon is array of linearring of type number[][][] (first linearring is exterior ring, subsequent are interior rings)
 * mp: multi polygon is array of polygon of type number[][][][]
 */
var GeometryType;
(function (GeometryType) {
    GeometryType["Point"] = "Point";
    GeometryType["MultiPoint"] = "MultiPoint";
    GeometryType["LineString"] = "LineString";
    GeometryType["MultiLineString"] = "MultiLineString";
    GeometryType["Polygon"] = "Polygon";
    GeometryType["MultiPolygon"] = "MultiPolygon";
    GeometryType["GeometryCollection"] = "GeometryCollection";
})(GeometryType = exports.GeometryType || (exports.GeometryType = {}));
function clone_a(element) {
    return (Array.isArray(element)) ? element.map(function (item) { return clone_a(item); }) : element;
}
/**
 * clone a geometry
 */
function clone_g(geom) {
    var ngeom = {
        type: geom.type,
    };
    if (geom.coordinates) {
        ngeom.coordinates = clone_a(geom.coordinates);
    }
    if (geom.geometries) {
        ngeom.geometries = geom.geometries.map(function (g) { return clone_g(g); });
    }
    return ngeom;
}
exports.clone_g = clone_g;
/**
 * calculate the meter per unit factor for a projection along the equator
 * caution: the projection must be valid over the whole world
 * @param proj a projection code (ex: 'EPSG4326')
 */
function meter_per_unit(proj) {
    var p1 = proj4_1.default('EPSG:4326', proj, [-180, 0]);
    var p2 = proj4_1.default('EPSG:4326', proj, [+180, 0]);
    var dist = Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]));
    var tometer = 40075017 / dist;
    return tometer;
}
exports.meter_per_unit = meter_per_unit;
function transform_e(extent, src, dest) {
    var t = proj4_1.default(src, dest);
    var linestr = [
        t.forward([extent[0], extent[1]]),
        t.forward([extent[2], extent[1]]),
        t.forward([extent[2], extent[3]]),
        t.forward([extent[0], extent[3]]),
    ];
    var xmin = Math.min(linestr[0][0], linestr[1][0], linestr[2][0], linestr[3][0]);
    var xmax = Math.max(linestr[0][0], linestr[1][0], linestr[2][0], linestr[3][0]);
    var ymin = Math.min(linestr[0][1], linestr[1][1], linestr[2][1], linestr[3][1]);
    var ymax = Math.max(linestr[0][1], linestr[1][1], linestr[2][1], linestr[3][1]);
    return [xmin, ymin, xmax, ymax];
}
exports.transform_e = transform_e;
/** Haversine distance between to [lon, lat] coodinates */
function distance_hs(c1, c2) {
    var radius = 6378137;
    var lat1 = c1[1] * Math.PI / 180;
    var lat2 = c2[1] * Math.PI / 180;
    var deltaLatBy2 = (lat2 - lat1) / 2;
    var deltaLonBy2 = ((c2[0] - c1[0]) * Math.PI / 180) / 2;
    var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
        Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) *
            Math.cos(lat1) * Math.cos(lat2);
    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
exports.distance_hs = distance_hs;
function distance_sq(coord0, coord1) {
    return (coord0[0] - coord1[0]) * (coord0[0] - coord1[0]) + (coord0[1] - coord1[1]) * (coord0[1] - coord1[1]);
}
exports.distance_sq = distance_sq;
function foreach_cg(geom, callback) {
    var walk = function (a) {
        return !Array.isArray(a) ? null : a.length >= 2 && (typeof a[0] === 'number') && (typeof a[1] === 'number') ? callback(a) : a.forEach(walk);
    };
    if (geom.type !== GeometryType.GeometryCollection)
        return walk(geom.coordinates);
    geom.geometries.forEach(function (igeom) { return foreach_cg(igeom, callback); });
}
exports.foreach_cg = foreach_cg;
function bbox_g(geom) {
    var bbox = [Infinity, Infinity, -Infinity, -Infinity];
    foreach_cg(geom, function (p) {
        if (p[0] < bbox[0])
            bbox[0] = p[0];
        if (p[0] > bbox[2])
            bbox[2] = p[0];
        if (p[1] < bbox[1])
            bbox[1] = p[1];
        if (p[1] > bbox[3])
            bbox[3] = p[1];
    });
    return bbox;
}
exports.bbox_g = bbox_g;
function transform_g(geom, src, dest) {
    var t = proj4_1.default(src, dest);
    foreach_cg(geom, function (srcpt) {
        var destpt = t.forward(srcpt);
        srcpt[0] = destpt[0];
        srcpt[1] = destpt[1];
    });
    return geom;
}
exports.transform_g = transform_g;
/** intersect extent vs extent */
function intersects_ee(extent0, extent1) {
    return !(extent1[2] < extent0[0]
        || extent1[0] > extent0[2]
        || extent1[3] < extent0[1]
        || extent1[1] > extent0[3]);
}
exports.intersects_ee = intersects_ee;
/** intersect extent vs coordinate */
function intersects_ec(extent, coord) {
    return coord[0] <= extent[2]
        && coord[1] <= extent[3]
        && coord[0] >= extent[0]
        && coord[1] >= extent[1];
}
exports.intersects_ec = intersects_ec;
function intersects_emc(extent, coords) {
    return coords.some(function (coord) { return intersects_ec(extent, coord); });
}
exports.intersects_emc = intersects_emc;
/** intersect extent vs segment  */
function intersects_es(extent, start, end, tolx, toly) {
    if (tolx === void 0) { tolx = 0; }
    if (toly === void 0) { toly = tolx; }
    var dx = end[0] - start[0];
    var dy = end[1] - start[1];
    var aabbpx = (extent[0] + extent[2]) / 2;
    var aabbpy = (extent[1] + extent[3]) / 2;
    var aabbhx = Math.abs((extent[0] - extent[2]) / 2);
    var aabbhy = Math.abs((extent[1] - extent[3]) / 2);
    var scaleX = 1.0 / dx;
    var scaleY = 1.0 / dy;
    var signX = Math.sign(scaleX);
    var signY = Math.sign(scaleY);
    var nearTimeX = (aabbpx - signX * (aabbhx + tolx) - start[0]) * scaleX;
    var nearTimeY = (aabbpy - signY * (aabbhy + toly) - start[1]) * scaleY;
    var farTimeX = (aabbpx + signX * (aabbhx + tolx) - start[0]) * scaleX;
    var farTimeY = (aabbpy + signY * (aabbhy + toly) - start[1]) * scaleY;
    if (nearTimeX > farTimeY || nearTimeY > farTimeX) {
        return false;
    }
    var nearTime = nearTimeX > nearTimeY ? nearTimeX : nearTimeY;
    var farTime = farTimeX < farTimeY ? farTimeX : farTimeY;
    if (nearTime >= 1 || farTime <= 0) {
        return false;
    }
    return true;
}
exports.intersects_es = intersects_es;
/** intersect extent vs linestring  */
function intersects_el(extent, linestring, tolx, toly) {
    if (tolx === void 0) { tolx = 0; }
    if (toly === void 0) { toly = tolx; }
    return linestring.some(function (p, i, a) { return (i + 1 < a.length) && intersects_es(extent, p, a[i + 1], tolx, toly); });
}
exports.intersects_el = intersects_el;
/** intersect extent vs multilinestring */
function intersects_eml(extent, mlinestring, tolx, toly) {
    if (tolx === void 0) { tolx = 0; }
    if (toly === void 0) { toly = tolx; }
    return mlinestring.some(function (ls, i, a) { return intersects_el(extent, ls, tolx, toly); });
}
exports.intersects_eml = intersects_eml;
/** intersect extent vs linearring */
function intersects_elr(extent, linearring) {
    // one segment of linearring intersect extent
    if (intersects_el(extent, linearring))
        return true;
    var center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    return intersects_clr(center, linearring);
}
exports.intersects_elr = intersects_elr;
/** contains  linearring extent */
function contains_lre(linearring, extent) {
    // one segment of linearring intersect extent
    if (intersects_el(extent, linearring))
        return false;
    var center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    return intersects_clr(center, linearring);
}
exports.contains_lre = contains_lre;
/** intersect extent vs polygon */
function intersects_ep(extent, polygon) {
    // polygon exterior must intersect extent but not be fully inside an interior ring
    var intext = intersects_elr(extent, polygon[0]);
    var inthole = polygon.some(function (lr, i) { return (i === 0) ? false : contains_lre(lr, extent); });
    return intext && !inthole;
}
exports.intersects_ep = intersects_ep;
/** intersect extent vs polygon */
function intersects_emp(extent, mpolygon) {
    return mpolygon.some(function (p) { return intersects_ep(extent, p); });
}
exports.intersects_emp = intersects_emp;
/** intersect extent vs geometry */
function intersects_eg(extent, geom) {
    switch (geom.type) {
        case GeometryType.Point: return intersects_ec(extent, geom.coordinates);
        case GeometryType.MultiPoint: return intersects_emc(extent, geom.coordinates);
        case GeometryType.LineString: return intersects_el(extent, geom.coordinates);
        case GeometryType.MultiLineString: return intersects_eml(extent, geom.coordinates);
        case GeometryType.Polygon: return intersects_ep(extent, geom.coordinates);
        case GeometryType.MultiPolygon: return intersects_emp(extent, geom.coordinates);
        case GeometryType.GeometryCollection: return geom.geometries.some(function (igeom) { return intersects_eg(extent, igeom); });
    }
    return false;
}
exports.intersects_eg = intersects_eg;
/** intersect segment vs point */
function intersects_sc(start, end, point) {
    var dx = end.x - start.x;
    var liesInXDir;
    if (dx === 0) {
        liesInXDir = (point.x == start.x);
    }
    else {
        var t_1 = (point.x - start.x) / dx;
        liesInXDir = (t_1 >= 0 && t_1 <= 1);
    }
    if (!liesInXDir)
        return false;
    var dy = end.y - start.y;
    if (dy === 0)
        return (point.y == start.y);
    var t = (point.y - start.y) / dy;
    return (t >= 0 && t <= 1);
}
exports.intersects_sc = intersects_sc;
/** intersect segment vs point */
function intersects_ss(start0, end0, start1, end1) {
    var hit = null;
    var dx1 = end0[0] - start0[0];
    var dy1 = end0[1] - start0[1];
    var dx2 = end1[0] - start1[0];
    var dy2 = end1[1] - start1[1];
    var dx3 = start0[0] - start1[0];
    var dy3 = start0[1] - start1[1];
    var d = dx1 * dy2 - dx2 * dy1;
    if (d !== 0) {
        var s = dx1 * dy3 - dx3 * dy1;
        if ((s <= 0 && d < 0 && s >= d) || (s >= 0 && d > 0 && s <= d)) {
            var t = dx2 * dy3 - dx3 * dy2;
            if ((t <= 0 && d < 0 && t > d) || (t >= 0 && d > 0 && t < d)) {
                t = t / d;
                hit = [start0[0] + t * dx1, start0[1] + t * dy1];
            }
        }
    }
    return hit;
}
exports.intersects_ss = intersects_ss;
/** intersect coordinate vs coordinate  */
function intersects_cc(coord0, coord1, tolx, toly) {
    if (tolx === void 0) { tolx = 0; }
    if (toly === void 0) { toly = tolx; }
    return intersects_ec([coord1[0] - tolx, coord1[1] - toly, coord1[0] + tolx, coord1[1] + toly], coord0);
}
exports.intersects_cc = intersects_cc;
function intersects_cmc(coord, coords, tolx, toly) {
    if (tolx === void 0) { tolx = 0; }
    if (toly === void 0) { toly = tolx; }
    return coords.some(function (scoord) { return intersects_cc(coord, scoord, tolx, toly); });
}
exports.intersects_cmc = intersects_cmc;
/** intersect point vs linestring */
function intersects_cl(coord, linestring) {
    return linestring.some(function (p, i) { return (i + 1 < linestring.length) && intersects_sc(linestring[i], linestring[+1], coord); });
}
exports.intersects_cl = intersects_cl;
/** intersect point vs multilinestring */
function intersects_cml(coord, mlinestring) {
    return mlinestring.some(function (ls, i) { return intersects_cl(coord, ls); });
}
exports.intersects_cml = intersects_cml;
/**
 * intersect linear ring vs coordinate
 * use winding number algorithm :  https://en.wikipedia.org/wiki/Winding_number
 */
function intersects_clr(coord, linearring) {
    function isLeft(pt0, pt1, pt2) {
        var res = ((pt1[0] - pt0[0]) * (pt2[1] - pt0[1]) - (pt2[0] - pt0[0]) * (pt1[1] - pt0[1]));
        return res;
    }
    var x = coord[0], y = coord[1];
    var wn = 0;
    for (var i = 0, j = linearring.length - 1; i < linearring.length; j = i++) {
        var xi = linearring[i][0], yi = linearring[i][1];
        var xj = linearring[j][0], yj = linearring[j][1];
        if (yj <= y) {
            if (yi > y) {
                if (isLeft([xj, yj], [xi, yi], [x, y]) > 0) {
                    wn++;
                }
            }
        }
        else {
            if (yi <= y) {
                if (isLeft([xj, yj], [xi, yi], [x, y]) < 0) {
                    wn--;
                }
            }
        }
    }
    return wn != 0;
}
exports.intersects_clr = intersects_clr;
;
function intersects_cp(coord, polygon) {
    // polygon exterior must intersect point but not holes
    var intext = intersects_clr(coord, polygon[0]);
    var inthole = polygon.some(function (lr, i) { return (i === 0) ? false : intersects_clr(coord, lr); });
    return intext && !inthole;
}
exports.intersects_cp = intersects_cp;
function intersects_cmp(coord, mpolygon) {
    return mpolygon.some(function (p) { return intersects_cp(coord, p); });
}
exports.intersects_cmp = intersects_cmp;
function closest_cmc(coord, mpoint) {
    var dist = Infinity;
    var closest = null;
    mpoint.forEach(function (icoord) {
        var idist = (coord[0] - icoord[0]) * (coord[0] - icoord[0]) + (coord[1] - icoord[1]) * (coord[1] - icoord[1]);
        if (idist < dist) {
            dist = idist;
            closest = icoord;
        }
    });
    return closest;
}
exports.closest_cmc = closest_cmc;
function intersects_cg(coord, geom) {
    switch (geom.type) {
        case GeometryType.Point: return intersects_cc(coord, geom.coordinates);
        case GeometryType.MultiPoint: return intersects_cmc(coord, geom.coordinates);
        case GeometryType.LineString: return intersects_cl(coord, geom.coordinates);
        case GeometryType.MultiLineString: return intersects_cml(coord, geom.coordinates);
        case GeometryType.Polygon: return intersects_cp(coord, geom.coordinates);
        case GeometryType.MultiPolygon: return intersects_cmp(coord, geom.coordinates);
        case GeometryType.GeometryCollection: return geom.geometries.some(function (igeom) { return intersects_cg(coord, igeom); });
    }
    return false;
}
exports.intersects_cg = intersects_cg;
function closest_cs(coord, coorda, coordb) {
    var atobx = coordb[0] - coorda[0];
    var atoby = coordb[1] - coorda[1];
    var atopx = coord[0] - coorda[0];
    var atopy = coord[1] - coorda[1];
    var len = atobx * atobx + atoby * atoby;
    var dot = atopx * atobx + atopy * atoby;
    var t = Math.min(1, Math.max(0, dot / len));
    dot = (coordb[0] - coorda[0]) * (coord[1] - coorda[1]) - (coordb[1] - coorda[1]) * (coord[0] - coorda[0]);
    var x = coorda[0] + atobx * t;
    var y = coorda[1] + atoby * t;
    // left = dot < 1 (point à droite du vecteur ab)
    // t === 0 => projection sur la ligne ab hors du segment ab avant a => point a le plus pres
    // t === 1 => projection sur la ligne ab hors du segment ab apres b => point b le plus pres
    // sinon   => projection sur la ligne ab dans le segment ab => point projeté le plus pres 
    return (t === 0) ? coorda : (t === 1) ? coordb : [x, y];
}
exports.closest_cs = closest_cs;
function closest_cl(coord, linestring) {
    var dist = Infinity;
    var closest = null;
    linestring.forEach(function (icoord, i) {
        if (i > 0) {
            var current = closest_cs(coord, linestring[i - 1], linestring[i]);
            var idist = distance_sq(coord, current);
            if (idist < dist) {
                dist = idist;
                closest = current;
            }
        }
    });
    return closest;
}
exports.closest_cl = closest_cl;
function closest_cml(coord, mlinestring) {
    var dist = Infinity;
    var closest = null;
    mlinestring.forEach(function (linestring) {
        linestring.forEach(function (icoord, i) {
            if (i > 0) {
                var current = closest_cs(coord, linestring[i - 1], linestring[i]);
                var idist = distance_sq(coord, current);
                if (idist < dist) {
                    dist = idist;
                    closest = current;
                }
            }
        });
    });
    return closest;
}
exports.closest_cml = closest_cml;
function closest_cp(coord, polygon) {
    // if point is inside the polygon nearest point is the given point 
    if (intersects_cp(coord, polygon))
        return coord;
    // search for nearest point over each segment
    var dist = Infinity;
    var closest = null;
    polygon.forEach(function (linearing) {
        linearing.forEach(function (icoord, i) {
            if (i > 0) {
                var current = closest_cs(coord, linearing[i - 1], linearing[i]);
                var idist = distance_sq(coord, current);
                if (idist < dist) {
                    dist = idist;
                    closest = current;
                }
            }
        });
    });
    return closest;
}
exports.closest_cp = closest_cp;
function closest_cmp(coord, mpolygon) {
    // if point is inside the multipolygon nearest point is the given point 
    if (intersects_cmp(coord, mpolygon))
        return coord;
    // search for nearest point over each segment
    var dist = Infinity;
    var closest = null;
    mpolygon.forEach(function (polygon) {
        polygon.forEach(function (linearing) {
            linearing.forEach(function (icoord, i) {
                if (i > 0) {
                    var current = closest_cs(coord, linearing[i - 1], linearing[i]);
                    var idist = distance_sq(coord, current);
                    if (idist < dist) {
                        dist = idist;
                        closest = current;
                    }
                }
            });
        });
    });
    return closest;
}
exports.closest_cmp = closest_cmp;
function closest_cg(point, geom) {
    switch (geom.type) {
        case GeometryType.Point: return geom.coordinates;
        case GeometryType.MultiPoint: return closest_cmc(point, geom.coordinates);
        case GeometryType.LineString: return closest_cl(point, geom.coordinates);
        case GeometryType.MultiLineString: return closest_cml(point, geom.coordinates);
        case GeometryType.Polygon: return closest_cp(point, geom.coordinates);
        case GeometryType.MultiPolygon: return closest_cmp(point, geom.coordinates);
        case GeometryType.GeometryCollection:
            {
                var dist_1 = Infinity;
                var closest_1 = null;
                geom.geometries.forEach(function (igeom) {
                    var current = closest_cg(point, igeom);
                    var idist = distance_sq(point, current);
                    if (idist < dist_1) {
                        dist_1 = idist;
                        closest_1 = current;
                    }
                });
            }
            ;
    }
    return null;
}
exports.closest_cg = closest_cg;
//# sourceMappingURL=geotools.js.map