import { rbush } from './rbush';
export declare class binrbush extends rbush {
    static readonly RTREE_CHILD_MAX = 9;
    static readonly NODE_SIZE = 25;
    constructor();
    toBinary(): ArrayBuffer;
    nodeCount(node: any): any;
    write(dv: DataView, node: any, pos: number): number;
    writeNode(dv: DataView, node: any, pos: number): number;
    writeCluster(dv: DataView, leaf: number[], pos: number): number;
}
