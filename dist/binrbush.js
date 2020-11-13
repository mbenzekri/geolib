"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.binrbush = void 0;
const rbush_1 = require("./rbush");
// tslint:disable-next-line:class-name
class binrbush extends rbush_1.rbush {
    constructor() {
        super(binrbush.RTREE_CHILD_MAX);
    }
    toBinary() {
        const node = this.toJSON();
        const buflen = binrbush.NODE_SIZE * this.nodeCount(node);
        const dv = new DataView(new ArrayBuffer(buflen));
        this.write(dv, node, 0);
        return dv.buffer;
    }
    nodeCount(node) {
        return 1 + (node.leaf
            ? node.children.length
            : node.children.reduce((prev, cur) => prev + this.nodeCount(cur), 0));
    }
    write(dv, node, pos) {
        pos = this.writeNode(dv, node, pos);
        if (node.leaf) {
            pos = node.children.reduce((prev, cur) => this.writeCluster(dv, cur, prev), pos);
        }
        else {
            pos = node.children.reduce((prev, cur, idx, arr) => {
                const next = this.write(dv, cur, prev);
                if (idx < (arr.length - 1)) {
                    dv.setUint32(prev + 21, next);
                }
                return next;
            }, pos);
        }
        return pos;
    }
    writeNode(dv, node, pos) {
        // console.log("Writing node [",pos,"]:");
        dv.setUint8(pos, node.height);
        dv.setFloat32(pos + 1, node.bbox[0],true);
        dv.setFloat32(pos + 5, node.bbox[1],true);
        dv.setFloat32(pos + 9, node.bbox[2],true);
        dv.setFloat32(pos + 13, node.bbox[3],true);
        dv.setUint32(pos + 17, pos + binrbush.NODE_SIZE,true); // first child
        dv.setUint32(pos + 21, 0,true); // next brother
        return pos += binrbush.NODE_SIZE;
    }
    writeCluster(dv, leaf, pos) {
        // console.log("Writing leaf [",pos,"]: ");
        dv.setUint8(pos, 0);
        dv.setFloat32(pos + 1, leaf[0],true); // xmin BBOX
        dv.setFloat32(pos + 5, leaf[1],true); // ymin BBOX
        dv.setFloat32(pos + 9, leaf[2],true); // xmax BBOX
        dv.setFloat32(pos + 13, leaf[3],true); // ymax BBOX
        dv.setUint32(pos + 17, leaf[4],true); // rank number of the feature
        dv.setUint32(pos + 21, leaf[5],true); // feature count
        return pos += binrbush.NODE_SIZE;
    }
    dump(dv) {
        for (let pos = 0; pos < dv.byteLength; pos += binrbush.NODE_SIZE) {
            const height = dv.getUint8(pos);
            const xmin = dv.getFloat32(pos + 1,true); // xmin BBOX
            const ymin = dv.getFloat32(pos + 5,true); // ymin BBOX
            const xmax = dv.getFloat32(pos + 9,true); // xmax BBOX
            const ymax = dv.getFloat32(pos + 13,true); // ymax BBOX
            const leaf = (height === 1);
            const cluster = (height === 0);
            const node = (height > 1);
            const child = dv.getUint32(pos + 17,true); // rank number of the feature
            const next = dv.getUint32(pos + 21,true); // feature count
            const rank = dv.getUint32(pos + 17,true); // rank number of the feature
            const count = dv.getUint32(pos + 21,true); // feature count
            switch (height) {
                case 0:
                    console.log('%s clst : H=%s BBOX[%s,%s,%s,%s] rank=%s count=%s ', pos, height, xmin, ymin, xmax, ymax, rank, count);
                    break;
                case 1:
                    console.log('%s leaf : H=%s BBOX[%s,%s,%s,%s] first=%s next=%s ', pos, height, xmin, ymin, xmax, ymax, child, next);
                    break;
                default:
                    console.log('%s node : H=%s BBOX[%s,%s,%s,%s] child=%s next=%s ', pos, height, xmin, ymin, xmax, ymax, child, next);
            }
        }
    }
}
exports.binrbush = binrbush;
binrbush.RTREE_CHILD_MAX = 20;
binrbush.NODE_SIZE = 25;
//# sourceMappingURL=binrbush.js.map