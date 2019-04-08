'use strict';
import * as jsts from 'jsts';
import { _ } from './polyfill';
import * as gt from './geotools';
import { Geofile, GeofileFeature, GeofileOptions, GeofileFilterOptions, GeofileBinaryParser, GeofileFiletype } from './geofile';
import * as fs from './sync';
_();

const WKTREADER = new jsts.io.WKTReader();
const GEOJSONWRITER = new jsts.io.GeoJSONWriter();
const wktread = function(wkt: string): gt.Geometry {
    const geometry =  WKTREADER.read(wkt);
    const gjsgeom =  <gt.Geometry>GEOJSONWRITER.write(geometry);
    return gjsgeom;
};

enum STATE {
    ROW = 'ROW',
    FIELD = 'FIELD',
    QFIELD = 'QFIELD',
    COMMA = 'COMMA',
    QQUOTE = 'QQUOTE',
    EOL = 'EOL',
}

enum TOKEN {
    SPACE = ' ',
    TAB = '\t',
    QUOTE = '"',
    COMMA = ',',
    SEMICOLON = ';',
    LF = '\r',
    CR = '\n',
}

class CsvOptions {
    separator?: string; // Specifies a single-character string to use as the column separator for each row.
    header?: string[];  // Specifies the header to use. Header define the property key for each value in a CSV row.
    lonfield?: string;  // specify the name of the column containing the longitude coordinate
    latfield?: string;  // specify the name of the column containing the latitude coordinate
    escape?: number;    // A single-character string used to specify the character used to escape strings in a CSV row.
    quote?: number;     // Specifies a single-character string to denote a quoted string.
    skip?: number;      // Specifies the number of lines at the beginning of a data file to skip over, prior to parsing header
}

export class CsvParser extends GeofileBinaryParser {

    private options: CsvOptions = {
        separator: ',',   // ','
        header: null,
        lonfield: 'lon',
        latfield: 'lat',
        escape: 0x22,   // '"'  NOT IMPLEMENTED
        quote: 0X22,    // '"'  NOT IMPLEMENTED
        skip: 0,        //      NOT IMPLEMENTED
    };
    private state = STATE.ROW;
    private field = '';
    private row: any[]|any = [];

    constructor(filename: string, options?: any) {
        super(filename, GeofileFiletype.CSV,true);
        if (options.separator) { this.options.separator = options.separator; }
        if (options.header) { this.options.header = options.header; }
        if (options.lonfield) { this.options.lonfield = options.lonfield; }
        if (options.latfield) { this.options.latfield = options.latfield; }
    }

    static parse(toparse: string, options?: CsvOptions): any[]| any {
        const parser = new CsvParser(toparse, options);
        return parser.collection;
    }

    // send data to the automata 
    onData(buffer: ArrayBuffer) {
        const dv = new DataView(buffer);
        for (let i = 0; i < buffer.byteLength; i++) {
            this.onChar(String.fromCharCode(dv.getUint8(i)));
            this.offset += 1;
        }
    }

    onChar(char: string) {
        this[this.state](char);
    }
    pushField() {
        this.row.push(this.field);
        this.field = '';
    }

    buildFeature() {
        let properties = this.row;
        let geometry = null;
        if (this.options.header) {
            properties = this.options.header.reduce((obj, name, i) => {
                obj[name] = this.row[i];
                return obj;
            }, <any>{});
            const ilon = this.options.header.indexOf(this.options.lonfield);
            const ilat = this.options.header.indexOf(this.options.latfield);
            if (ilon > 0 && ilat > 0
                && properties[this.options.header[ilon]] !== null
                && properties[this.options.header[ilat]] !== null
            ) {
                const lon = parseFloat(properties[this.options.header[ilon]]);
                const lat = parseFloat(properties[this.options.header[ilat]]);
                geometry = <gt.Geometry>{ type: 'Point', coordinates: [lon, lat] };
            }
            this.collection.push(<GeofileFeature>{ geometry, properties});
        } else {
            this.options.header = this.row;
            if (this.row.length === 1) {
                const line:string = this.row[0];
                if(line.split(TOKEN.COMMA).length > 1) {
                    this.options.header = line.split(TOKEN.COMMA).map(f => f.replace(/^"|"$/g,''));
                    this.options.separator = TOKEN.COMMA;
                }
            }
        }
        this.row = [];
        this.field = '';
    }

