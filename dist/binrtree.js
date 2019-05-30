"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
var BinRtree = /** @class */ (function () {
    function BinRtree(dataview) {
        this.dv = dataview;
    }
    BinRtree.prototype.extent = function () {
        return [this.dv.getFloat32(1), this.dv.getFloat32(5),
            this.dv.getFloat32(9), this.dv.getFloat32(13)];
    };
    BinRtree.prototype.isnode = function (node) { return (this.height(node) > 1); };
    BinRtree.prototype.isleaf = function (node) { return (this.height(node) === 1); };
    BinRtree.prototype.iscluster = function (node) { return (this.height(node) === 0); };
    BinRtree.prototype.height = function (node) { return this.dv.getUint8(node); };
    BinRtree.prototype.child = function (node) { return this.dv.getUint32(node + 17); };
    BinRtree.prototype.cluster = function (node) {
        return [
            this.dv.getFloat32(node + 1), this.dv.getFloat32(node + 5),
            this.dv.getFloat32(node + 9), this.dv.getFloat32(node + 13),
            this.dv.getUint32(node + 17), this.dv.getUint32(node + 21)
        ];
    };
    BinRtree.prototype.next = function (node) {
        if (this.iscluster(node)) {
            var next = node + 25;
            return (next < this.dv.byteLength && this.iscluster(next)) ? next : null;
        }
        else {
            var next = this.dv.getUint32(node + 21);
            return (next < this.dv.byteLength && next > 0) ? next : null;
        }
    };
    BinRtree.prototype.clusters = function (node, result) {
        var acluster;
        if (!this.isleaf(node)) {
            return result;
        }
        for (acluster = this.child(node); acluster < this.dv.byteLength && this.iscluster(acluster); acluster = this.next(acluster)) {
            result.push(this.cluster(acluster));
        }
        return result;
    };
    BinRtree.prototype.contains = function (a, node) {
        return a[0] <= this.dv.getFloat32(node + 1) &&
            a[1] <= this.dv.getFloat32(node + 5) &&
            this.dv.getFloat32(node + 9) <= a[2] &&
            this.dv.getFloat32(node + 13) <= a[3];
    };
    BinRtree.prototype.intersects = function (a, node) {
        return this.dv.getFloat32(node + 1) <= a[2] &&
            this.dv.getFloat32(node + 5) <= a[3] &&
            this.dv.getFloat32(node + 9) >= a[0] &&
            this.dv.getFloat32(node + 13) >= a[1];
    };
    BinRtree.prototype._all = function (node, result) {
        var achild;
        var nodesToSearch = [];
        while (node !== undefined) {
            if (this.isleaf(node)) {
                this.clusters(node, result);
            }
            else {
                for (achild = this.child(node); achild !== null; achild = this.next(achild)) {
                    nodesToSearch.push(achild);
                }
            }
            node = nodesToSearch.pop();
        }
        return result;
    };
    BinRtree.prototype.search = function (bbox) {
        var node = 0, achild;
        var result = [], nodesToSearch = [];
        if (!this.intersects(bbox, node)) {
            return result;
        }
        if (this.isleaf(node)) {
            return this.clusters(node, result);
        }
        while (node !== undefined) {
            achild = this.child(node);
            while (achild !== null) {
                if (this.intersects(bbox, achild)) {
                    if (this.isleaf(achild)) {
                        this.clusters(achild, result);
                    }
                    else if (this.contains(bbox, achild)) {
                        this._all(achild, result);
                    }
                    else {
                        nodesToSearch.push(achild);
                    }
                }
                achild = this.next(achild);
            }
            node = nodesToSearch.pop();
        }
        return result;
    };
    return BinRtree;
}());
exports.BinRtree = BinRtree;
//# sourceMappingURL=binrtree.js.map