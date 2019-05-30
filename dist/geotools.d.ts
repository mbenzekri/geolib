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
export declare enum GeometryType {
    Point = "Point",
    MultiPoint = "MultiPoint",
    LineString = "LineString",
    MultiLineString = "MultiLineString",
    Polygon = "Polygon",
    MultiPolygon = "MultiPolygon",
    GeometryCollection = "GeometryCollection"
}
export declare type Geometry = {
    type: GeometryType;
    coordinates?: number[] | number[][] | number[][][] | number[][][][];
    geometries?: Geometry[];
};
/**
 * clone a geometry
 */
export declare function clone_g(geom: Geometry): Geometry;
/**
 * calculate the meter per unit factor for a projection along the equator
 * caution: the projection must be valid over the whole world
 * @param proj a projection code (ex: 'EPSG4326')
 */
export declare function meter_per_unit(proj: string): number;
export declare function transform_e(extent: number[], src: string, dest: string): number[];
/** Haversine distance between to [lon, lat] coodinates */
export declare function distance_hs(c1: number[], c2: number[]): number;
export declare function distance_sq(coord0: number[], coord1: number[]): number;
export declare function foreach_cg(geom: Geometry, callback: (point: number[]) => void): void;
export declare function bbox_g(geom: Geometry): number[];
export declare function transform_g(geom: Geometry, src: string, dest: string): Geometry;
/** intersect extent vs extent */
export declare function intersects_ee(extent0: number[], extent1: number[]): boolean;
/** intersect extent vs coordinate */
export declare function intersects_ec(extent: number[], coord: number[]): boolean;
export declare function intersects_emc(extent: number[], coords: number[][]): boolean;
/** intersect extent vs segment  */
export declare function intersects_es(extent: number[], start: number[], end: number[], tolx?: number, toly?: number): boolean;
/** intersect extent vs linestring  */
export declare function intersects_el(extent: number[], linestring: number[][], tolx?: number, toly?: number): boolean;
/** intersect extent vs multilinestring */
export declare function intersects_eml(extent: number[], mlinestring: number[][][], tolx?: number, toly?: number): boolean;
/** intersect extent vs linearring */
export declare function intersects_elr(extent: number[], linearring: number[][]): boolean;
/** contains  linearring extent */
export declare function contains_lre(linearring: number[][], extent: number[]): boolean;
/** intersect extent vs polygon */
export declare function intersects_ep(extent: number[], polygon: number[][][]): boolean;
/** intersect extent vs polygon */
export declare function intersects_emp(extent: number[], mpolygon: number[][][][]): boolean;
/** intersect extent vs geometry */
export declare function intersects_eg(extent: number[], geom: Geometry): boolean;
/** intersect segment vs point */
export declare function intersects_sc(start: any, end: any, point: any): boolean;
/** intersect segment vs point */
export declare function intersects_ss(start0: number[], end0: number[], start1: number[], end1: number[]): number[];
/** intersect coordinate vs coordinate  */
export declare function intersects_cc(coord0: number[], coord1: number[], tolx?: number, toly?: number): boolean;
export declare function intersects_cmc(coord: number[], coords: number[][], tolx?: number, toly?: number): boolean;
/** intersect point vs linestring */
export declare function intersects_cl(coord: number[], linestring: number[][]): boolean;
/** intersect point vs multilinestring */
export declare function intersects_cml(coord: number[], mlinestring: number[][][]): boolean;
/**
 * intersect linear ring vs coordinate
 * use winding number algorithm :  https://en.wikipedia.org/wiki/Winding_number
 */
export declare function intersects_clr(coord: number[], linearring: number[][]): boolean;
export declare function intersects_cp(coord: number[], polygon: number[][][]): boolean;
export declare function intersects_cmp(coord: number[], mpolygon: number[][][][]): boolean;
export declare function closest_cmc(coord: number[], mpoint: number[][]): number[];
export declare function intersects_cg(coord: number[], geom: Geometry): boolean;
export declare function closest_cs(coord: number[], coorda: number[], coordb: number[]): number[];
export declare function closest_cl(coord: number[], linestring: number[][]): number[];
export declare function closest_cml(coord: number[], mlinestring: number[][][]): number[];
export declare function closest_cp(coord: number[], polygon: number[][][]): number[];
export declare function closest_cmp(coord: number[], mpolygon: number[][][][]): number[];
export declare function closest_cg(point: number[], geom: Geometry): number[];
