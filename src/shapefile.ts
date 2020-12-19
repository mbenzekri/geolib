/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import './polyfill';
import { Geofile, GeofileFeature } from './geofile';
import { ShapefileParser, ShapefileHeader, DbfHeader } from './shapefileparser';

/**
 * File System Shapefile class
 */
export class Shapefile extends Geofile {

    private shpfile: Blob
    private dbffile: Blob
    private shpheader: ShapefileHeader
    private dbfheader: DbfHeader

    constructor(name: string, shpfile: Blob, dbffile: Blob = null, indexfile?: Blob) {
        super(name, indexfile);
        this.assert(!!shpfile, `Csv.constructor(): data file paramemter is not provided or nullish`)
        this.shpfile = shpfile
        this.dbffile = dbffile
    }

    get extent() {
        return [this.shpheader.xmin, this.shpheader.ymin, this.shpheader.xmax, this.shpheader.ymax]
    }

    get type()  { return 'shp' }

    get parser(): ShapefileParser {
        return new ShapefileParser(this.shpfile, this.dbffile)
    }
    async open() {
        const dv = await this.shpfile.dataview(0, 100)
        this.shpheader = ShapefileParser.shpHeaderReader(dv)
        this.dbfheader = { code: 9994, lastUpdate: new Date(), count: 0, headerSize: 0, recordSize: 0, encrypted: 0, fields: new Map() }
        if (this.dbffile) {
            this.dbfheader = await ShapefileParser.dbfHeaderReader(this.dbffile)
        }
    }

    async close() { return }

    async readFeature(rank: number): Promise<GeofileFeature> {
        const handle = this.getHandle(rank);
        const attrpos = this.dbfheader.headerSize + (handle.rank * this.dbfheader.recordSize) + 1;
        try {
            const shpdv = await this.shpfile.dataview(handle.pos, handle.len)
            const dbfdv = this.dbffile ? await this.dbffile.dataview(attrpos, this.dbfheader.recordSize) : null
            const feature = ShapefileParser.buidFeature(handle, shpdv, dbfdv, this.dbfheader.fields)
            return feature
        } catch (err) {
            throw Error(`Shapefile.readFeature(): unable to read feature due to ${err.message}`)
        }
    }

    async readFeatures(rank: number, limit: number): Promise<GeofileFeature[]> {
        try {
            const hmin = this.getHandle(rank);
            const hmax = this.getHandle(rank + limit - 1);
            const length = (hmax.pos - hmin.pos + hmax.len);
            const shpbuf = await this.shpfile.arrayBuffer(hmin.pos, length)

            const amin = this.dbfheader.headerSize + (hmin.rank * this.dbfheader.recordSize) + 1;
            const alen = limit * this.dbfheader.recordSize;
            const dbfbuf = this.dbffile ? await this.dbffile.arrayBuffer(amin, alen) : null

            const features = [];
            for (let i = 0; i < limit; i++) {
                const handle = this.getHandle(rank + i)
                const shpdv = new DataView(shpbuf, handle.pos - hmin.pos, handle.len)
                const dbfdv = this.dbffile ? new DataView(dbfbuf, i * this.dbfheader.recordSize, this.dbfheader.recordSize) : null
                const feature = ShapefileParser.buidFeature(handle, shpdv, dbfdv, this.dbfheader.fields)
                features.push(feature)
            }
            return features
        } catch (err) {
            throw Error(`Shapefile.readFeatures(): unable to read features due to ${err.message}`)
        }
    }

}

export * from './shapefileparser'



