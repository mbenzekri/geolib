export declare const simple = "{\n    \"type\": \"FeatureCollection\",\n    \"features\": [\n      {\n        \"type\": \"Feature\",\n        \"geometry\": {\n          \"type\": \"Point\",\n          \"coordinates\": [ -90.0715, 29.9510 ]\n        },\n        \"properties\": {\n          \"name\": \"Fred\",\n             \"gender\": \"Male\"\n        }\n      },\n      {\n        \"type\": \"Feature\",\n        \"geometry\": {\n          \"type\": \"Point\",\n          \"coordinates\": [ -92.7298, 30.7373 ]\n        },\n        \"properties\": {\n          \"name\": \"Martha\",\n             \"gender\": \"Female\"\n        }\n      },\n      {\n        \"type\": \"Feature\",\n        \"geometry\": {\n          \"type\": \"Point\",\n          \"coordinates\": [ -91.1473, 30.4711 ]\n        },\n        \"properties\": {\n          \"name\": \"Zelda\",\n          \"gender\": \"Female\"\n        }\n      }\n    ]\n  }";
export declare const paris: string;
export declare const withescape = "\n{\n    \"type\": \"FeatureCollection\",\n    \"features\": [\n        {\n        \"type\": \"Feature\",\n        \"geometry\": {\n            \"type\": \"Point\",\n            \"coordinates\": [ -90.0715, 29.9510 ]\n        },\n        \"properties\": {\n            \"name\": \"Fred\\nEric\",\n            \"gender\": \"Male\"\n        }\n    }\n]\n}";
export declare const withescapeerr = "\n{\n    \"type\": \"FeatureCollection\",\n    \"features\": [\n        {\n        \"type\": \"Feature\",\n        \"geometry\": {\n            \"type\": \"Point\",\n            \"coordinates\": [ -90.0715, 29.9510 ]\n        },\n        \"properties\": {\n            \"name\": \"Fred\\zEric\",\n            \"gender\": \"Male\"\n        }\n    }\n]\n}";
