/* eslint-disable */ 

import { rbush } from './rbush'

// tslint:disable-next-line:class-name
export class binrbush extends rbush {
    static readonly RTREE_CHILD_MAX = 20;
    static readonly NODE_SIZE = 25;

    constructor() {
        super(binrbush.RTREE_CHILD_MAX);
    }

    toBinary() {
        const node = (<any>this).toJSON();
        const buflen = binrbush.NODE_SIZE * this.nodeCount(node);
        const dv = new DataView(new ArrayBuffer(buflen));
        this.write(dv, node, 0);
        return dv.buffer;
    }

    nodeCount(node: any) {
        return 1 + (node.leaf
            ? node.children.length
            : node.children.reduce((prev: number, cur: any) => prev + this.nodeCount(cur), 0)
        );
    }

    write(dv: DataView, node: any, pos: number) {
        pos = this.writeNode(dv, node, pos);
        if (node.leaf) {
            pos = node.children.reduce((prev: number, cur: any) => this.writeCluster(dv, cur, prev), pos);
        } else {
            pos = node.children.reduce((prev: number, cur: any, idx: number, arr: any[]) => {
                const next = this.write(dv, cur, prev);
                if (idx < (arr.length - 1)) { dv.setUint32(prev + 21, next,true); }
                return next;
            }, pos);
        }
        return pos;
    }

    writeNode(dv: DataView, node: any, pos: number) {
        // console.log("Writing node [",pos,"]:");
        dv.setUint8(pos, node.height);
        dv.setFloat32(pos + 1, node.bbox[0],true);
        dv.setFloat32(pos + 5, node.bbox[1],true);
        dv.setFloat32(pos + 9, node.bbox[2],true);
        dv.setFloat32(pos + 13, node.bbox[3],true);
        dv.setUint32(pos + 17, pos + binrbush.NODE_SIZE,true);  // first child
        dv.setUint32(pos + 21, 0,true);                          // next brother
        return pos += binrbush.NODE_SIZE;
    }

    writeCluster(dv: DataView, leaf: number[], pos: number) {
        // console.log("Writing leaf [",pos,"]: ");
        dv.setUint8(pos, 0);
        dv.setFloat32(pos + 1, leaf[0],true);    // xmin BBOX
        dv.setFloat32(pos + 5, leaf[1],true);    // ymin BBOX
        dv.setFloat32(pos + 9, leaf[2],true);    // xmax BBOX
        dv.setFloat32(pos + 13, leaf[3],true);   // ymax BBOX
        dv.setUint32(pos + 17, leaf[4],true);    // rank number of the feature
        dv.setUint32(pos + 21, leaf[5],true);    // feature count
        return pos += binrbush.NODE_SIZE;
    }

    dump(dv: DataView) {
        console.log(`file\tnode\ttype\theight\txmin\tymin\txmax\tymax\trank_node\tcount_next`);
        for (let pos = 0; pos < dv.byteLength; pos += binrbush.NODE_SIZE) {
            const height = dv.getUint8(pos);
            const xmin = dv.getFloat32(pos + 1,true);    // xmin BBOX
            const ymin = dv.getFloat32(pos + 5,true);    // ymin BBOX
            const xmax = dv.getFloat32(pos + 9,true);    // xmax BBOX
            const ymax = dv.getFloat32(pos + 13,true);   // ymax BBOX
            const type = (height === 1) ? 'leaf' : (height === 0) ? 'cluster' : 'node'
            const rank = dv.getUint32(pos + 17,true);  // rank number of the feature
            const count = dv.getUint32(pos + 21,true);  // feature count

            console.log(`\t${pos}\t${type}\t${height}\t${xmin}\t${ymin}\t${xmax}\t${ymax}\t${rank}\t${count}`);
        }
    }

}
