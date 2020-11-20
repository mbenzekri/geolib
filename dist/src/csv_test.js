"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csv_1 = require("./csv");
const csvdata_1 = require("../data/csvdata");
const geoindex_1 = require("./geoindex");
describe('Test csv.ts', () => {
    beforeAll(async () => null);
    beforeEach(() => null);
    test('Should create', () => {
        const csv = new csv_1.Csv('address', new Blob([csvdata_1.simple]), { separator: ';', lonlat: ['lon', 'lat'] });
        expect(csv).not.toBeNull();
        expect(csv.name).toBe('address');
    });
    test('Should fail to create', () => {
        expect(() => { new csv_1.Csv('myclass', null); }).toThrow(Error);
    });
    test('should parse simple', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.simple]));
        let count = 0;
        for await (const f of csv.parse()) {
            if (f)
                count++;
        }
        expect(count).toEqual(3);
    });
    test('should parse simple with comment', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withcomment]), { comment: '#' });
        let count = 0;
        for await (const f of csv.parse()) {
            if (f)
                count++;
        }
        expect(count).toEqual(3);
    });
    test('should parse simple with with empty lines', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withcomment]), { comment: '#' });
        let count = 0;
        for await (const f of csv.parse()) {
            if (f)
                count++;
        }
        expect(count).toEqual(3);
    });
    test('should parse simple Csv with skip lines', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.simpleskip3]), { skip: 3 });
        let count = 0;
        for await (const f of csv.parse()) {
            if (f)
                count++;
        }
        expect(count).toEqual(3);
    });
    test('should parse with null attribute', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withnull]));
        const all = [];
        for await (const f of csv.parse()) {
            if (f)
                all.push(f);
        }
        [0, 3, 5].forEach(i => expect(all[i].properties.col2).toBeNull());
        expect(all.length).toEqual(6);
    });
    test('should parse simple with header', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true });
        const all = [];
        for await (const f of csv.parse()) {
            if (f)
                all.push(f);
        }
        expect(all.length).toEqual(3);
        expect(all[0].properties.lon).toBe('-100.000');
        expect(all[0].properties.lat).toBe('-100.000');
        expect(all[0].properties.name).toBe('Harry Potter');
        expect(all[0].properties.gender).toBe('Male');
        expect(all[0].properties.address).toBe('52 Privet Drive - Little Whinging');
    });
    test('should parse simple with header and skip lines', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheaderskip3]), { header: true, skip: 3 });
        const all = [];
        for await (const f of csv.parse()) {
            if (f)
                all.push(f);
        }
        expect(all.length).toEqual(3);
        expect(all[0].properties.lon).toBe('-100.000');
        expect(all[0].properties.lat).toBe('-100.000');
        expect(all[0].properties.name).toBe('Harry Potter');
        expect(all[0].properties.gender).toBe('Male');
        expect(all[0].properties.address).toBe('52 Privet Drive - Little Whinging');
    });
    test('should parse simple with lat,lon names', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        const all = [];
        for await (const f of csv.parse()) {
            if (f)
                all.push(f);
        }
        expect(all.length).toEqual(3);
        expect(all[0].properties.lon).toBe(-100);
        expect(all[0].properties.lat).toBe(-100);
    });
    test('should parse simple with lat,lon numbers', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.simple]), { lonlat: [0, 1] });
        const all = [];
        for await (const f of csv.parse()) {
            if (f)
                all.push(f);
        }
        expect(all.length).toEqual(3);
        expect(all[0].properties.col0).toBe(-100);
        expect(all[0].properties.col1).toBe(-100);
    });
    test('should parse simple empty lines  ', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withempty]));
        const all = [];
        for await (const f of csv.parse()) {
            if (f)
                all.push(f);
        }
        expect(all.length).toEqual(3);
    });
    test('should parse csvban csv', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.csvban]));
        let count = 0;
        for await (const f of csv.parse()) {
            if (f)
                count++;
        }
        expect(count).toEqual(51);
    });
    test('should index handle/rtree geojson ', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        expect(csv.count).toBe(0);
        await csv.buildIndexes([]);
        expect(csv.count).toBe(3);
    });
    test('should random access feature csv.readFeature()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        for (let i = 0; i < 3; i++) {
            const feature = await csv.readFeature(i);
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    });
    test('should random access feature csv.getFeature()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        for (let i = 0; i < 3; i++) {
            const feature = await csv.getFeature(i);
            expect(feature.rank).toBe(i);
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    });
    test('should access all features csv.forEach()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        let count = 0;
        await csv.forEach({
            featureAction: feature => {
                expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][feature.rank]);
                expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][feature.rank]);
                count++;
            }
        });
        expect(count).toBe(3);
    });
    test('should access filtered features csv.forEach()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        const features = [];
        await csv.forEach({
            featureAction: feature => features.push(feature),
            featureFilter: feature => feature.properties.gender === 'Female',
            targetProjection: 'EPSG:3857',
        });
        expect(features.length).toBe(2);
        expect(features[0].proj).toBe('EPSG:3857');
    });
    test('should get extent from geofile csv.extent()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        expect(csv.extent).toStrictEqual([-100, -100, 100, 100]);
    });
    test('should access features by bbox csv.bbox()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        const features = await csv.bbox([-200, -200, 200, 0]);
        expect(features.length).toBe(2);
    });
    test('should access features by point csv.point()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        const features = await csv.point(100, 100);
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    });
    test('should access features by point csv.nearest()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true, lonlat: ['lon', 'lat'] });
        await csv.buildIndexes([]);
        const feature = await csv.nearest(50, 50, 40000000);
        expect(feature).not.toBeNull();
        expect(feature.properties.name).toBe('Mary Poppins');
    });
    test('should attribute search ordered csv.search()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true });
        await csv.buildIndexes([{ attribute: 'name', type: geoindex_1.GeofileIndexType.ordered }]);
        const features = await csv.search('name', ['Mary Poppins']);
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    });
    test('should attribute search ordered with null csv.search()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withnull]));
        await csv.buildIndexes([{ attribute: 'col2', type: geoindex_1.GeofileIndexType.ordered }]);
        const features = await csv.search('col2', ['Mary Poppins']);
        expect(features.length).toBe(1);
        expect(features[0].properties.col2).toBe('Mary Poppins');
    });
    test('should attribute fuzzy search exact csv.fuzzy()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true });
        await csv.buildIndexes([{ attribute: 'name', type: geoindex_1.GeofileIndexType.fuzzy }]);
        const features = await csv.fuzzy('name', 'Harry Potter');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    });
    test('should attribute fuzzy search nearby csv.fuzzy()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true });
        await csv.buildIndexes([{ attribute: 'name', type: geoindex_1.GeofileIndexType.fuzzy }]);
        const features = await csv.fuzzy('name', 'Harri Potter');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    });
    test('should attribute prefix search csv.prefix()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true });
        await csv.buildIndexes([{ attribute: 'name', type: geoindex_1.GeofileIndexType.prefix }]);
        const features = await csv.prefix('name', 'Eliz');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    });
    test('should attribute multi prefix search csv.prefix()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true });
        await csv.buildIndexes([{ attribute: 'name', type: geoindex_1.GeofileIndexType.prefix }]);
        const features = await csv.prefix('name', 'Eliz Quee');
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    });
    test('should not found found prefix when not all csv.prefix()', async () => {
        const csv = new csv_1.Csv('myclass', new Blob([csvdata_1.withheader]), { header: true });
        await csv.buildIndexes([{ attribute: 'name', type: geoindex_1.GeofileIndexType.prefix }]);
        const features = await csv.prefix('name', 'Eliz DummY');
        expect(features.length).toBe(0);
    });
});
//# sourceMappingURL=csv_test.js.map