import { Geojson } from './geojson'
import * as fs from 'fs'
let geojson:Geojson = null;
const data = fs.readFileSync('c:/Work/data/geo/geofiledata/parcels.geojson','utf8')
const blob = new Blob([data])
describe('Test geojson.ts for large files', () => {

    beforeEach(() => null);

    test('Should create Geojson', async () => {
        geojson = new Geojson('parcel', blob)
        await geojson.buildIndexes([])
        expect(geojson).not.toBeNull();
        expect(geojson.name).toBe('parcel')
    })

})
