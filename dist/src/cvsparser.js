"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeojsonParser = void 0;
const geofile_1 = require("./geofile");
const comma = ','.charCodeAt(0);
const quote = '"'.charCodeAt(0);
const creturn = '\n'.charCodeAt(0);
const linefeed = '\r'.charCodeAt(0);
class GeojsonParser extends geofile_1.GeofileParser {
    constructor(file) {
        super();
        this.separator = ','.charCodeAt(0);
        this.lonfield = 'lon';
        this.latfield = 'lat';
        this.quote = '"'.charCodeAt(0);
        this.field = [];
        // state automata 
        this.automata = {
            'ROW': () => {
                switch (this.charcode) {
                    case this.quote:
                        this.state = STATE.QFIELD;
                        break;
                    case this.separator:
                        this.pushField();
                        this.state = STATE.row;
                        break;
                    case creturn:
                    case linefeed:
                        this.pushField();
                        this.buildFeature();
                        this.state = STATE.EOL;
                        break;
                    default:
                        this.field.push(this.charcode);
                        this.state = STATE.FIELD;
                        break;
                }
            },
            'FIELD': () => {
                switch (this.charcode) {
                    case this.separator:
                        this.pushField();
                        this.state = STATE.FIELD;
                        break;
                    case creturn:
                    case linefeed:
                        this.pushField();
                        this.buildFeature();
                        this.state = STATE.EOL;
                        break;
                    default:
                        this.field.push(this.charcode);
                        this.state = STATE.FIELD;
                        break;
                }
            },
            'QFIELD': () => {
                switch (this.charcode) {
                    case quote:
                        this.state = STATE.QQUOTE;
                        break;
                    default:
                        this.field.push(this.charcode);
                        this.state = STATE.FIELD;
                        break;
                }
            },
            'QQUOTE': () => {
                switch (this.charcode) {
                    case quote:
                        this.field.push(this.charcode);
                        this.state = STATE.QFIELD;
                        break;
                    case comma:
                        this.pushField();
                        this.state = STATE.row;
                        break;
                    case creturn:
                    case linefeed:
                        this.pushField();
                        this.buildFeature();
                        this.state = STATE.EOL;
                        break;
                    default:
                        this.state = STATE.COMMA;
                        break;
                }
            },
            'COMMA': () => {
                switch (this.charcode) {
                    case comma:
                        this.state = STATE.row;
                        break;
                    case creturn:
                    case linefeed:
                        this.buildFeature();
                        this.state = STATE.EOL;
                        break;
                    default:
                        this.state = STATE.COMMA;
                        break;
                }
            },
            'EOL': () => {
                switch (this.charcode) {
                    case creturn:
                    case linefeed:
                        this.state = STATE.EOL;
                        break;
                    case quote:
                        this.start = this.pos;
                        this.state = STATE.QFIELD;
                        break;
                    case this.separator:
                        this.start = this.pos;
                        this.pushField();
                        this.state = STATE.row;
                        break;
                    default:
                        this.start = this.pos;
                        this.field.push(this.charcode);
                        this.state = STATE.FIELD;
                        break;
                }
            }
        };
        this.file = file;
    }
    init(onhandle) {
        this.rank = 0;
        this.state = 'row';
        this.pos = 0;
        this.charcode = 0;
        this.line = 1;
        this.col = 0;
        this.pending = 0;
        this.onhandle = onhandle;
        this.start = this.pos;
        return this.file;
    }
    process(byte) {
        this.charcode = byte;
        if (this.charcode === creturn) {
            this.line++;
            this.col = 0;
        }
        this.col++;
        try {
            this.automata[this.state]();
        }
        catch (err) {
            return { msg: err.toString() + '\n' + err.stack, line: this.line, col: this.col };
        }
        this.pos++;
        return null;
    }
    ended() {
        const loop = (resolve) => (this.pending > 0) ? setTimeout(() => loop(resolve), 100) : resolve();
        return new Promise(loop);
    }
    pushField() {
        const dv = new DataView(Uint8Array.from(this.field));
        this.row.push(dv.getUtf8(0, this.field.length));
        this.field = [];
    }
    buildFeature() {
        let properties;
        let geometry = null;
        if (this.header) {
            properties = this.header.reduce((obj, name, i) => { obj[name] = this.row[i]; return obj; }, {});
            const ilon = this.header.indexOf(this.lonfield);
            const ilat = this.header.indexOf(this.latfield);
            if (ilon > 0 && ilat > 0 && properties[this.header[ilon]] && properties[this.header[ilat]]) {
                const lon = parseFloat(properties[this.ilon]);
                const lat = parseFloat(properties[this.ilat]);
                geometry = { type: 'Point', coordinates: [lon, lat] };
            }
            const feature = { rank: this.rank, pos: this.start, len: this.pos - this.start, geometry, properties };
            this.onhandle(feature)
                .then(() => this.pending--)
                .catch(() => this.pending--);
            this.rank++;
        }
        else {
            this.header = this.row;
            this.ilon = this.header.indexOf(this.lonfield);
            this.ilat = this.header.indexOf(this.latfield);
        }
        this.row = [];
        this.field = [];
    }
}
exports.GeojsonParser = GeojsonParser;
//# sourceMappingURL=cvsparser.js.map