/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import  './polyfill';
import { Geofile, GeofileFeature, GeofileParser} from './geofile';
import { GeojsonParser } from './geojsonparser';

/**
 * File System geojson class
 */
export class Geojson extends Geofile {

    private file : Blob

    constructor(name: string, datafile: Blob, indexfile?: Blob) {
        super(name, indexfile);
        this.assert(!!datafile,`Geojson.constructor(): data file paramemter is not provided or nullish`)
        this.file = datafile
    }

    get parser(): GeofileParser { return new GeojsonParser(this.file) }

    async open(): Promise<any> { return }

    async close(): Promise<any> { return }

    async readFeature(rank: number): Promise<GeofileFeature> {
        const handle =  this.getHandle(rank);
        try {
            const json = await this.file.readText(handle.pos,handle.len)
            return JSON.parse(json)
        } catch (e) {
            throw new Error(`Geojson.readFeature(): unable to read feature due to ${ e.message | e.toString()}`)
        }
    }

    async readFeatures(rank: number, limit: number): Promise<GeofileFeature[]> {
        const hmin = this.getHandle(rank);
        const hmax = this.getHandle(rank + limit - 1);
        const length = (hmax.pos  - hmin.pos + hmax.len);
        try {
            const array =  await this.file.read(hmin.pos, hmin.pos + length)
            const dv = new DataView(array)
            const features = [];
            for (let i = 0; i < limit; i++) {
                const handle = this.getHandle(rank + i)
                const text = dv.getUtf8(handle.pos - hmin.pos,handle.len)
                const feature: GeofileFeature = JSON.parse(text)
                features.push(feature)
            }  
            return features
        } catch (e) {
            throw new Error(`Geojson.readFeatures(): unable to read feature due to ${ e.message | e.toString()}`)
        }
    }

}

export * from './geojsonparser'

