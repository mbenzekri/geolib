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
const shapefile_1 = require("./shapefile");
const fs = __importStar(require("fs"));
const geofile_1 = require("./geofile");
let simpleshp, simpledbf;
// const simpledbf = fs.readFileSync('./data/simple.dbf').buffer
async function loadfile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err)
                return reject(Error('Unable to read simple shapefile'));
            resolve(data.buffer);
        });
    });
}
describe('Test shapefile.ts', () => {
    beforeAll(async () => {
        simpleshp = await loadfile('./data/shp/simple.shp');
        simpledbf = await loadfile('./data/shp/simple.dbf');
    });
    beforeEach(() => null);
    test('Should create Shapefile', () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([' blob shp ']), new Blob([' blob dbf ']));
        expect(shp).not.toBeNull();
        expect(shp.name).toBe('myclass');
    });
    test('Should fail to create Geojson', () => {
        expect(() => { new shapefile_1.Shapefile('myclass', null, null); }).toThrow(Error);
    });
    test('should parse simple Shapefile', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]));
        let count = 0;
        for await (const f of shp.parse()) {
            expect(f.geometry).not.toBeNull();
            expect(f.geometry.type).toBe('Point');
            expect(f.geometry.coordinates).toStrictEqual([[-10, -10], [10, 10], [10, -10]][count]);
            count++;
        }
        expect(count).toEqual(3);
    });
    test('should index handle/rtree geojson ', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]));
        expect(shp.count).toBe(0);
        await shp.buildIndexes([]);
        expect(shp.count).toBe(3);
    });
    test('should random access feature Geojson.readFeature()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        for (let i = 0; i < 3; i++) {
            const feature = await shp.readFeature(i);
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    });
    test('should random access feature Geojson.getFeature()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        for (let i = 0; i < 3; i++) {
            const feature = await shp.getFeature(i);
            expect(feature.rank).toBe(i);
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    });
    test('should access all features Geojson.forEach()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        let count = 0;
        await shp.forEach({
            featureAction: feature => {
                expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][feature.rank]);
                expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][feature.rank]);
                count++;
            }
        });
        expect(count).toBe(3);
    });
    test('should access filtered features Geojson.forEach()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        const features = [];
        await shp.forEach({
            featureAction: feature => features.push(feature),
            featureFilter: feature => feature.properties.gender === 'Female',
            targetProjection: 'EPSG:3857',
        });
        expect(features.length).toBe(2);
        expect(features[0].proj).toBe('EPSG:3857');
    });
    test('should get extent from geofile Geojson.extent()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        expect(shp.extent).toStrictEqual([-10, -10, 10, 10]);
    });
    test('should access features by bbox Geojson.bbox()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        const features = await shp.bbox([-20, -20, 20, 0]);
        expect(features.length).toBe(2);
    });
    test('should access features by point Geojson.point()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        const features = await shp.point(10, 10);
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    });
    test('should access features by point Geojson.nearest()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([]);
        const feature = await shp.nearest(50, 50, 40000000);
        expect(feature).not.toBeNull();
        expect(feature.properties.name).toBe('Mary Poppins');
    });
    test('should attribute search ordered Geojson.search()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([{ attribute: 'name', type: geofile_1.GeofileIndexType.ordered }]);
        const features = await shp.search('name', ['Mary Poppins']);
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    });
    /*
    test('should attribute search ordered with null Geojson.search()', async () => {
        const geojson = new Geojson('myclass', new Blob([withnull]))
        await geojson.buildIndexes([{ attribute: 'name', type: GeofileIndexType.ordered }])
        const features = await geojson.search('name', ['Mary Poppins'])
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    })
    */
    test('should attribute fuzzy search exact Shapefile.fuzzy()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([{ attribute: 'name', type: geofile_1.GeofileIndexType.fuzzy }]);
        const features = await shp.fuzzy('name', 'Harry Potter');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    });
    test('should attribute fuzzy search nearby Geojson.fuzzy()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([{ attribute: 'name', type: geofile_1.GeofileIndexType.fuzzy }]);
        const features = await shp.fuzzy('name', 'Harri Potter');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    });
    test('should attribute prefix search Geojson.prefix()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([{ attribute: 'name', type: geofile_1.GeofileIndexType.prefix }]);
        const features = await shp.prefix('name', 'Eliz');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    });
    test('should attribute multi prefix search Geojson.prefix()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([{ attribute: 'name', type: geofile_1.GeofileIndexType.prefix }]);
        const features = await shp.prefix('name', 'Eliz Quee');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    });
    test('should not found found prefix when not all Geojson.prefix()', async () => {
        const shp = new shapefile_1.Shapefile('myclass', new Blob([simpleshp]), new Blob([simpledbf]));
        await shp.buildIndexes([{ attribute: 'name', type: geofile_1.GeofileIndexType.prefix }]);
        const features = await shp.prefix('name', 'Eliz DummY');
        expect(features.length).toBe(0);
    });
});
//# sourceMappingURL=shapefile_test.js.map