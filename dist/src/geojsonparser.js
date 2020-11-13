"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeojsonParser = void 0;
const geofile_1 = require("./geofile");
const ocurly = '{'.charCodeAt(0);
const ccurly = '}'.charCodeAt(0);
const obracket = '['.charCodeAt(0);
const cbracket = ']'.charCodeAt(0);
const colon = ':'.charCodeAt(0);
const coma = ','.charCodeAt(0);
const quote = '"'.charCodeAt(0);
const space = ' '.charCodeAt(0);
const backslash = '\\'.charCodeAt(0);
const escapedchars = ['b', 'f', 'n', 'r', 't', '"', '\\'].map(c => c.charCodeAt(0));
const multi = 128;
class GeojsonParser extends geofile_1.GeofileParser {
    constructor(file) {
        super();
        this.pending = 0;
        // state automata 
        this.automata = {
            any: () => {
                switch (this.charcode) {
                    case space: break;
                    case ocurly:
                        this.state = 'object';
                        this.push();
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
                    case coma:
                    case multi:
                        this.unexpected();
                        break;
                    default:
                        this.state = 'value';
                        this.push(this.charcode);
                        break;
                }
            },
            object: () => {
                switch (this.charcode) {
                    case space: break;
                    case ccurly:
                        this.pop();
                        break;
                    case quote:
                        this.state = 'field';
                        this.push();
                        break;
                    case coma: break;
                    default:
                        this.unexpected();
                        break;
                }
            },
            field: () => {
                switch (this.charcode) {
                    case quote:
                        this.pop();
                        this.state = 'colon';
                        break;
                    // all other are allowed field chars
                }
            },
            colon: () => {
                switch (this.charcode) {
                    case space: break;
                    case colon:
                        this.state = 'any';
                        break;
                    default: this.unexpected();
                }
            },
            array: () => {
                switch (this.charcode) {
                    case space: break;
                    case coma: break;
                    case cbracket:
                        this.pop();
                        break;
                    case ocurly:
                        this.state = 'object';
                        this.push();
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
                        this.unexpected();
                        break;
                    default:
                        this.state = 'value';
                        this.push(this.charcode);
                        break;
                }
            },
            string: () => {
                switch (this.charcode) {
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
                if (escapedchars.includes(this.charcode)) {
                    this.state = 'string';
                }
                else {
                    throw new Error(`syntax error valid escaped sequences are \\b \\f \\n \\r \\" or \\ found \\${String.fromCharCode(this.charcode)}`);
                }
            },
            value: () => {
                if ([ocurly, ccurly, obracket, cbracket, colon, coma, quote, space, multi].includes(this.charcode)) {
                    // value end
                    const item = this.pop();
                    const value = item.value.map(c => String.fromCharCode(c)).join('');
                    if (['true', 'false', 'null'].includes(value) || /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(value)) {
                        this.automata[this.state](); // charcode was not consumed
                    }
                    else {
                        throw new Error(`syntax error expected true,false,null or a number found ${item.value}`);
                    }
                }
                else {
                    this.put(this.charcode);
                }
            },
        };
        this.file = file;
    }
    init(onhandle) {
        this.rank = 0;
        this.state = 'any';
        this.stack = [];
        this.pos = 0;
        this.charcode = 0;
        this.line = 1;
        this.col = 0;
        this.onhandle = onhandle;
        return this.file;
    }
    process(byte) {
        this.charcode = byte;
        if (this.charcode === 0x0A) {
            this.line++;
            this.col = 0;
        }
        this.col++;
        this.charcode = Math.min(multi, Math.max(space, this.charcode));
        try {
            this.automata[this.state]();
        }
        catch (err) {
            return { msg: err.toString(), line: this.line, col: this.col };
        }
        this.pos++;
        return null;
    }
    ended() {
        const loop = (resolve) => (this.pending > 0) ? setTimeout(() => loop(resolve), 100) : resolve();
        return new Promise(loop);
    }
    // push current state and offset in stack
    push(charcode) {
        const value = (charcode === undefined || charcode === null) ? [] : [charcode];
        this.stack.push({ state: this.state, rank: 0, pos: this.pos, len: 0, value });
    }
    // pop saved state and call onobject if object have been parsed
    pop() {
        const item = this.stack.pop();
        this.state = this.stack.length ? this.stack[this.stack.length - 1].state : 'any';
        if (item.state === 'object' && this.stack.length === 2) {
            item.rank = this.rank++;
            item.len = this.pos - item.pos + 1;
            this.pending++;
            this.onhandle(item)
                .then(() => this.pending--)
                .catch(() => this.pending--);
        }
        return item;
    }
    put(charcode) {
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1].value.push(charcode);
        }
    }
    unexpected() {
        throw new Error(`Unexpected char '${String.fromCharCode(this.charcode)}'`);
    }
}
exports.GeojsonParser = GeojsonParser;
//# sourceMappingURL=geojsonparser.js.map