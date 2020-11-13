/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import proj4 from 'proj4';

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

export enum GeometryType {
    Point = 'Point',
    MultiPoint = 'MultiPoint',
    LineString = "LineString",
    MultiLineString = "MultiLineString",
    Polygon = "Polygon",
    MultiPolygon = "MultiPolygon",
    GeometryCollection = "GeometryCollection"
}

export declare type Geometry = {
    type: GeometryType,
    coordinates?: number[] | number[][] | number[][][] | number[][][][];
    geometries?: Geometry[]
}

function clone_a(element: any[]|any) {
    return (Array.isArray(element)) ? element.map(item => clone_a(item)) : element;
}

/**
 * clone a geometry
 */
export function clone_g(geom: Geometry) : Geometry {
    const ngeom:Geometry = {
        type: geom.type, 
    }
    if (geom.coordinates) { ngeom.coordinates = clone_a(geom.coordinates); }
    if (geom.geometries) { ngeom.geometries =  geom.geometries.map(g => clone_g(g)) }
    return ngeom;
}
/**
 * calculate the meter per unit factor for a projection along the equator
 * caution: the projection must be valid over the whole world
 * @param proj a projection code (ex: 'EPSG4326')
 */
export function meter_per_unit(proj: string): number {
    const p1 = proj4('EPSG:4326', proj, [-180, 0]);
    const p2 = proj4('EPSG:4326', proj, [+180, 0]);
    const dist = Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]));
    const tometer = 40075017 / dist;
    return tometer;
}

