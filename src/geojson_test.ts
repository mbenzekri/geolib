import { Geojson } from './geojson'
import { GeofileIndexType } from './geoindex'
import { paris, simple, withescape, withescapeerr } from '../data/data'
import { GeofileFeature } from './geofile';

describe('Test geojson.ts', () => {

    beforeEach(() => null);

    test('Should create Geojson', () => {
        const geojson = new Geojson('myclass', new Blob([paris]))
        expect(geojson).not.toBeNull();
        expect(geojson.name).toBe('myclass')
    })
    test('Should fail to create Geojson', () => {
        expect(() => { new Geojson('myclass', null) }).toThrow(Error);
    })
    test('Should fail to parse dummy json', () => {
        const geojson = new Geojson('myclass', new Blob(['{ beurk! }']))
        expect(async () => { for await (const f of geojson.parse()) { f } }).rejects.toMatch('Unexpected char');
    })


    test('should parse simple geojson', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        let count = 0
        for await (const f of geojson.parse()) {
            if (f) count++
        }
        expect(count).toEqual(3);
    })
    test('should parse paris geojson', async () => {
        const geojson = new Geojson('myclass', new Blob([paris]))
        let count = 0
        for await (const f of geojson.parse()) {
            if (f) count++
        }
        expect(count).toEqual(71);
    })

    test('should parse geojson with escape char', async () => {
        const geojson = new Geojson('myclass', new Blob([withescape]))
        let count = 0
        for await (const f of geojson.parse()) {
            if (f) count++
            expect(f.properties['name']).toEqual('Fred\nEric');
        }
        expect(count).toEqual(1);
    })

    test('should fail to parse geojson with invalid escape char', async () => {
        const geojson = new Geojson('myclass', new Blob([withescapeerr]))
        let count = 0
        expect(async () => { for await (const f of geojson.parse()) { f && count++ } }).rejects.toMatch('syntax error valid escaped sequences');
        expect(count).toEqual(0);
    })

    test('should index handle/rtree geojson ', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        expect(geojson.count).toBe(0);
        await geojson.buildIndexes([])
        expect(geojson.count).toBe(3);
    })

    test('should random access feature Geojson.readFeature()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([])
        for (let i = 0; i < 3; i++) {
            const feature = await geojson.readFeature(i)
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    })

    test('should random access feature Geojson.getFeature()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([])
        for (let i = 0; i < 3; i++) {
            const feature = await geojson.getFeature(i)
            expect(feature.rank).toBe(i);
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    })

    test('should access all features Geojson.forEach()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([])
        let count = 0
        await geojson.forEach({
            featureAction: feature => {
                expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][feature.rank])
                expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][feature.rank])
                count++
            }
        })
        expect(count).toBe(3);
    })
    test('should access filtered features Geojson.forEach()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([])
        const features: GeofileFeature[] = []
        await geojson.forEach({
            featureAction: feature => features.push(feature),
            featureFilter: feature => feature.properties.gender === 'Female',
            targetProjection: 'EPSG:3857',
        })
        expect(features.length).toBe(2);
        expect(features[0].proj).toBe('EPSG:3857');
    })
    test('should access features by bbox Geojson.bbox()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([])
        const features = await geojson.bbox([-200, -200, 200, 0])
        expect(features.length).toBe(2);
    })

    test('should access features by point Geojson.point()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([])
        const features = await geojson.point(100, 100)
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    })

    test('should access features by point Geojson.nearest()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([])
        const feature = await geojson.nearest(50, 50, 40000000)
        expect(feature).not.toBeNull();
        expect(feature.properties.name).toBe('Mary Poppins');
    })

    test('should attribute search ordered Geojson.search()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([{ attribute: 'name', type: GeofileIndexType.ordered }])
        const features = await geojson.search('name', ['Mary Poppins'])
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    })

    test('should attribute fuzzy search exact Geojson.fuzzy()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([{ attribute: 'name', type: GeofileIndexType.fuzzy }])
        const features = await geojson.fuzzy('name', 'Harry Potter')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    })


    test('should attribute fuzzy search nearby Geojson.fuzzy()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([{ attribute: 'name', type: GeofileIndexType.fuzzy }])
        const features = await geojson.fuzzy('name', 'Harri Potter')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    })


    test('should attribute prefix search Geojson.prefix()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([{ attribute: 'name', type: GeofileIndexType.prefix }])
        const features = await geojson.prefix('name', 'Eliz')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    })

    test('should attribute multi prefix search Geojson.prefix()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([{ attribute: 'name', type: GeofileIndexType.prefix }])
        const features = await geojson.prefix('name', 'Eliz Quee')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    })

    test('should not found found prefix when not all Geojson.prefix()', async () => {
        const geojson = new Geojson('myclass', new Blob([simple]))
        await geojson.buildIndexes([{ attribute: 'name', type: GeofileIndexType.prefix }])
        const features = await geojson.prefix('name', 'Eliz DummY')
        expect(features.length).toBe(0);
    })




})
