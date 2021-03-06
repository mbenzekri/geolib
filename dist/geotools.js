"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closest_cg = exports.closest_cmp = exports.closest_cp = exports.closest_cml = exports.closest_cl = exports.closest_cs = exports.intersects_cg = exports.closest_cmc = exports.intersects_cmp = exports.intersects_cp = exports.intersects_clr = exports.intersects_cml = exports.intersects_cl = exports.intersects_cmc = exports.intersects_cc = exports.intersects_ss = exports.intersects_sc = exports.intersects_eg = exports.intersects_emp = exports.intersects_ep = exports.contains_lre = exports.intersects_elr = exports.intersects_eml = exports.intersects_el = exports.intersects_es = exports.intersects_emc = exports.intersects_ec = exports.intersects_ee = exports.transform_g = exports.bbox_g = exports.foreach_cg = exports.distance_sq = exports.distance_hs = exports.transform_e = exports.meter_per_unit = exports.clone_g = exports.GeometryType = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const proj4_1 = __importDefault(require("proj4"));
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
    return (Array.isArray(element)) ? element.map(item => clone_a(item)) : element;
}
/**
 * clone a geometry
 */
function clone_g(geom) {
    const ngeom = {
        type: geom.type,
    };
    if (geom.coordinates) {
        ngeom.coordinates = clone_a(geom.coordinates);
    }
    if (geom.geometries) {
        ngeom.geometries = geom.geometries.map(g => clone_g(g));
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
    const p1 = proj4_1.default('EPSG:4326', proj, [-180, 0]);
    const p2 = proj4_1.default('EPSG:4326', proj, [+180, 0]);
    const dist = Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]));
    const tometer = 40075017 / dist;
    return tometer;
}
exports.meter_per_unit = meter_per_unit;
function transform_e(extent, src, dest) {
    const t = proj4_1.default(src, dest);
    const linestr = [
        t.forward([extent[0], extent[1]]),
        t.forward([extent[2], extent[1]]),
        t.forward([extent[2], extent[3]]),
        t.forward([extent[0], extent[3]]),
    ];
    const xmin = Math.min(linestr[0][0], linestr[1][0], linestr[2][0], linestr[3][0]);
    const xmax = Math.max(linestr[0][0], linestr[1][0], linestr[2][0], linestr[3][0]);
    const ymin = Math.min(linestr[0][1], linestr[1][1], linestr[2][1], linestr[3][1]);
    const ymax = Math.max(linestr[0][1], linestr[1][1], linestr[2][1], linestr[3][1]);
    return [xmin, ymin, xmax, ymax];
}
exports.transform_e = transform_e;
/** Haversine distance between to [lon, lat] coodinates */
function distance_hs(c1, c2) {
    const radius = 6378137;
    const lat1 = c1[1] * Math.PI / 180;
    const lat2 = c2[1] * Math.PI / 180;
    const deltaLatBy2 = (lat2 - lat1) / 2;
    const deltaLonBy2 = ((c2[0] - c1[0]) * Math.PI / 180) / 2;
    const a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
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
    const walk = (a) => {
        return !Array.isArray(a) ? null : a.length >= 2 && (typeof a[0] === 'number') && (typeof a[1] === 'number') ? callback(a) : a.forEach(walk);
    };
    if (geom.type !== GeometryType.GeometryCollection)
        return walk(geom.coordinates);
    geom.geometries.forEach(igeom => foreach_cg(igeom, callback));
}
exports.foreach_cg = foreach_cg;
function bbox_g(geom) {
    const bbox = [Infinity, Infinity, -Infinity, -Infinity];
    foreach_cg(geom, p => {
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
    const t = proj4_1.default(src, dest);
    foreach_cg(geom, srcpt => {
        const destpt = t.forward(srcpt);
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
    return coords.some(coord => intersects_ec(extent, coord));
}
exports.intersects_emc = intersects_emc;
/** intersect extent vs segment  */
function intersects_es(extent, start, end, tolx = 0, toly = tolx) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const aabbpx = (extent[0] + extent[2]) / 2;
    const aabbpy = (extent[1] + extent[3]) / 2;
    const aabbhx = Math.abs((extent[0] - extent[2]) / 2);
    const aabbhy = Math.abs((extent[1] - extent[3]) / 2);
    const scaleX = 1.0 / dx;
    const scaleY = 1.0 / dy;
    const signX = Math.sign(scaleX);
    const signY = Math.sign(scaleY);
    const nearTimeX = (aabbpx - signX * (aabbhx + tolx) - start[0]) * scaleX;
    const nearTimeY = (aabbpy - signY * (aabbhy + toly) - start[1]) * scaleY;
    const farTimeX = (aabbpx + signX * (aabbhx + tolx) - start[0]) * scaleX;
    const farTimeY = (aabbpy + signY * (aabbhy + toly) - start[1]) * scaleY;
    if (nearTimeX > farTimeY || nearTimeY > farTimeX) {
        return false;
    }
    const nearTime = nearTimeX > nearTimeY ? nearTimeX : nearTimeY;
    const farTime = farTimeX < farTimeY ? farTimeX : farTimeY;
    if (nearTime >= 1 || farTime <= 0) {
        return false;
    }
    return true;
}
exports.intersects_es = intersects_es;
/** intersect extent vs linestring  */
function intersects_el(extent, linestring, tolx = 0, toly = tolx) {
    return linestring.some((p, i, a) => (i + 1 < a.length) && intersects_es(extent, p, a[i + 1], tolx, toly));
}
exports.intersects_el = intersects_el;
/** intersect extent vs multilinestring */
function intersects_eml(extent, mlinestring, tolx = 0, toly = tolx) {
    return mlinestring.some((ls) => intersects_el(extent, ls, tolx, toly));
}
exports.intersects_eml = intersects_eml;
/** intersect extent vs linearring */
function intersects_elr(extent, linearring) {
    // one segment of linearring intersect extent
    if (intersects_el(extent, linearring))
        return true;
    const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    return intersects_clr(center, linearring);
}
exports.intersects_elr = intersects_elr;
/** contains  linearring extent */
function contains_lre(linearring, extent) {
    // one segment of linearring intersect extent
    if (intersects_el(extent, linearring))
        return false;
    const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    return intersects_clr(center, linearring);
}
exports.contains_lre = contains_lre;
/** intersect extent vs polygon */
function intersects_ep(extent, polygon) {
    // polygon exterior must intersect extent but not be fully inside an interior ring
    const intext = intersects_elr(extent, polygon[0]);
    const inthole = polygon.some((lr, i) => (i === 0) ? false : contains_lre(lr, extent));
    return intext && !inthole;
}
exports.intersects_ep = intersects_ep;
/** intersect extent vs polygon */
function intersects_emp(extent, mpolygon) {
    return mpolygon.some(p => intersects_ep(extent, p));
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
        case GeometryType.GeometryCollection: return geom.geometries.some(igeom => intersects_eg(extent, igeom));
    }
    return false;
}
exports.intersects_eg = intersects_eg;
/** intersect segment vs point */
function intersects_sc(start, end, point) {
    const dx = end.x - start.x;
    let liesInXDir;
    if (dx === 0) {
        liesInXDir = (point.x == start.x);
    }
    else {
        const t = (point.x - start.x) / dx;
        liesInXDir = (t >= 0 && t <= 1);
    }
    if (!liesInXDir)
        return false;
    const dy = end.y - start.y;
    if (dy === 0)
        return (point.y == start.y);
    const t = (point.y - start.y) / dy;
    return (t >= 0 && t <= 1);
}
exports.intersects_sc = intersects_sc;
/** intersect segment vs point */
function intersects_ss(start0, end0, start1, end1) {
    let hit = null;
    const dx1 = end0[0] - start0[0];
    const dy1 = end0[1] - start0[1];
    const dx2 = end1[0] - start1[0];
    const dy2 = end1[1] - start1[1];
    const dx3 = start0[0] - start1[0];
    const dy3 = start0[1] - start1[1];
    const d = dx1 * dy2 - dx2 * dy1;
    if (d !== 0) {
        const s = dx1 * dy3 - dx3 * dy1;
        if ((s <= 0 && d < 0 && s >= d) || (s >= 0 && d > 0 && s <= d)) {
            let t = dx2 * dy3 - dx3 * dy2;
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
function intersects_cc(coord0, coord1, tolx = 0, toly = tolx) {
    return intersects_ec([coord1[0] - tolx, coord1[1] - toly, coord1[0] + tolx, coord1[1] + toly], coord0);
}
exports.intersects_cc = intersects_cc;
function intersects_cmc(coord, coords, tolx = 0, toly = tolx) {
    return coords.some(scoord => intersects_cc(coord, scoord, tolx, toly));
}
exports.intersects_cmc = intersects_cmc;
/** intersect point vs linestring */
function intersects_cl(coord, linestring) {
    return linestring.some((p, i) => (i + 1 < linestring.length) && intersects_sc(linestring[i], linestring[+1], coord));
}
exports.intersects_cl = intersects_cl;
/** intersect point vs multilinestring */
function intersects_cml(coord, mlinestring) {
    return mlinestring.some((ls) => intersects_cl(coord, ls));
}
exports.intersects_cml = intersects_cml;
/**
 * intersect linear ring vs coordinate
 * use winding number algorithm :  https://en.wikipedia.org/wiki/Winding_number
 */
function intersects_clr(coord, linearring) {
    function isLeft(pt0, pt1, pt2) {
        const res = ((pt1[0] - pt0[0]) * (pt2[1] - pt0[1]) - (pt2[0] - pt0[0]) * (pt1[1] - pt0[1]));
        return res;
    }
    const x = coord[0], y = coord[1];
    let wn = 0;
    for (let i = 0, j = linearring.length - 1; i < linearring.length; j = i++) {
        const xi = linearring[i][0], yi = linearring[i][1];
        const xj = linearring[j][0], yj = linearring[j][1];
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
function intersects_cp(coord, polygon) {
    // polygon exterior must intersect point but not holes
    const intext = intersects_clr(coord, polygon[0]);
    const inthole = polygon.some((lr, i) => (i === 0) ? false : intersects_clr(coord, lr));
    return intext && !inthole;
}
exports.intersects_cp = intersects_cp;
function intersects_cmp(coord, mpolygon) {
    return mpolygon.some(p => intersects_cp(coord, p));
}
exports.intersects_cmp = intersects_cmp;
function closest_cmc(coord, mpoint) {
    let dist = Infinity;
    let closest = null;
    mpoint.forEach(icoord => {
        const idist = (coord[0] - icoord[0]) * (coord[0] - icoord[0]) + (coord[1] - icoord[1]) * (coord[1] - icoord[1]);
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
        case GeometryType.GeometryCollection: return geom.geometries.some(igeom => intersects_cg(coord, igeom));
    }
    return false;
}
exports.intersects_cg = intersects_cg;
function closest_cs(coord, coorda, coordb) {
    const atobx = coordb[0] - coorda[0];
    const atoby = coordb[1] - coorda[1];
    const atopx = coord[0] - coorda[0];
    const atopy = coord[1] - coorda[1];
    const len = atobx * atobx + atoby * atoby;
    let dot = atopx * atobx + atopy * atoby;
    const t = Math.min(1, Math.max(0, dot / len));
    dot = (coordb[0] - coorda[0]) * (coord[1] - coorda[1]) - (coordb[1] - coorda[1]) * (coord[0] - coorda[0]);
    const x = coorda[0] + atobx * t;
    const y = coorda[1] + atoby * t;
    // left = dot < 1 (point à droite du vecteur ab)
    // t === 0 => projection sur la ligne ab hors du segment ab avant a => point a le plus pres
    // t === 1 => projection sur la ligne ab hors du segment ab apres b => point b le plus pres
    // sinon   => projection sur la ligne ab dans le segment ab => point projeté le plus pres 
    return (t === 0) ? coorda : (t === 1) ? coordb : [x, y];
}
exports.closest_cs = closest_cs;
function closest_cl(coord, linestring) {
    let dist = Infinity;
    let closest = null;
    linestring.forEach((icoord, i) => {
        if (i > 0) {
            const current = closest_cs(coord, linestring[i - 1], linestring[i]);
            const idist = distance_sq(coord, current);
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
    let dist = Infinity;
    let closest = null;
    mlinestring.forEach(linestring => {
        linestring.forEach((icoord, i) => {
            if (i > 0) {
                const current = closest_cs(coord, linestring[i - 1], linestring[i]);
                const idist = distance_sq(coord, current);
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
    let dist = Infinity;
    let closest = null;
    polygon.forEach(linearing => {
        linearing.forEach((icoord, i) => {
            if (i > 0) {
                const current = closest_cs(coord, linearing[i - 1], linearing[i]);
                const idist = distance_sq(coord, current);
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
    let dist = Infinity;
    let closest = null;
    mpolygon.forEach(polygon => {
        polygon.forEach(linearing => {
            linearing.forEach((icoord, i) => {
                if (i > 0) {
                    const current = closest_cs(coord, linearing[i - 1], linearing[i]);
                    const idist = distance_sq(coord, current);
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
        case GeometryType.GeometryCollection: {
            let dist = Infinity;
            let closest = null;
            geom.geometries.forEach(igeom => {
                const current = closest_cg(point, igeom);
                const idist = distance_sq(point, current);
                if (idist < dist) {
                    dist = idist;
                    closest = current;
                }
            });
            return closest;
        }
    }
    return null;
}
exports.closest_cg = closest_cg;
//# sourceMappingURL=geotools.js.map