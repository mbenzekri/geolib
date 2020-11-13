/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { _ } from './polyfill';
import { Geofile, GeofileHandle, GeofileFeature, GeofileParser} from './geofile';
import { GeojsonParser } from './geojsonparser';
_();

/**
 * File System geojson class
 */
export class Geojson extends Geofile {

    private file : File | Blob

    constructor(name: string, datafile: File | Blob, indexfile?: File | Blob) {
        super(name, indexfile);
        this.assert(!!datafile,`Geojson.constructor(): data file paramemter is not provided or nullish`)
        this.file = datafile
    }

    get parser(): GeofileParser {
        return new GeojsonParser(this.file)
    }
    load(): Promise<any> {
        return Promise.resolve()
    }
    release(): Promise<any> {
        return Promise.resolve()
    }

    readFeature(rank: number| GeofileHandle): Promise<GeofileFeature> {
        return new Promise((resolve, reject) => {
            const handle = (typeof rank === 'number') ? this.getHandle(rank) : rank;
            const slice = this.file.slice(handle.pos, handle.pos + handle.len)
            const r = new FileReader();
            r.onerror = () => reject(`Geojson.readFeature(): unable to read feature due to ${r.error.message}`)
            r.onload = () => resolve(JSON.parse(r.result as string))
            r.readAsText(slice)
        })
    }
    readFeatures(rank: number, limit: number): Promise<GeofileFeature[]> {
        const hmin = this.getHandle(rank);
        const hmax = this.getHandle(rank + limit - 1);
        const length = (hmax.pos  - hmin.pos + hmax.len);
        const slice = this.file.slice(hmin.pos, hmin.pos + length)
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(`Geojson.readFeatures(): unable to read feature due to ${r.error.message}`)
            r.onload = () => { 
                try {
                    const dv = new DataView(r.result as ArrayBuffer)
                    const features = [];
                    for (let i = 0; i < limit; i++) {
                        const handle = this.getHandle(rank + i)
                        const text = dv.getUtf8(handle.pos - hmin.pos,handle.len)
                        const feature: GeofileFeature = JSON.parse(text)
                        features.push(feature)
                    }  
                    resolve(features)
                } catch(e) {
                    reject(`Geojson.readFeatures(): unable to read feature due to ${ e.toString()}`)
                }
            }
            r.readAsArrayBuffer(slice)
        })
    }

}

export * from './geojsonparser'

