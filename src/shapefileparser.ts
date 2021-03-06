import { GeofileHandle, GeofileFeature, GeofileParser } from "./geofile"
import * as gt from './geotools'

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
    fields: Map<string, DbfField>
}


export enum GEOMTYPE {
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

export class ShapefileParser extends GeofileParser {
    private shpfile: Blob
    private dbffile: Blob
    private bytes: number[]
    private dbfheader: DbfHeader
    private state: string
    private recsize: number
    private recpos: number
    private automata() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const me = this
        const states = {
            header: {
                count: 100,
                do: (): void => {
                    // skip shape header
                    this.state = 'geomh'
                }
            },
            geomh: {
                count: 8,
                do: (dv: DataView): void => {
                    // record number not used => dv.getUint32(0, false)
                    this.recsize = dv.getUint32(4, false) * 2
                    this.recpos = this.pos + 1
                    this.state = 'geom'
                }
            },
            geom: {
                get count(): number {
                    return me.recsize
                },
                do: (shpdv: DataView): void => {
                    const handle = { rank: this.expected(), pos: this.recpos, len: me.recsize }
                    if (!this.dbffile) {
                        const feature = ShapefileParser.buidFeature(handle, shpdv, null, this.dbfheader.fields)
                        this.produce(feature)

                    } else {
                        const attrpos = this.dbfheader.headerSize + (handle.rank * this.dbfheader.recordSize) + 1;
                        this.dbffile.dataview(attrpos, this.dbfheader.recordSize)
                            .then(dbfdv => {
                                const feature = ShapefileParser.buidFeature(handle, shpdv, dbfdv, this.dbfheader.fields)
                                this.produce(feature)
                            })
                            .catch(err => {
                                throw (`ShapefileParser.automata: unable to read dbf properties \n` +
                                    `for handle ${handle.rank}/${handle.pos}/${handle.len} dbf attrpos ${attrpos}/${this.dbfheader.recordSize}\n`
                                    + `due to ${err.stack}`)
                            })
                    }
                    this.state = 'geomh'
                }
            }
        }
        return states[this.state]
    }

    constructor(shpfile: Blob, dbffile: Blob) {
        super(true)
        this.shpfile = shpfile
        this.dbffile = dbffile
    }

    async begin(): Promise<Blob> {
        this.bytes = []
        this.dbfheader = { code: 9994, lastUpdate: new Date(), count: 0, headerSize: 0, recordSize: 0, encrypted: 0, fields: new Map() }
        if (this.dbffile) this.dbfheader = await ShapefileParser.dbfHeaderReader(this.dbffile)
        this.state = 'header'
        this.recsize = 0
        this.recpos = 0
        return Promise.resolve(this.shpfile)
    }

    process(byte: number): void {
        this.bytes.push(byte)
        if (this.automata().count == this.bytes.length) {
            const dv = new DataView(Uint8Array.from(this.bytes).buffer)
            this.automata().do(dv)
            this.bytes = []
        }
    }

    end(): Promise<void> {
        return super.waitend()
    }

    static buidFeature(handle: GeofileHandle, geomdv: DataView, propsdv: DataView, fields: Map<string, DbfField>): GeofileFeature {
        const geometry = ShapefileParser.geometryReader(geomdv)
        const properties = propsdv ? ShapefileParser.propertiesReader(propsdv, fields) : {}
        return { rank: handle.rank, pos: handle.pos, len: handle.len, geometry, properties }
    }

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
    static shpHeaderReader(dv: DataView): ShapefileHeader {
        return {
            code: dv.getInt32(0, false),
            length: dv.getInt32(24, false) * 2,
            version: dv.getInt32(28, true),
            type: dv.getInt32(32, true),
            xmin: dv.getFloat64(36, true),
            ymin: dv.getFloat64(44, true),
            xmax: dv.getFloat64(52, true),
            ymax: dv.getFloat64(60, true),
            zmin: dv.getFloat64(68, true),
            zmax: dv.getFloat64(76, true),
            mmin: dv.getFloat64(84, true),
            mmax: dv.getFloat64(92, true)
        }
    }
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
    static async dbfHeaderReader(dbffile: Blob): Promise<DbfHeader> {
        // read header
        const hdv = await dbffile.dataview(0, 32)
        const code = hdv.getUint8(0)
        const lastUpdate = new Date(1900 + hdv.getUint8(1), hdv.getUint8(2) - 1, hdv.getUint8(3))
        const count = hdv.getUint32(4, true)
        const headerSize = hdv.getUint16(8, true)
        const recordSize = hdv.getUint16(10, true)
        const encrypted = hdv.getUint8(15)

        // read fields
        const fldsize = headerSize - 33;
        const fdv = await dbffile.dataview(32, fldsize)
        const fields = new Map()
        let offset = 0;
        for (let pos = 0; pos < fdv.byteLength; pos += 32) {
            const field = {
                name: fdv.getAscii(pos, 11).trimzero(),
                type: fdv.getAscii(pos + 11, 1),
                offset: offset,
                length: fdv.getUint8(pos + 16),
                decimal: fdv.getUint8(pos + 17)
            };
            fields.set(field.name, field)
            offset += field.length
        }

        return { code, lastUpdate, count, headerSize, recordSize, encrypted, fields }
    }

