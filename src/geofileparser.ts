/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {GeofileFeature} from './geofile'
import * as gt from './geotools';


export abstract class GeofileParser {
    public readonly  isbinary:boolean = false
    private _pos = 0
    private _line = 1
    private _col = 0
    private rank = 0
    private size = 0
    private pending = 0
    public collected = []


    abstract begin(): Promise<Blob>
    abstract process(byte: number)
    abstract end(): Promise<void>

    get progress() { return {read: this._pos, size: this.size, count: this.rank} }
    get pos() {return this._pos}
    get line() {return this._line}
    get col() {return this._col}

    constructor(isbinary = false) {
        this.isbinary = isbinary
    }

    consume(byte: number, size: number) {
        this.size = size
        if (!this.isbinary) {
            // count lines and cols
            if (byte === 0x0A) { this._line++; this._col = 0 }
            this._col++
        }
        try {
            this.process(byte)
        } catch (err) {
            return { msg: err.toString() + '\n' + err.stack, line: this._line, col: this._col, offset:this._pos  }
        }
        this._pos++
        return false
    }
    produce(feature: GeofileFeature) {
        this.pending--
        feature.bbox = feature.geometry ? gt.bbox_g(feature.geometry) : null
        this.collected.push(feature)
    }
    expected() {
        this.pending++
        return this.rank++
    }
    waitend(): Promise<void> {
        const loop = (resolve) => (this.pending > 0) ? setTimeout(() => loop(resolve), 0) : resolve()
        return new Promise(loop)
    }
}
