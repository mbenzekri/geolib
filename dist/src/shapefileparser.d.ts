import { GeofileHandle, GeofileFeature, GeofileParser } from "./geofile";
import * as gt from './geotools';
export interface ShapefileHeader {
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
export interface DbfField {
    name: string;
    type: string;
    offset: number;
    length: number;
    decimal: number;
}
export interface DbfHeader {
    code: number;
    lastUpdate: Date;
    count: number;
    headerSize: number;
    recordSize: number;
    encrypted: number;
    fields: Map<string, DbfField>;
}
export declare enum GEOMTYPE {
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
export declare class ShapefileParser extends GeofileParser {
    private shpfile;
    private dbffile;
    private bytes;
    private dbfheader;
    private state;
    private recsize;
    private recpos;
    private automata;
    constructor(shpfile: Blob, dbffile: Blob);
    begin(): Promise<Blob>;
    process(byte: number): void;
    end(): Promise<void>;
    static buidFeature(handle: GeofileHandle, geomdv: DataView, propsdv: DataView, fields: Map<string, DbfField>): GeofileFeature;
    static shpHeaderReader(dv: DataView): ShapefileHeader;
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
    static dbfHeaderReader(dbffile: Blob): Promise<DbfHeader>;
    static propertiesReader(dv: DataView, fields: Map<string, DbfField>): {
        [key: string]: unknown;
    };
    static geometryReader(dv: DataView): gt.Geometry;
    /**
     * Type Null
     * Position    Field       Value   Type    Number  Byte Order
     * Byte 0      Shape Type  0       Integer 1       Little
     */
    private static geomNullShape;
    /**
     *  read a point geometry from the dataview
     *  Type Point
     *  Position    Field       Value   Type    Number  Byte Order
     *  Byte 0      Shape Type  1       Integer 1       Little
     *  Byte 4      X           X       Double  1       Little
     *  Byte 12     Y           Y       Double  1       Little
     */
    private static geomPoint;
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
    private static geomPolyLine;
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
    private static geomPolygon;
    /**
     *  Type Point
     * Position    Field       Value       Type        Number      Byte Order
     * Byte 0      Shape Type  8           Integer     1           Little
     * Byte 4      Box         Box         Double      4           Little
     * Byte 36     NumPoints   NumPoints   Integer     1           Little
     * Byte 40     Points      Points      Point       NumPoints   Little
     */
    private static geomMultiPoint;
}
