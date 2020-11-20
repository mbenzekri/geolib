"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const geojson_1 = require("./geojson");
const NodeFile_1 = require("./NodeFile");
let geojson = null;
const file = new NodeFile_1.NodeFile('c:/Work/data/france/communes.geojson', 'application/json');
describe('Test geojson.ts for large files', () => {
    beforeAll(async () => {
        geojson = new geojson_1.Geojson('communes', file);
        await geojson.buildIndexes([]);
    }, 300000);
    beforeEach(() => null);
    test('Should create Geojson', () => {
        expect(geojson).not.toBeNull();
        expect(geojson.name).toBe('communes');
        expect(geojson.count).toBe(35798);
    });
    test('Should random access feature Geojson.getFeature()', async () => {
        const f1 = await geojson.getFeature(0); // first
        const f2 = await geojson.getFeature(18000); // middle ~
        const f3 = await geojson.getFeature(35797); // last
        expect(f1.properties.INSEE_COM).toBe("32216");
        expect(f2.properties.INSEE_COM).toBe("68241");
        expect(f3.properties.INSEE_COM).toBe("76106");
    });
});
//# sourceMappingURL=geojson_test_l.js.map