export declare class BinRtree {
    dv: DataView;
    constructor(dataview: DataView);
    extent(): number[];
    isnode(node: number): boolean;
    isleaf(node: number): boolean;
    iscluster(node: number): boolean;
    height(node: number): number;
    child(node: number): number;
    cluster(node: number): number[];
    next(node: number): number;
    clusters(node: any, result: any): any;
    contains(a: any, node: any): boolean;
    intersects(a: any, node: any): boolean;
    _all(node: any, result: any): any;
    search(bbox: any): any;
}
