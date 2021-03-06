/* eslint-disable */ 
 /*
    Binary Rtree search class. Allow for spatial searching in rtree stored in an arraybuffer.
    this rtree is first produced by rbush ((c) 2013, Vladimir Agafonkin)) and then transform
    in binary format an arraybuffer.

    this arraybuffer is compose of a list of record of three different type but
    same length: node,leaf and cluster all binary data are Big Endian ordered or
    IEEE 32bytes floats
    ----------------------------------------------------------------------------
    type cluster
    ----------------------------------------------------------------------------
    name       type     bytes   desc/value
    ----------------------------------------------------------------------------
    height      uint    1       constant = 0 => record type cluster
    xmin        float   4       cluster lower bound x coordinate
    ymin        float   4       cluster lower bound y coordinate
    xmax        float   4       cluster upper bound x coordinate
    ymax        float   4       cluster upper bound y coordinate
    rank        uint    4       rank of the feature in its datafile
    count       uint    4       feature count in this cluster
    ----------------------------------------------------------------------------
    type leaf
    ----------------------------------------------------------------------------
    name       type     bytes   desc/value
    ----------------------------------------------------------------------------
    height      uint    1       constante = 1 => record type leaf
    xmin        float   4       leaf lower bound x coordinate (child cluster included)
    ymin        float   4       leaf lower bound y coordinate (child cluster included)
    xmax        float   4       leaf upper bound x coordinate (child cluster included)
    ymax        float   4       leaf upper bound y coordinate (child cluster included)
    child       uint    4       offset dans l'ArrayBuffer du premier cluster fils
    next        uint    4       offset dans l'ArrayBuffer du frere suivant dans l'arbre
    ----------------------------------------------------------------------------
    type node
    ----------------------------------------------------------------------------
    name       type     bytes   desc/value
    ----------------------------------------------------------------------------
    height      uint    1       constante > 1 => record type node and height in the rtree
    xmin        float   4       node lower bound x coordinate (included node,leaf,cluster descendant)
    ymin        float   4       node lower bound y coordinate (included node,leaf,cluster descendant)
    xmax        float   4       node upper bound x coordinate (included node,leaf,cluster descendant)
    ymax        float   4       node upper bound y coordinate (included node,leaf,cluster descendant)
    child       uint    4       offset in arrayBuffer  the first child node or leaf
    next        uint    4       offset in arrayBuffer  the next brother  child node or leaf

*/
export class BinRtree {
    dv: DataView;
    constructor(dataview: DataView) { this.dv = dataview; }
    get count() { return this.dv.byteLength / 25 }
    extent() {
        return [this.dv.getFloat32(1,true), this.dv.getFloat32(5,true),
        this.dv.getFloat32(9,true), this.dv.getFloat32(13,true)];
    }
    isnode(node: number) { return (this.height(node) > 1); }
    isleaf(node: number) { return (this.height(node) === 1); }
    iscluster(node: number) { return (this.height(node) === 0); }
    height(node: number) { return this.dv.getUint8(node); }
    child(node: number) { return this.dv.getUint32(node + 17,true); }
    cluster(node: number) {
        return [
            this.dv.getFloat32(node + 1,true), this.dv.getFloat32(node + 5,true),
            this.dv.getFloat32(node + 9,true), this.dv.getFloat32(node + 13,true),
            this.dv.getUint32(node + 17,true), this.dv.getUint32(node + 21,true),
            node
        ];
    }
    next(node: number) {
        if (this.iscluster(node)) {
            const next = node + 25;
            return (next < this.dv.byteLength && this.iscluster(next)) ? next : null;
        } else {
            const next = this.dv.getUint32(node + 21,true);
            return (next < this.dv.byteLength && next > 0) ? next : null;
        }
    }

    clusters(node, bbox, result) {
        let acluster;
        if (!this.isleaf(node)) { return result; }
        for (acluster = this.child(node);
            acluster < this.dv.byteLength && this.iscluster(acluster);
            acluster = this.next(acluster)
        ) { if (!bbox || this.intersects(bbox, acluster)) result.push(this.cluster(acluster)); }
        return result;
    }

    contains(a, node) {
        return  a[0] <= this.dv.getFloat32(node + 1,true) &&
                a[1] <= this.dv.getFloat32(node + 5,true) &&
                this.dv.getFloat32(node + 9,true) <= a[2] &&
                this.dv.getFloat32(node + 13,true) <= a[3];
    }

    intersects(a, node) {
        return  this.dv.getFloat32(node + 1,true) <= a[2] &&
                this.dv.getFloat32(node + 5,true) <= a[3] &&
                this.dv.getFloat32(node + 9,true) >= a[0] &&
                this.dv.getFloat32(node + 13,true) >= a[1];
    }

    _all(node, result) {
        let achild;
        const nodesToSearch = [];
        while (node !== undefined) {
            if (this.isleaf(node)) { this.clusters(node, null, result); } else {
                for (achild = this.child(node);
                    achild !== null;
                    achild = this.next(achild)
                ) { nodesToSearch.push(achild); }
            }
            node = nodesToSearch.pop();
        }
        return result;
    }

    search(bbox) {
        let node = 0, achild;
        const result = [], nodesToSearch = [];
        if (!this.intersects(bbox, node)) { return result; }
        if (this.isleaf(node)) { return this.clusters(node,bbox, result); }
        while (node !== undefined) {
            achild = this.child(node);
            while (achild !== null) {
                if (this.intersects(bbox, achild)) {
                    if (this.isleaf(achild)) {
                        this.clusters(achild,bbox, result);
                    } else if (this.contains(bbox, achild)) {
                        this._all(achild, result);
                    } else {
                        nodesToSearch.push(achild);
                    }
                }
                achild = this.next(achild);
            }
            node = nodesToSearch.pop();
        }
        return result;
    }

    dump() {
        console.log(`file\tnode\ttype\theight\txmin\tymin\txmax\tymax\trank_node\tcount_next`);
        for (let pos = 0; pos < this.dv.byteLength; pos += 25) {
            const height = this.dv.getUint8(pos);
            const xmin = this.dv.getFloat32(pos + 1,true);    // xmin BBOX
            const ymin = this.dv.getFloat32(pos + 5,true);    // ymin BBOX
            const xmax = this.dv.getFloat32(pos + 9,true);    // xmax BBOX
            const ymax = this.dv.getFloat32(pos + 13,true);   // ymax BBOX
            const type = (height === 1) ? 'leaf' : (height === 0) ? 'cluster' : 'node'
            const rank = this.dv.getUint32(pos + 17,true);  // rank number of the feature
            const count = this.dv.getUint32(pos + 21,true);  // feature count
            console.log(`\t${pos}\t${type}\t${height}\t${xmin}\t${ymin}\t${xmax}\t${ymax}\t${rank}\t${count}`);
        }
    }
}
