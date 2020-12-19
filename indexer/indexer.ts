import * as fs from "fs"
globalThis.Blob = require('cross-blob')
import { Geofile, Geojson, Csv, Shapefile } from "../dist"
import { NodeFile as File } from "../dist/NodeFile"
/**
 * indexer for geofile 
 * 
 * usage node.exe indexer.js filename [filenameN ...] -p projname [-i attributename=indextype ...] [cvsoptions...]  
 * filename = geofile name to be indexed
 * filenameN = associated files .dbf, .prj, .sld, ...
 */
async function doit() { 
    const idxlist = []
    let proj = 'EPSG:4326'
    const args = new Array(...process.argv)
    let type = 'unknown'
    let file: File
    let dbf: File
    let prj: File
    let sld: File
    args.shift() // remove node
    args.shift() // remove indexer
    while (args.length) {
        const arg = args.shift()
        switch (true) {
            case arg === '-i': {
                if (!args.length) throw Error(`-i option not followed by its parameter `)
                const params = args.shift()
                if (params.startsWith('-')) throw Error(`-i option not followed by its parameter `)
                const idxparams = params.split(/=/)
                if (idxparams.length !== 2) throw Error(`-i parameter incorrect syntax : ${params}`)
                const [attribute, type] = idxparams
                if (!['ordered', 'prefix', 'fuzzy'].includes(type)) throw Error(`-i unknown index type "${type}"`)
                idxlist.push({ type, attribute })
                break
            }
            case arg === '-p':
                if (!args.length) throw Error(`-p option not followed by its parameter `)
                const param = args.shift()
                if (param.startsWith('-')) throw Error(`-p option not followed by its parameter `)
                proj = param
                break
            case arg.startsWith('-'):
                throw Error(`unknown option ${arg}`)
            default:
                const ext = arg.replace(/^.*\./, '')
                if (!['geojson', 'shp', 'csv', 'sld', 'prj', 'dbf'].find(e => e === ext)) throw Error(`unknown filename extension "${ext}" for argument "${arg}"`)
                if (['geojson', 'shp', 'csv'].find(e => e === ext)) {
                    file = new NodeFile(arg)
                    type = ext
                }
                if (ext === 'dbf') dbf = new NodeFile(arg)
                if (ext === 'prj') prj = new NodeFile(arg)
                if (ext === 'sld') sld = new NodeFile(arg)
        }
    }

    let geofile: Geofile = null
    switch (type) {
        case 'shp':
            geofile = new Shapefile(file.name, file, dbf)
            break;
        case 'geojson':
            geofile = new Geojson(file.name, file)
            break
        case 'csv':
            geofile = new Csv(file.name, file, {})
            break
        default: throw Error(`Missing file with primary extension (geojson,shp,csv)`)
    }
    const onprogress = state => {
        const percent = Math.round(10000*state.read / state.size)/100
        process.stdout.write("\u001b[2K\u001b[0E")
        process.stdout.write(`${percent}% processes`)
    }
    
    await geofile.buildIndexes(idxlist,onprogress)
    console.log(`Index build terminated`)
    const buffer = await geofile.getIndexBuffer().arrayBuffer()
    const idxname = geofile.name.replace(new RegExp(`${geofile.type}$`),'idx')
    fs.writeFileSync(idxname,Buffer.from(buffer))
    console.log(`Index ${idxname} saved`)
}

doit()
.catch(err => {
    const stack=err.stack ? err.stack.split(/[\r\n]+/) : [err.message,'no stack'] 
    console.error(`Indexer error: ${stack[0]} at ${stack[1]}`)
    console.warn(`usage: node.exe indexer.js filename [filenameN ...] -p projname [-i attributename=indextype ...] [cvsoptions...]`)
})

