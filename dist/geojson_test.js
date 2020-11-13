"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const geojson_1 = require("./geojson");
describe('Test person.ts', () => {
    beforeEach(() => null);
    test('should say', () => {
        const file = new Blob(["It is my data file"]);
        const geojson = new geojson_1.Geojson('myclass', file);
        expect(geojson).not.toBeNull();
    });
});
//# sourceMappingURL=geojson_test.js.map