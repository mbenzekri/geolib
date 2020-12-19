"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
globalThis.Blob = require('cross-blob');
const dist_1 = require("../dist");
const NodeFile_1 = require("../dist/NodeFile");
/**
 * indexer for geofile
 *
 * usage node.exe indexer.js filename [filenameN ...] -p projname [-i attributename=indextype ...] [cvsoptions...]
 * filename = geofile name to be indexed
 * filenameN = associated files .dbf, .prj, .sld, ...
 */
async function doit() {
    const idxlist = [];
    let proj = 'EPSG:4326';
    const args = new Array(...process.argv);
    let type = 'unknown';
    let file;
    let dbf;
    let prj;
    let sld;
    args.shift(); // remove node
    args.shift(); // remove indexer
    while (args.length) {
        const arg = args.shift();
        switch (true) {
            case arg === '-i': {
                if (!args.length)
                    throw Error(`-i option not followed by its parameter `);
                const params = args.shift();
                if (params.startsWith('-'))
                    throw Error(`-i option not followed by its parameter `);
                const idxparams = params.split(/=/);
                if (idxparams.length !== 2)
                    throw Error(`-i parameter incorrect syntax : ${params}`);
                const [attribute, type] = idxparams;
                if (!['ordered', 'prefix', 'fuzzy'].includes(type))
                    throw Error(`-i unknown index type "${type}"`);
                idxlist.push({ type, attribute });
                break;
            }
            case arg === '-p':
                if (!args.length)
                    throw Error(`-p option not followed by its parameter `);
                const param = args.shift();
                if (param.startsWith('-'))
                    throw Error(`-p option not followed by its parameter `);
                proj = param;
                break;
            case arg.startsWith('-'):
                throw Error(`unknown option ${arg}`);
            default:
                const ext = arg.replace(/^.*\./, '');
                if (!['geojson', 'shp', 'csv', 'sld', 'prj', 'dbf'].find(e => e === ext))
                    throw Error(`unknown filename extension "${ext}" for argument "${arg}"`);
                if (['geojson', 'shp', 'csv'].find(e => e === ext)) {
                    file = new NodeFile_1.NodeFile(arg);
                    type = ext;
                }
                if (ext === 'dbf')
                    dbf = new NodeFile_1.NodeFile(arg);
                if (ext === 'prj')
                    prj = new NodeFile_1.NodeFile(arg);
                if (ext === 'sld')
                    sld = new NodeFile_1.NodeFile(arg);
        }
    }
    let geofile = null;
    switch (type) {
        case 'shp':
            geofile = new dist_1.Shapefile(file.name, file, dbf);
            break;
        case 'geojson':
            geofile = new dist_1.Geojson(file.name, file);
            break;
        case 'csv':
            geofile = new dist_1.Csv(file.name, file, {});
            break;
        default: throw Error(`Missing file with primary extension (geojson,shp,csv)`);
    }
    const onprogress = state => {
        const percent = Math.round(10000 * state.read / state.size) / 100;
        process.stdout.write("\u001b[2K\u001b[0E");
        process.stdout.write(`${percent}% processes`);
    };
    await geofile.buildIndexes(idxlist, onprogress);
    console.log(`Index build terminated`);
    const buffer = await geofile.getIndexBuffer().arrayBuffer();
    const idxname = geofile.name.replace(new RegExp(`${geofile.type}$`), 'idx');
    fs.writeFileSync(idxname, Buffer.from(buffer));
    console.log(`Index ${idxname} saved`);
}
doit()
    .catch(err => {
    const stack = err.stack ? err.stack.split(/[\r\n]+/) : [err.message, 'no stack'];
    console.error(`Indexer error: ${stack[0]} at ${stack[1]}`);
    console.warn(`usage: node.exe indexer.js filename [filenameN ...] -p projname [-i attributename=indextype ...] [cvsoptions...]`);
});
//# sourceMappingURL=indexer.js.map