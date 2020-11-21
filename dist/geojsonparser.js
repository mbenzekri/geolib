"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeojsonParser = void 0;
const geofile_1 = require("./geofile");
const ocurly = '{'.charCodeAt(0);
const ccurly = '}'.charCodeAt(0);
const obracket = '['.charCodeAt(0);
const cbracket = ']'.charCodeAt(0);
const colon = ':'.charCodeAt(0);
const comma = ','.charCodeAt(0);
const quote = '"'.charCodeAt(0);
const space = ' '.charCodeAt(0);
const backslash = '\\'.charCodeAt(0);
const multi = 128;
class GeojsonParser extends geofile_1.GeofileParser {
    constructor(file) {
        super();
        // state automata 
        this.automata = {
            any: (charcode) => {
                switch (charcode) {
                    case space: break;
                    case ocurly:
                        this.state = 'object';
                        this.push(charcode);
                        break;
                    case obracket:
                        this.state = 'array';
                        this.push();
                        break;
                    case quote:
                        this.state = 'string';
                        this.push();
                        break;
                    case ccurly:
                    case cbracket:
                    case colon:
                    case comma:
                    case multi:
                        this.unexpected(charcode);
                        break;
                    default:
                        this.state = 'value';
                        this.push();
                        break;
                }
            },
            object: (charcode) => {
                switch (charcode) {
                    case space: break;
                    case ccurly:
                        this.pop();
                        break;
                    case quote:
                        this.state = 'field';
                        this.push();
                        break;
                    case comma: break;
                    default:
                        this.unexpected(charcode);
                        break;
                }
            },
            field: (charcode) => {
                switch (charcode) {
                    case quote:
                        this.pop();
                        this.state = 'colon';
                        break;
                    // all other are allowed field chars
                }
            },
            colon: (charcode) => {
                switch (charcode) {
                    case space: break;
                    case colon:
                        this.state = 'any';
                        break;
                    default: this.unexpected(charcode);
                }
            },
            array: (charcode) => {
                switch (charcode) {
                    case space: break;
                    case comma: break;
                    case cbracket:
                        this.pop();
                        break;
                    case ocurly:
                        this.state = 'object';
                        this.push(charcode);
                        break;
                    case obracket:
                        this.state = 'array';
                        this.push();
                        break;
                    case quote:
                        this.state = 'string';
                        this.push();
                        break;
                    case ccurly:
                    case colon:
                    case multi:
                        this.unexpected(charcode);
                        break;
                    default:
                        this.state = 'value';
                        this.push();
                        break;
                }
            },
            string: (charcode) => {
                switch (charcode) {
                    case backslash:
                        this.state = 'escape';
                        break;
                    case quote:
                        this.pop();
                        break;
                    // all other are allowed string chars
                }
            },
            escape: () => {
                this.state = 'string';
            },
            value: (charcode) => {
                if ([ocurly, ccurly, obracket, cbracket, colon, comma, quote, space, multi].includes(charcode)) {
                    // value end
                    this.pop();
                    // new char was not consumed
                    this.automata[this.state](charcode);
                }
            },
        };
        this.file = file;
    }
    isfeature() {
        return this.stack.length === 3 && this.stack[2].state === 'object' && this.stack[1].state === 'array';
    }
    begin() {
        this.state = 'any';
        this.stack = [];
        this.curfeat = null;
        return Promise.resolve(this.file);
    }
    process(byte) {
        byte = Math.min(multi, Math.max(space, byte));
        if (this.curfeat) {
            this.curfeat.value.push(byte);
        }
        this.automata[this.state](byte);
    }
    end() { return super.waitend(); }
    // push current state and offset in stack
    push(charcode) {
        const value = (charcode === undefined || charcode === null) ? [] : [charcode];
        const item = { state: this.state, rank: 0, pos: this.pos, len: 0, value };
        this.stack.push(item);
        if (this.isfeature())
            this.curfeat = item;
    }
    // pop saved state and call onobject if object have been parsed
    pop() {
        const isfeature = this.isfeature();
        const item = this.stack.pop();
        this.state = this.stack.length ? this.stack[this.stack.length - 1].state : 'any';
        if (isfeature) {
            this.curfeat = null;
            const buffer = Uint8Array.from(item.value);
            const json = buffer.getUtf8(0, item.value.length);
            try {
                const feature = JSON.parse(json);
                feature.rank = this.expected();
                feature.pos = item.pos;
                feature.len = this.pos - item.pos + 1;
                this.produce(feature);
            }
            catch (err) {
                throw Error(`JSON.parse() error while parsing [${item.pos},${item.pos + item.len}[`);
            }
        }
        return item;
    }
    unexpected(charcode) {
        throw new Error(`Syntax error unexpected char '${String.fromCharCode(charcode)}'`);
    }
}
exports.GeojsonParser = GeojsonParser;
//# sourceMappingURL=geojsonparser.js.map