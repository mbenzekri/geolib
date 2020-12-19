/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import './polyfill';
import { Geofile, GeofileHandle, GeofileFeature, GeofileParser } from './geofile';
import { CsvParser } from './csvparser';

export interface CsvOptions {
    header?: boolean
    colnames?: string[]
    lon?: number | string
    lat?: number | string,
    wkt?: number | string,
    skip?: number,
    separator?: number | string,
    comment?: number | string,
    quote?: number | string,
    escape?: number | string,
    maxscan?: number
    limit?: number
}
/**
 * File System Csv class
 */
export class Csv extends Geofile {

    private file: Blob
    private options: CsvOptions

    constructor(name: string, datafile: Blob, opts: CsvOptions = {}, indexfile?: Blob) {
        super(name, indexfile);
        this.assert(!!datafile, `Csv.constructor(): data file paramemter is not provided or nullish`)
        this.file = datafile
        this.options = {
            header: false,
            colnames: Array.from({ length: 250 }).map((v, i) => `col${i}`),
            lon: null,
            lat: null,
            wkt: null,
            skip: 0,
            separator: ','.charCodeAt(0),
            comment: null,
            quote: null,
            escape: '\\'.charCodeAt(0),
            maxscan: 16,
            limit: Infinity
        }
        Object.assign(this.options, opts)
            // change all chars expressed as string to charCode (byte)
            ;['separator', 'comment', 'quote', 'escape',].forEach(opt => {
                if (typeof this.options[opt] === 'string') this.options[opt] = this.options[opt].charCodeAt(0)
            })
    }

    get type()  { return 'csv' }

    get parser(): GeofileParser {
        return new CsvParser(this.file, this.options)
    }
    async open() {
        if (this.options.header) {
            this.options.colnames = await CsvParser.parseHeader(this.file, this.options)
        }
        this.assertOptions()
    }
    async close() { return }

    async readFeature(rank: number | GeofileHandle): Promise<GeofileFeature> {
        try {
            const handle = (typeof rank === 'number') ? this.getHandle(rank) : rank;
            const line = await this.file.text(handle.pos, handle.len)
            const feature = CsvParser.build(line, handle, this.options)
            return feature
        } catch (err) {
            throw Error(`Csv.readFeature(): unable to read feature due to ${err.message}`)
        }
    }

    async readFeatures(rank: number, limit: number): Promise<GeofileFeature[]> {
        try {
            const hmin = this.getHandle(rank);
            const hmax = this.getHandle(rank + limit - 1);
            const length = (hmax.pos - hmin.pos + hmax.len);
            const dv = await this.file.dataview(hmin.pos, length)
            const features = [];
            for (let i = 0; i < limit; i++) {
                const handle = this.getHandle(rank + i)
                const line = dv.getUtf8(handle.pos - hmin.pos, handle.len)
                const feature: GeofileFeature = CsvParser.build(line, handle, this.options)
                features.push(feature)
            }
            return features
        } catch (err) {
            throw Error(`Csv.readFeatures(): unable to read features due to ${err.message}`)
        }
    }

    private assertOptions() {
        // change all colnames expressed as number to index in colnames
        ['lon', 'lat', 'wkt'].forEach(opt => {
            if (typeof this.options[opt] === 'string') this.options[opt] = this.options.colnames.indexOf(this.options[opt])
        })

        const colcount = this.options.colnames.length
        if (this.options.lon !== null && (this.options.lon < 0 || this.options.lon >= colcount))
            throw Error(`incorrect option Csv lon: lon colname not found or index  out of range`)
        if (this.options.lat !== null && (this.options.lat < 0 || this.options.lat >= colcount))
            throw Error(`incorrect option Csv lat: lat colname not found or index  out of range`)
        if (this.options.wkt !== null && (this.options.wkt < 0 || this.options.wkt >= colcount))
            throw Error(`incorrect option Csv wkt: WKT not yet implemented !`)
    }

}

export * from './csvparser'

