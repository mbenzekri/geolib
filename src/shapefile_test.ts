import { getFile } from './fileapi'
import './fileapi'
import { Shapefile, GeofileFeature, GeofileIndexType } from './index'

let simpleshp, simpledbf

// const simpledbf = fs.readFileSync('./data/simple.dbf').buffer
// async function readfile(filename: string): Promise<ArrayBuffer> {
//     return new Promise((resolve,reject) => {
//         fs.readFile(filename,(err,data)=> {
//             if (err) return reject(Error (`Unable to read file ${filename}`))
//             resolve(data.buffer)
//         })
//     })
// }

describe('Test shapefile.ts', () => {

    beforeAll(async () => {
        simpleshp = getFile('./data/shp/simple.shp')
        simpledbf = getFile('./data/shp/simple.dbf')
    })
    beforeEach(() => null);

    test('Should create Shapefile', () => {
        const shp = new Shapefile('myclass', new Blob([' blob shp ']), new Blob([' blob dbf ']))
        expect(shp).not.toBeNull();
        expect(shp.name).toBe('myclass')
    })
    test('Should fail to create Shapefile', () => {
        expect(() => { new Shapefile('myclass', null, null) }).toThrow(Error);
    })

    test('should parse simple Shapefile', async () => {
        const shp = new Shapefile('myclass', simpleshp)
        let count = 0
        for await (const f of shp.parse()) {
            expect(f.geometry).not.toBeNull()
            expect(f.geometry.type).toBe('Point')
            expect(f.geometry.coordinates).toStrictEqual([[-10, -10], [10, 10], [10, -10]][count])
            count++
        }
        expect(count).toEqual(3);
    })

    test('should index handle/rtree shapefile ', async () => {
        const shp = new Shapefile('myclass', simpleshp)
        expect(shp.count).toBe(0);
        await shp.buildIndexes([])
        expect(shp.count).toBe(3);
    })
    test('should random access feature Shapefile.readFeature()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        for (let i = 0; i < 3; i++) {
            const feature = await shp.readFeature(i)
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    })

    test('should random access feature Shapefile.getFeature()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        for (let i = 0; i < 3; i++) {
            const feature = await shp.getFeature(i)
            expect(feature.rank).toBe(i);
            expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][i]);
            expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][i]);
        }
    })

    test('should access all features Shapefile.forEach()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        let count = 0
        await shp.forEach({
            featureAction: feature => {
                expect(feature.properties.name).toBe(['Harry Potter', 'Mary Poppins', 'Queen Elizabeth II'][feature.rank])
                expect(feature.properties.gender).toBe(['Male', 'Female', 'Female'][feature.rank])
                count++
            }
        })
        expect(count).toBe(3);
    })

    test('should access filtered features Shapefile.forEach()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        const features: GeofileFeature[] = []
        await shp.forEach({
            featureAction: feature => features.push(feature),
            featureFilter: feature => feature.properties.gender === 'Female',
            targetProjection: 'EPSG:3857',
        })
        expect(features.length).toBe(2);
        expect(features[0].proj).toBe('EPSG:3857');
    })

    test('should get extent from geofile Shapefile.extent()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        expect(shp.extent).toStrictEqual([-10, -10, 10, 10]);
    })

    test('should access features by bbox Shapefile.bbox()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        const features = await shp.bbox([-20, -20, 20, 0])
        expect(features.length).toBe(2);
    })

    test('should access features by point Shapefile.point()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        const features = await shp.point(10, 10)
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    })

    test('should access features by point Shapefile.nearest()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([])
        const feature = await shp.nearest(50, 50, 40000000)
        expect(feature).not.toBeNull();
        expect(feature.properties.name).toBe('Mary Poppins');
    })

    test('should attribute search ordered Shapefile.search()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([{ attribute: 'name', type: GeofileIndexType.ordered }])
        const features = await shp.search('name', ['Mary Poppins'])
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Mary Poppins');
    })

    test('should attribute fuzzy search exact Shapefile.fuzzy()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([{ attribute: 'name', type: GeofileIndexType.fuzzy }])
        const features = await shp.fuzzy('name', 'Harry Potter')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    })

    test('should attribute fuzzy search nearby Shapefile.fuzzy()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([{ attribute: 'name', type: GeofileIndexType.fuzzy }])
        const features = await shp.fuzzy('name', 'Harri Potter')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Harry Potter');
    })


    test('should attribute prefix search Shapefile.prefix()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([{ attribute: 'name', type: GeofileIndexType.prefix }])
        const features = await shp.prefix('name', 'Eliz')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    })

    test('should attribute multi prefix search Shapefile.prefix()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([{ attribute: 'name', type: GeofileIndexType.prefix }])
        const features = await shp.prefix('name', 'Eliz Quee')
        expect(features.length).toBe(1);
        expect(features[0].properties.name).toBe('Queen Elizabeth II');
    })

    test('should not found found prefix when not all Shapefile.prefix()', async () => {
        const shp = new Shapefile('myclass', simpleshp, simpledbf)
        await shp.buildIndexes([{ attribute: 'name', type: GeofileIndexType.prefix }])
        const features = await shp.prefix('name', 'Eliz DummY')
        expect(features.length).toBe(0);
    })

})
