import { GeofileParser, GeofileFeature } from "./geofile"
import { CsvOptions } from "./csv"
import { GeofileHandle } from "./geofile"

const CR = '\n'.charCodeAt(0)
const LF = '\r'.charCodeAt(0)

export class CsvParser extends GeofileParser {
    private file: Blob
    private options: CsvOptions
    private start: number
    private chars: number[] = []

    constructor(file: Blob, options: CsvOptions) {
        super(false)
        this.file = file
        this.options = options
    }

    async begin(): Promise<Blob> {
        this.start = this.pos
        return this.file
    }

    process(byte: number): void {
        switch (true) {
            case this.toskip():  // skip first lines and header
            case byte === LF: // wait for LF and ignore
                break
            case byte === CR: // wait for CR
                if (!this.isempty() && ! this.iscomment() ) {
                    const line = Uint8Array.from(this.chars).getUtf8(0, this.chars.length)
                    const handle = { rank: this.expected(), pos: this.start, len: this.pos - this.start }
                    const feature = CsvParser.build(line, handle, this.options)
                    this.produce(feature)
                }
                this.start = this.pos // restart line
                this.chars = []
                break
            default:
                // store line chars
                this.chars.push(byte)
                break
        }
    }
    async end(): Promise<void> { return super.waitend() }

    private toskip(): boolean {
        return this.line <= (this.options.skip + (this.options.header ? 1 : 0))
    }    
    private isempty(): boolean {
        return this.chars.length === 0
    }
    private iscomment(): boolean {
        return this.options.comment === this.chars[0]
    }
    static splitLine(line: string, options: CsvOptions): string[] {
        const values = line.split(String.fromCharCode(options.separator))
            .map(value => (value === '') ? null : value.replace(/^\s*"/, '').replace(/"\s*$/, ''))
        return values
    }

    static build(line: string, handle: GeofileHandle, options: CsvOptions): GeofileFeature {
        let geometry = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const properties: { [key: string]: any } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const values: any[] = CsvParser.splitLine(line, options)
        if (options.lonlat) {
            const lon = parseFloat(values[options.lonlat[0]]);
            const lat = parseFloat(values[options.lonlat[1]]);
            values[options.lonlat[0]] = lon
            values[options.lonlat[1]] = lat
            geometry = { type: 'Point', coordinates: [lon, lat] };
        }
        values.forEach((value, i) => { if (options.colnames[i]) properties[options.colnames[i]] = value });
        if (options.wkt) {
            throw Error(`WKT CSV options not yet implemented !`)
        }
        return { rank: handle.rank, pos: handle.pos, len: handle.len, geometry, properties }
    }

    static async parseHeader(file: Blob, options: CsvOptions): Promise<string[]> {
        // read column names in header
        const maxscan = 1024 * options.maxscan
        const buffer = await file.read(0,  maxscan + 10)
        const array = new Uint8Array(buffer)
        let offset = 0, length = array.indexOf(CR)
        for (let line = 0; line < options.skip && offset < maxscan && length >= 0; line++) {
            offset += length + 1
            length = array.indexOf(CR, offset) - offset
        }
        if (length === -1) throw Error('Csv header not found in ${this.options.maxscan}k first bytes')
        while (offset < maxscan && length >= 0) {
            if (length > 0 && array[offset] !== options.comment) {
                const line = buffer.getUtf8(offset, length)
                return CsvParser.splitLine(line, options)
            }
            offset += length + 1
            length = array.indexOf(CR, offset) - offset
        }
        if (length === -1) throw Error('Csv header not found in ${this.options.maxscan}k first bytes')
    }
}