export function transform_e(extent: number[], src: string, dest: string): number[] {
    const t = proj4(src, dest);
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

/** Haversine distance between to [lon, lat] coodinates */
export function distance_hs(c1: number[], c2: number[]) {
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

export function distance_sq(coord0: number[], coord1: number[]): number {
    return (coord0[0] - coord1[0]) * (coord0[0] - coord1[0]) + (coord0[1] - coord1[1]) * (coord0[1] - coord1[1]);
}

export function foreach_cg(geom: Geometry, callback: (point: number[]) => void): void  {
    const walk = (a: any[]) => {
        return !Array.isArray(a) ? null : a.length >= 2 && (typeof a[0] === 'number') && (typeof a[1] === 'number') ? callback(a) : a.forEach(walk)
    };
    if (geom.type !== GeometryType.GeometryCollection) return walk(geom.coordinates);
    geom.geometries.forEach(igeom => foreach_cg(igeom,callback));
}

export function bbox_g(geom: Geometry): number[] {
    const bbox = [Infinity, Infinity, -Infinity, -Infinity];
    foreach_cg(geom, p => {
        if (p[0] < bbox[0]) bbox[0] = p[0];
        if (p[0] > bbox[2]) bbox[2] = p[0];
        if (p[1] < bbox[1]) bbox[1] = p[1];
        if (p[1] > bbox[3]) bbox[3] = p[1];
    });
    return bbox;
}

export function transform_g(geom: Geometry,src: string,dest:string): Geometry {
    const t = proj4(src, dest);
    foreach_cg(geom, srcpt => {
        const destpt = t.forward(srcpt);
        srcpt[0]=destpt[0];
        srcpt[1]=destpt[1];
    });
    return geom;
}

/** intersect extent vs extent */
export function intersects_ee(extent0: number[], extent1: number[]): boolean {
    return !(extent1[2] < extent0[0]
        || extent1[0] > extent0[2]
        || extent1[3] < extent0[1]
        || extent1[1] > extent0[3]);
}

/** intersect extent vs coordinate */
export function intersects_ec(extent: number[], coord: number[]): boolean {
    return coord[0] <= extent[2]
        && coord[1] <= extent[3]
        && coord[0] >= extent[0]
        && coord[1] >= extent[1];
}

export function intersects_emc(extent: number[], coords: number[][]): boolean {
    return coords.some(coord => intersects_ec(extent, coord));
}

/** intersect extent vs segment  */
export function intersects_es(extent: number[], start: number[], end: number[], tolx = 0, toly = tolx): boolean {
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
    if (nearTimeX > farTimeY || nearTimeY > farTimeX) { return false; }
    const nearTime = nearTimeX > nearTimeY ? nearTimeX : nearTimeY;
    const farTime = farTimeX < farTimeY ? farTimeX : farTimeY;
    if (nearTime >= 1 || farTime <= 0) { return false; }
    return true;
}

/** intersect extent vs linestring  */
export function intersects_el(extent: number[], linestring: number[][], tolx = 0, toly = tolx): boolean {
    return linestring.some((p, i, a) => (i + 1 < a.length) && intersects_es(extent, p, a[i + 1], tolx, toly));
}

/** intersect extent vs multilinestring */
export function intersects_eml(extent: number[], mlinestring: number[][][], tolx = 0, toly = tolx): boolean {
    return mlinestring.some((ls) => intersects_el(extent, ls, tolx, toly));
}


/** intersect extent vs linearring */
export function intersects_elr(extent: number[], linearring: number[][]): boolean {
    // one segment of linearring intersect extent
    if (intersects_el(extent, linearring)) return true;
    const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    return intersects_clr(center, linearring);
}

/** contains  linearring extent */
export function contains_lre(linearring: number[][], extent: number[]): boolean {
    // one segment of linearring intersect extent
    if (intersects_el(extent, linearring)) return false;
    const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    return intersects_clr(center, linearring);
}

/** intersect extent vs polygon */
export function intersects_ep(extent: number[], polygon: number[][][]): boolean {
    // polygon exterior must intersect extent but not be fully inside an interior ring
    const intext = intersects_elr(extent, polygon[0]);
    const inthole = polygon.some((lr, i) => (i === 0) ? false : contains_lre(lr, extent));
    return intext && !inthole;
}

/** intersect extent vs polygon */
export function intersects_emp(extent: number[], mpolygon: number[][][][]): boolean {
    return mpolygon.some(p => intersects_ep(extent, p));
}

/** intersect extent vs geometry */
export function intersects_eg(extent: number[], geom: Geometry): boolean {
    switch (geom.type) {
        case GeometryType.Point: return intersects_ec(extent, <number[]>geom.coordinates);
        case GeometryType.MultiPoint: return intersects_emc(extent, <number[][]>geom.coordinates);
        case GeometryType.LineString: return intersects_el(extent, (<number[][]>geom.coordinates));
        case GeometryType.MultiLineString: return intersects_eml(extent, <number[][][]>geom.coordinates);
        case GeometryType.Polygon: return intersects_ep(extent, <number[][][]>geom.coordinates);
        case GeometryType.MultiPolygon: return intersects_emp(extent, <number[][][][]>geom.coordinates);
        case GeometryType.GeometryCollection: return geom.geometries.some(igeom => intersects_eg(extent, igeom));
    }
    return false;
}


/** intersect segment vs point */
export function intersects_sc(start, end, point): boolean {
    const dx = end.x - start.x;
    let liesInXDir;
    if (dx === 0) {
        liesInXDir = (point.x == start.x)
    } else {
        const t = (point.x - start.x) / dx
        liesInXDir = (t >= 0 && t <= 1)
    }
    if (!liesInXDir) return false;
    const dy = end.y - start.y;
    if (dy === 0) return (point.y == start.y);
    const t = (point.y - start.y) / dy
    return (t >= 0 && t <= 1);
}

/** intersect segment vs point */
export function intersects_ss(start0: number[], end0: number[], start1: number[], end1: number[]): number[] {
    let hit: number[] = null;
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

/** intersect coordinate vs coordinate  */
export function intersects_cc(coord0: number[], coord1: number[], tolx = 0, toly = tolx): boolean {
    return intersects_ec([coord1[0] - tolx, coord1[1] - toly, coord1[0] + tolx, coord1[1] + toly], coord0);
}

export function intersects_cmc(coord: number[], coords: number[][], tolx = 0, toly = tolx): boolean {
    return coords.some(scoord => intersects_cc(coord, scoord, tolx, toly));
}

/** intersect point vs linestring */
export function intersects_cl(coord: number[], linestring: number[][]): boolean {
    return linestring.some((p, i) => (i + 1 < linestring.length) && intersects_sc(linestring[i], linestring[+1], coord));
}

/** intersect point vs multilinestring */
export function intersects_cml(coord: number[], mlinestring: number[][][]): boolean {
    return mlinestring.some((ls) => intersects_cl(coord, ls));
}

/** 
 * intersect linear ring vs coordinate
 * use winding number algorithm :  https://en.wikipedia.org/wiki/Winding_number   
 */
export function intersects_clr(coord: number[], linearring: number[][]): boolean {
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
        } else {
            if (yi <= y) {
                if (isLeft([xj, yj], [xi, yi], [x, y]) < 0) {
                    wn--;
                }
            }
        }
    }

    return wn != 0
}


export function intersects_cp(coord: number[], polygon: number[][][]):boolean {
    // polygon exterior must intersect point but not holes
    const intext = intersects_clr(coord, polygon[0]);
    const inthole = polygon.some((lr, i) => (i === 0) ? false : intersects_clr(coord, lr));
    return intext && !inthole;
}

export function intersects_cmp(coord: number[], mpolygon: number[][][][]):boolean {
    return mpolygon.some(p => intersects_cp(coord, p));
}

export function closest_cmc(coord: number[], mpoint: number[][]): number[] {
    let dist = Infinity;
    let closest = null;
    mpoint.forEach(icoord => {
        const idist = (coord[0] - icoord[0]) * (coord[0] - icoord[0]) + (coord[1] - icoord[1]) * (coord[1] - icoord[1]);
        if (idist < dist) { dist = idist; closest = icoord; }
    });
    return closest;
}

export function intersects_cg(coord: number[], geom: Geometry): boolean {
    switch (geom.type) {
        case GeometryType.Point: return intersects_cc(coord, <number[]>geom.coordinates);
        case GeometryType.MultiPoint: return intersects_cmc(coord, <number[][]>geom.coordinates);
        case GeometryType.LineString: return intersects_cl(coord, <number[][]>geom.coordinates);
        case GeometryType.MultiLineString: return intersects_cml(coord, <number[][][]>geom.coordinates);
        case GeometryType.Polygon: return intersects_cp(coord, <number[][][]>geom.coordinates);
        case GeometryType.MultiPolygon: return intersects_cmp(coord, <number[][][][]>geom.coordinates);
        case GeometryType.GeometryCollection: return geom.geometries.some(igeom => intersects_cg(coord, igeom));
    }
    return false;
}

export function closest_cs(coord: number[], coorda: number[], coordb: number[]) {

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
    return (t === 0) ? coorda : (t === 1) ? coordb : [x, y]

}

export function closest_cl(coord: number[], linestring: number[][]): number[] {
    let dist = Infinity;
    let closest = null;
    linestring.forEach((icoord, i) => {
        if (i > 0) {
            const current = closest_cs(coord, linestring[i - 1], linestring[i]);
            const idist = distance_sq(coord, current);
            if (idist < dist) { dist = idist; closest = current; }
        }
    });
    return closest;
}

export function closest_cml(coord: number[], mlinestring: number[][][]): number[] {
    let dist = Infinity;
    let closest = null;
    mlinestring.forEach(linestring => {
        linestring.forEach((icoord, i) => {
            if (i > 0) {
                const current = closest_cs(coord, linestring[i - 1], linestring[i]);
                const idist = distance_sq(coord, current);
                if (idist < dist) { dist = idist; closest = current; }
            }
        });
    });
    return closest;
}

export function closest_cp(coord: number[], polygon: number[][][]): number[] {
    // if point is inside the polygon nearest point is the given point 
    if (intersects_cp(coord, polygon)) return coord;
    // search for nearest point over each segment
    let dist = Infinity;
    let closest = null;
    polygon.forEach(linearing => {
        linearing.forEach((icoord, i) => {
            if (i > 0) {
                const current = closest_cs(coord, linearing[i - 1], linearing[i]);
                const idist = distance_sq(coord, current);
                if (idist < dist) { dist = idist; closest = current; }
            }
        });
    });
    return closest;
}

export function closest_cmp(coord: number[], mpolygon: number[][][][]): number[] {
    // if point is inside the multipolygon nearest point is the given point 
    if (intersects_cmp(coord, mpolygon)) return coord;
    // search for nearest point over each segment
    let dist = Infinity;
    let closest = null;
    mpolygon.forEach(polygon => {
        polygon.forEach(linearing => {
            linearing.forEach((icoord, i) => {
                if (i > 0) {
                    const current = closest_cs(coord, linearing[i - 1], linearing[i]);
                    const idist = distance_sq(coord, current);
                    if (idist < dist) { dist = idist; closest = current; }
                }
            });
        });
    });
    return closest;

}

export function closest_cg(point: number[], geom: Geometry): number[] {
    switch (geom.type) {
        case GeometryType.Point: return <number[]>geom.coordinates;
        case GeometryType.MultiPoint: return closest_cmc(point, <number[][]>geom.coordinates);
        case GeometryType.LineString: return closest_cl(point, <number[][]>geom.coordinates);
        case GeometryType.MultiLineString: return closest_cml(point, <number[][][]>geom.coordinates);
        case GeometryType.Polygon: return closest_cp(point, <number[][][]>geom.coordinates);
        case GeometryType.MultiPolygon: return closest_cmp(point, <number[][][][]>geom.coordinates);
        case GeometryType.GeometryCollection: {
            let dist = Infinity;
            let closest = null;
            geom.geometries.forEach(igeom => {
                const current = closest_cg(point, igeom);
                const idist = distance_sq(point, current);
                if (idist < dist) { dist = idist; closest = current; }
            })
            return closest
        }
    }
    return null;
}