    ROW(char: string) {
        switch (char) {
            case TOKEN.QUOTE:
                this.state = STATE.QFIELD;
                break;
            case this.options.separator:
                this.pushField();
                this.state = STATE.ROW;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.pushField();
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    }

    FIELD(char: string) {
        switch (char) {
            case this.options.separator:
                this.pushField();
                this.state = STATE.FIELD;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.pushField();
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    }

    QFIELD(char: string) {
        switch (char) {
            case TOKEN.QUOTE:
                this.state = STATE.QQUOTE;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    }
    QQUOTE(char: string) {
        switch (char) {
            case TOKEN.QUOTE:
                this.field += '"';
                this.state = STATE.QFIELD;
                break;
            case TOKEN.COMMA:
                this.pushField();
                this.state = STATE.ROW;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.pushField();
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.state = STATE.COMMA;
                break;
        }
    }
    COMMA(char: string) {
        switch (char) {
            case TOKEN.COMMA:
                this.state = STATE.ROW;
                break;
            case TOKEN.CR:
            case TOKEN.LF:
                this.buildFeature();
                this.state = STATE.EOL;
                break;
            default:
                this.state = STATE.COMMA;
                break;
        }
    }

    EOL(char: string) {
        switch (char) {
            case TOKEN.CR:
            case TOKEN.LF:
                this.state = STATE.EOL;
                break;
            case TOKEN.QUOTE:
                this.state = STATE.QFIELD;
                break;
            case this.options.separator:
                this.pushField();
                this.state = STATE.ROW;
                break;
            default:
                this.field += char;
                this.state = STATE.FIELD;
                break;
        }
    }
}


/**
 * File System csv class
 */
export class Csv extends Geofile {

    /** data file csv */
    private file: File;
    private header: any[];

    /**
     * promise that resolve to a new created and loaded csv
     * @param filename complete full path and name of the csv file to load
     * @param opts options to configure the created geojson object (see. GeofileOptions)
     * @returns the promise
     */
    static get(filename: string, opts: GeofileOptions = {}): Promise<Geofile> {
        const csv = new Csv(filename, opts);
        return csv.load();
    }
    /** construct a Geojson object (dont use private use static geosjon() method) */
    private constructor(filename: string, opts: GeofileOptions = {}) {
        super(filename, opts);
    }

    /** internal method to get File object for Geojson file for random access */
    loadFeatures(): Promise<any> {
        return fs.FSFile.get(this.filename)
            .then(file => {
                this.file = file;
                const handle = this.getHandle(0);
                return fs.FSFile.slice(this.file, fs.FSFormat.text, 0, handle.pos);
            })
            .then(slice => {
                this.header = CsvParser.parse(<string>slice, { separator: ';' })[0];
            });
    }

    getFeature_(rank: number, options: GeofileFilterOptions = {}): Promise<GeofileFeature> {
        const handle = this.getHandle(rank);
        return fs.FSFile.slice(this.file, fs.FSFormat.text, handle.pos, handle.len)
            .then((slice: string) => {
                const properties =  CsvParser.parse(slice, { separator: ';', header: this.header })[0];
                if (properties.geometry) {
                    const geometry =  wktread(properties.geometry);
                    delete properties.geometry;
                    const feature: GeofileFeature = <GeofileFeature>{geometry, properties};
                    return feature;
                }
                return null;
            });
    }
    getFeatures_(rank: number, count = 1000, options: GeofileFilterOptions = {}): Promise<GeofileFeature[]> {
        const hmin = this.getHandle(rank);
        const hmax = this.getHandle(rank + count - 1);
        return fs.FSFile.slice(this.file, fs.FSFormat.text, hmin.pos, (hmax.pos + hmax.len - hmin.pos))
            .then((slice: string) => {
                const array = CsvParser.parse(slice, { separator: ';', header: this.header });
                const features = array.map(properties => {
                    if (properties.geometry) {
                        const geometry =  wktread(properties.geometry);
                        delete properties.geometry;
                        const feature: GeofileFeature = <GeofileFeature>{geometry, properties};
                        return feature;
                    }
                    return null;
                });
                return features;
            });
    }
}

