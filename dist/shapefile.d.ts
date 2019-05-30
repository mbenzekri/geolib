import { Geofile, GeofileFeature, GeofileOptions, GeofileFilterOptions, GeofileBinaryParser } from './geofile';
import * as gt from './geotools';
interface ShpHeader {
    code: number;
    length: number;
    version: number;
    type: number;
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    zmin: number;
    zmax: number;
    mmin: number;
    mmax: number;
}
interface DbfHeader {
    code: number;
    lastUpdate: Date;
    count: number;
    headerSize: number;
    recordSize: number;
    encrypted: number;
}
interface DbfField {
    name: string;
    type: string;
    offset: number;
    length: number;
    decimal: number;
}
export declare class Shapefile extends Geofile {
    shpfile: File;
    dbffile: File;
    shpheader: ShpHeader;
    dbfheader: DbfHeader;
    fields: Map<string, DbfField>;
    /** dbf file name associated to the shapefile */
    readonly dbfname: string;
    static get(filename: string, opts?: GeofileOptions): Promise<Geofile>;
    /** construct a Geojson object (dont use private use static geosjon() method) */
    private constructor();
    /** internal method to get File object for Shapefile for random access */
    loadFeatures(): Promise<any>;
    loadShpHeader(): Promise<any>;
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
    loadDbfHeader(): Promise<any>;
    loadDbfFields(): Promise<void>;
    getFeature_(rank: number, options: GeofileFilterOptions): Promise<GeofileFeature>;
    getFeatures_(rank: number, count: number, options: GeofileFilterOptions): Promise<GeofileFeature[]>;
    propertiesReader(dv: DataView): Object;
    getbbox(dv: DataView, pos: number): number[];
    geometryReader(dv: DataView): gt.Geometry;
    /**
     * Type Null
     * Position    Field       Value   Type    Number  Byte Order
     * Byte 0      Shape Type  0       Integer 1       Little
     */
    geomNullShape(dv: DataView): gt.Geometry;
    /**
     *  read a point geometry from the dataview
     *  Type Point
     *  Position    Field       Value   Type    Number  Byte Order
     *  Byte 0      Shape Type  1       Integer 1       Little
     *  Byte 4      X           X       Double  1       Little
     *  Byte 12     Y           Y       Double  1       Little
     */
    private geomPoint;
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
    geomPolyLine(dv: DataView): gt.Geometry;
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
    geomPolygon(dv: DataView): gt.Geometry;
    /**
     *  Type Point
     * Position    Field       Value       Type        Number      Byte Order
     * Byte 0      Shape Type  8           Integer     1           Little
     * Byte 4      Box         Box         Double      4           Little
     * Byte 36     NumPoints   NumPoints   Integer     1           Little
     * Byte 40     Points      Points      Point       NumPoints   Little
     */
    geomMultiPoint(dv: DataView): gt.Geometry;
}
declare enum ShpGeomType {
    NullShape = 0,
    Point = 1,
    PolyLine = 3,
    Polygon = 5,
    MultiPoint = 8,
    PointZ = 11,
    PolyLineZ = 13,
    PolygonZ = 15,
    MultiPointZ = 18,
    PointM = 21,
    PolyLineM = 23,
    PolygonM = 25,
    MultiPointM = 28,
    MultiPatch = 31
}
export declare class ShapefileDbfParser extends GeofileBinaryParser {
    private dbfheader;
    private fields;
    private rank;
    constructor(shpname: string);
    parseDbfHeader(): void;
    parseDbfFields(): void;
    parseDbfData(): void;
}
export declare class ShapefileShpParser extends GeofileBinaryParser {
    count: number;
    geomtype: ShpGeomType;
    private current;
    private shpheader;
    constructor(filename: string);
    /** when end of feature reached reset current */
    eof(): void;
    parseShpHeader(): void;
    parseShpGeom(): void;
    parseShpPoint(len: number): void;
    parseShpNotPoint(): void;
}
export {};
