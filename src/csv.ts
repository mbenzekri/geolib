/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { _ } from './polyfill';
import { Geofile, GeofileHandle, GeofileFeature, GeofileParser } from './geofile';
import { CsvParser } from './csvparser';
_();


export interface CsvOptions {
    header: boolean
    colnames: string[]
    lonlat: number[],
    wkt: number,
    skip: number,
    separator: number,
    comment: number,
    quote: number,
    escape: number,
    maxscan: number
    limit: number
}

export interface CsvOptionsParam {
    header?: boolean | string[]
    lonlat?: number[] | string[] | number | string,
    skip?: number,
    separator?: string,
    comment?: string,
    quote?: string,
    escape?: string,
    maxscan?: number
    limit?: number
}
/**
 * File System Csv class
 */
export class Csv extends Geofile {

    private file: Blob
    private options: CsvOptions
    private params: CsvOptionsParam

    constructor(name: string, datafile: Blob, options: CsvOptionsParam = {}, indexfile?: Blob) {
        super(name, indexfile);
        this.assert(!!datafile, `Csv.constructor(): data file paramemter is not provided or nullish`)
        this.file = datafile
        this.options = {
            header: false,
            colnames: Array.from({ length: 250 }).map((v,i) => `col${i}`),
            lonlat: null,
            wkt: null,
            skip: 0,
            separator: ','.charCodeAt(0),
            comment: null,
            quote: null,
            escape: '\\'.charCodeAt(0),
            maxscan: 16,
            limit: Infinity
        }
        this.params = options
        if (typeof this.params.header === 'boolean')  this.options.header = this.params.header
        if (Array.isArray(this.params.header)) this.options.header = false
        if (Array.isArray(this.params.header)) this.options.colnames = this.params.header
        if (typeof this.params.skip === 'number')  this.options.skip = this.params.skip
        if (typeof this.params.separator === 'string') this.options.separator = this.params.separator.charCodeAt(0)
        if (typeof this.params.comment === 'string') this.options.comment = this.params.comment.charCodeAt(0)
        if (typeof this.params.quote === 'string') this.options.quote = this.params.quote.charCodeAt(0)
        if (typeof this.params.escape === 'string') this.options.escape = this.params.escape.charCodeAt(0)
        if (typeof this.params.maxscan === 'number') this.options.maxscan = this.params.maxscan
        if (typeof this.params.limit === 'number') this.options.limit = this.params.limit
    }

    get parser(): GeofileParser {
        return new CsvParser(this.file, this.options)
    }
    async open() {
        if (this.options.header) {
            this.options.colnames = await CsvParser.parseHeader(this.file, this.options)
        }
        this.assertOptions()
    }
    async close() { return  }

    async readFeature(rank: number | GeofileHandle): Promise<GeofileFeature> {
        try {
            const handle = (typeof rank === 'number') ? this.getHandle(rank) : rank;
            const line = await this.file.readText(handle.pos, handle.len)
            const feature = CsvParser.build(line,handle, this.options)
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
            const lines = await this.file.read(hmin.pos,length)
            const dv = new DataView(lines)
            const features = [];
            for (let i = 0; i < limit; i++) {
                const handle = this.getHandle(rank + i)
                const line = dv.getUtf8(handle.pos - hmin.pos,handle.len)
                const feature: GeofileFeature = CsvParser.build(line,handle,this.options)
                features.push(feature)
            }  
            return features
        } catch (err) { 
            throw Error(`Csv.readFeatures(): unable to read features due to ${err.message}`)
        }
    }

    private assertOptions(dummy = true): asserts dummy {
        const lonlat = this.params.lonlat
        if (Array.isArray(lonlat) && lonlat.length === 2 && typeof lonlat[0] === 'number' && typeof lonlat[1] === 'number') {
            if (lonlat[0] < 0 || lonlat[0] >= this.options.colnames.length) throw Error(`incorrect option Csv lonlat: lon index  out of range`)
            if (lonlat[1] < 0 || lonlat[1] >= this.options.colnames.length) throw Error(`incorrect option Csv lonlat: lat index out of range`)
            this.options.lonlat = lonlat as number[]
        }
        if (Array.isArray(lonlat) && lonlat.length === 2 && typeof lonlat[0] === 'string' && typeof lonlat[1] === 'string') {
            if (!this.options.colnames.find(colname => colname === lonlat[0])) throw Error(`incorrect option Csv lonlat: lon column name not found`)
            if (!this.options.colnames.find(colname => colname === lonlat[1])) throw Error(`incorrect option Csv lonlat: lat column name not found`)
            this.options.lonlat = [this.options.colnames.indexOf(lonlat[0]), this.options.colnames.indexOf(lonlat[1])]
        }
        if (typeof lonlat === 'number') {
            throw Error(`incorrect option Csv lonlat: WKT not yet implemented`)
        }
        if (typeof lonlat === 'string') {
            throw Error(`incorrect option Csv lonlat: WKT not yet implemented`)
        }
    }


}

export * from './csvparser'