    static propertiesReader(dv: DataView, fields: Map<string, DbfField>): { [key: string]: unknown } {
        const properties = {}
        fields.forEach((field, name) => {
            // type = C (Character) All OEM code page characters.
            // type = D (Date) Numbers and a character to separate month, day, and year
            //                 (stored internally as 8 digits in YYYYMMDD format).
            // type = F (Floating - . 0 1 2 3 4 5 6 7 8 9 point binary numeric)
            // type = N (Binary - . 0 1 2 3 4 5 6 7 8 9 coded decimal numeric)
            // type = L (Logical) ? Y y N n T t F f (? when not initialized).
            // type = M (Memo) All OEM code page characters (stored internally as 10 digits representing a .DBT block number).
            let value = null;
            switch (field.type) {
                case 'C':
                case 'M':
                    value = dv.getUtf8(field.offset, field.length).trimzero().trim();
                    break;
                case 'D':
                    value = new Date(parseInt(dv.getUtf8(field.offset, 4), 10), parseInt(dv.getUtf8(field.offset + 4, 2), 10), parseInt(dv.getUtf8(field.offset + 6, 2), 10));
                    break;
                case 'F':
                case 'N':
                    value = dv.getUtf8(field.offset, field.length).trim()
                    value = parseFloat(value);
                    break;
                case 'I':
                    value = dv.getUtf8(field.offset, field.length).trim()
                    value = parseInt(value, 10);
                    break;
                case 'L':
                    value = dv.getUtf8(field.offset, field.length).trim()
                    value = ['Y', 'y', 'T', 't'].indexOf(value) >= 0
                    break;
                default:
                    value = dv.getUtf8(field.offset, field.length).trim()
            }
            properties[name] = value;
        });
        return properties;
    }

    static geometryReader(dv: DataView): gt.Geometry {
        const geomtype: GEOMTYPE = dv.getInt32(0, true);
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
            default: return this.geomNullShape();
        }
        return null;
    }
    /**
     * Type Null
     * Position    Field       Value   Type    Number  Byte Order
     * Byte 0      Shape Type  0       Integer 1       Little
     */
    private static geomNullShape(): gt.Geometry {
        return null;
    }
    /**
     *  read a point geometry from the dataview
     *  Type Point
     *  Position    Field       Value   Type    Number  Byte Order
     *  Byte 0      Shape Type  1       Integer 1       Little
     *  Byte 4      X           X       Double  1       Little
     *  Byte 12     Y           Y       Double  1       Little
     */
    private static geomPoint(dv: DataView): gt.Geometry {
        const x = dv.getFloat64(4, true);
        const y = dv.getFloat64(12, true);
        return { type: gt.GeometryType.Point, coordinates: [x, y] };
    }
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
    private static geomPolyLine(dv: DataView): gt.Geometry {
        const parts: number[] = [];
        const lring: number[][] = [];
        const numparts = dv.getInt32(36, true);
        const numpoints = dv.getInt32(40, true);
        let ppos = 44;
        for (let part = 0; part < numparts; part++) {
            parts.push(dv.getInt32(ppos + (part * 4), true));
        }
        ppos = 44 + (4 * numparts);
        while (parts.length > 0) {
            const deb = 2 * 8 * parts.shift();
            const fin = 2 * 8 * ((parts.length > 0) ? parts[0] : numpoints);
            for (let i = deb; i < fin; i += 16) {
                const x = dv.getFloat64(ppos + i, true);
                const y = dv.getFloat64(ppos + i + 8, true);
                lring.push([x, y]);
            }
        }
        return { type: gt.GeometryType.Polygon, coordinates: lring };
    }
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
    private static geomPolygon(dv: DataView): gt.Geometry {
        const numparts = dv.getInt32(36, true);
        const numpoints = dv.getInt32(40, true);
        const parts = [];
        let ppos = 44;
        for (let part = 0; part < numparts; part++) {
            parts.push(dv.getInt32(ppos + (part * 4), true));
        }
        ppos = 44 + (4 * numparts);
        const mpolygon: number[][][] = [];
        while (parts.length > 0) {
            const lring: number[][] = [];
            const deb = 2 * 8 * parts.shift();
            const fin = 2 * 8 * ((parts.length > 0) ? parts[0] : numpoints);
            for (let i = deb; i < fin; i += 16) {
                const x = dv.getFloat64(ppos + i, true);
                const y = dv.getFloat64(ppos + i + 8, true);
                lring.push([x, y]);
            }
            lring.push(lring[0]);
            mpolygon.push(lring);
        }
        return { type: gt.GeometryType.Polygon, coordinates: mpolygon };
    }
    /**
     *  Type Point
     * Position    Field       Value       Type        Number      Byte Order
     * Byte 0      Shape Type  8           Integer     1           Little
     * Byte 4      Box         Box         Double      4           Little
     * Byte 36     NumPoints   NumPoints   Integer     1           Little
     * Byte 40     Points      Points      Point       NumPoints   Little
     */
    private static geomMultiPoint(dv: DataView): gt.Geometry {

        const numpoints = dv.getInt32(36, true);
        const points: number[][] = [];
        let ipos = 40;
        for (let i = 0; i < numpoints; i++) {
            const x = dv.getFloat64(ipos, true);
            const y = dv.getFloat64(ipos + 8, true);
            points.push([x, y]);
            ipos += 16;
        }
        return { type: gt.GeometryType.MultiPoint, coordinates: points };
    }
}
