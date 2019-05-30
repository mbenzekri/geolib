'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var polyfill_1 = require("./polyfill");
polyfill_1._();
var ISNODE = (typeof window === 'undefined');
var fs = ISNODE ? eval("require('fs');") : null;
var win;
if (!ISNODE) {
    // pour eviter les erreur de compilation
    var win_1 = window;
    if (win_1.webkitRequestFileSystem && !win_1.requestFileSystem) {
        win_1.requestFileSystem = win_1.webkitRequestFileSystem;
    }
}
/**
 * this class store the download state for a download to come
 */
var DownloadState = /** @class */ (function () {
    function DownloadState() {
        this.loaded = 0;
        this.total = 0;
        this.begin = Date.now();
        this.end = Date.now();
        this.elapsed = 0;
        this.left = 0;
        this.rate = 0;
        this.status = '';
    }
    Object.defineProperty(DownloadState.prototype, "loadedpc", {
        /**
         *  percentage of loaded bytes
         */
        get: function () { return (this.total > 0) ? Math.round(100 * this.loaded / this.total) : 0; },
        enumerable: true,
        configurable: true
    });
    /**
       *  signal start of download
       */
    DownloadState.prototype.start = function () { this.begin = this.end = Date.now(); };
    /**
       *  signal end of download
       */
    DownloadState.prototype.terminate = function () { this.update(); };
    /**
     * update download status
     * @param status - text status to set
     */
    DownloadState.prototype.updateStatus = function (status) { this.status = status; };
    /**
       * update the progress state loaded and total bytes and calculate timing data.
       * loaded and total are optionals, if not present update only timing data (end/elapsed/left/rate)
       * @param loaded number of loaded bytes
       * @param total total bytes expected
       */
    DownloadState.prototype.update = function (loaded, total) {
        if (loaded) {
            this.loaded = loaded;
        }
        if (total) {
            this.total = total;
        }
        this.end = Date.now();
        this.elapsed = this.end - this.begin;
        this.rate = Math.ceil(this.loaded / (this.elapsed / 1000));
        this.left = Math.ceil(this.rate > 0 ? (this.total - this.loaded) * 1000 / this.rate : 0);
    };
    return DownloadState;
}());
/**
 * class to manage a resource download process (via XHR) and follow progress state
   * @example {
   *    let url = '/my/ressource/path/file.json'
   *    let notify = function (state) => { console.log(state.loaded);}) // see DownloadState for more state attribute
   *
   *    let dl = new Download(url, 'json', notify)
   *    dl.then((data) => {console.log('success: ', data)}.catch((err) => {console.log('faillure: ',e.message)}
   *  OR
   *    Download.download(url, 'json', notify)
   *    .then((data) => {console.log('success: ', data)}.catch((err) => {console.log('faillure: ',e.message)}
   * }
   */
var Download = /** @class */ (function () {
    /**
     * @param url - url of the ressource to download
     * @param resptype - expected response type ("arraybuffer","blob","document","json","text" default to blob')
     * @param notify - on progress notify callback : function(state DownloadState):void
     */
    function Download(url, resptype, notify) {
        if (resptype === void 0) { resptype = 'blob'; }
        if (notify === void 0) { notify = function () { }; }
        this.url = url;
        this.notify = notify;
        this.resptype = resptype;
        this.xhr = null;
        this.state = null;
    }
    /**
     * download a resource with notification handler
     * for params see [constructor Download]{@link Download#constructor}
     */
    Download.download = function (url, resptype, notify) {
        var dl = new Download(url, resptype, notify);
        return dl.process();
    };
    /**
     * run the download process and return a promise which is fullfilled in download termination
     * resolved for success and reject when failed. notify call are trigerred on download state changes
     * @returns the promise
     */
    Download.prototype.process = function () {
        var _this_1 = this;
        var _this = this;
        var xhr = this.xhr = new XMLHttpRequest();
        var state = this.state = new DownloadState();
        return new Promise(function (resolve, reject) {
            xhr.onprogress = function (evt) {
                if (!evt.lengthComputable) {
                    return;
                }
                _this.update(evt.loaded, evt.total);
            };
            xhr.onload = function (evt) {
                var size = (xhr.responseType === 'json') ? 1 : xhr.response.size;
                _this.update(size, size, xhr.statusText);
            };
            xhr.onerror = function (evt) {
                _this.update();
                state.terminate();
                reject(new Error(evt['message'] || 'Unable to load resource (CORS ?)'));
            };
            xhr.onabort = function (evt) {
                _this.update();
                state.terminate();
                reject(new Error('Canceled by user'));
            };
            xhr.onloadend = function () {
                _this.update(null, null, _this.url + ' reply with ' + xhr.status);
                if (xhr.status >= 400) {
                    state.terminate();
                    reject(new Error(_this.url + ' reply with ' + xhr.status));
                }
                else {
                    var size = (xhr.responseType === 'json') ? 1 : xhr.response.size;
                    _this.update(size, size, xhr.statusText);
                    0;
                    resolve(xhr.response);
                }
            };
            xhr.open('GET', _this_1.url, true);
            xhr.responseType = _this_1.resptype;
            state.start();
            xhr.send(null);
        });
    };
    /**
     *  call this method to abort the download
     */
    Download.prototype.abort = function () {
        if (this.xhr) {
            this.xhr.abort();
        }
        this.xhr = null;
    };
    /**
     * update the state of the download state and notify changes
     * @param loaded - numer of current loaded bytes
     * @param total - total bytes to download
     * @param status - status text
     */
    Download.prototype.update = function (loaded, total, status) {
        this.state.update(loaded, total);
        if (status) {
            this.state.updateStatus(status);
        }
        this.notify(this.state);
    };
    return Download;
}());
exports.Download = Download;
var FSFormat;
(function (FSFormat) {
    FSFormat["binarystring"] = "binarystring";
    FSFormat["arraybuffer"] = "arraybuffer";
    FSFormat["text"] = "text";
    FSFormat["dataurl"] = "dataurl";
})(FSFormat || (FSFormat = {}));
exports.FSFormat = FSFormat;
/**
 * File system api base class
 */
var FSys = /** @class */ (function () {
    function FSys() {
    }
    /**
     * Initialise File System API with <nbytes> bytes requested (space requested on file system)
     * @param nbytes - number of bytes requested
     * @returns a promise resolve if the granted request is ok, reject in failure
     * @description this static method initialize File system API by requesting an amount of bytes.
     *              caution ! this request may cause a prompt window to popup for user acceptance
     */
    FSys.init = function (nbytes) {
        if (ISNODE) {
            if (nbytes > FSys.granted) {
                FSys.granted = nbytes;
            }
            return Promise.resolve(FSys.granted);
        }
        if (FSys.granted >= nbytes) {
            return Promise.resolve(FSys.granted);
        }
        return new Promise(function (resolve, reject) {
            navigator.webkitPersistentStorage.queryUsageAndQuota(function (usedBytes, grantedBytes) {
                // MBZ TODO we must do somethink if grantedbyte < nbytes (alert user ?)
                if (grantedBytes >= 0) {
                    FSys.granted = (grantedBytes === 0) ? nbytes : grantedBytes;
                    window.requestFileSystem(window.PERSISTENT, grantedBytes, function (fs) {
                        FSys.fs = fs;
                        resolve(grantedBytes);
                    }, reject);
                }
                else {
                    navigator.webkitPersistentStorage.requestQuota(nbytes, function (gbytes) {
                        FSys.granted = gbytes;
                        window.requestFileSystem(window.PERSISTENT, gbytes, function (fs) {
                            FSys.fs = fs;
                            resolve(gbytes);
                        }, reject);
                    }, reject);
                }
            }, reject);
        });
    };
    /**
     * Test if File System API is initialized if not so throws an exception
     * @throws {Error} if FS API not initialized
     */
    FSys.ready = function () {
        if (!ISNODE && (!FSys.fs || !FSys.fs.root || FSys.granted <= 0)) {
            throw (new Error('FS API not initialized or not supported !'));
        }
    };
    FSys.hasDisk = function (fullname) {
        return /^[A-Za-z]:/.test(fullname);
    };
    FSys.extname = function (filename) {
        var arr = /\.[^.]*$/.exec(filename);
        return arr ? arr[0] : '';
    };
    FSys.basename = function (filename) {
        var arr = /[^\\/]+$/.exec(filename);
        return arr ? arr[0] : '';
    };
    FSys.fs = null;
    FSys.granted = null;
    return FSys;
}());
exports.FSys = FSys;
/**
  * file system class for directory operations
 */
var FSDir = /** @class */ (function (_super) {
    __extends(FSDir, _super);
    function FSDir() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(FSDir, "fs", {
        get: function () { FSys.ready(); return FSys.fs; },
        enumerable: true,
        configurable: true
    });
    /**
     * create path recursively
     * @param path - full path of the directory
     * @returns a promise that create the directory an resolve returning dirEntry (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    FSDir.create = function (path) {
        var _this_1 = this;
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(path))
                    return reject(new Error('FSDir.create disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                var names = path.split(/[\\\/]+/);
                var fullpath = '';
                names.forEach(function (sdir) {
                    fullpath += (fullpath ? '/' : '') + sdir;
                    var stats = fs.statSync(fullpath);
                    if (stats.isFile())
                        throw new Error("FSDir.create on directory " + path + " but " + fullpath + " is a file");
                    if (!stats.isDirectory()) {
                        fs.mkdirSync(fullpath);
                    }
                });
                resolve();
            });
        }
        return new Promise(function (resolve, reject) {
            FSys.ready();
            var dive = function (dentry, folders) {
                if (folders.length === 0) {
                    return resolve(dentry);
                }
                if (folders[0] === '') {
                    dive(dentry, folders.slice(1));
                }
                else {
                    dentry.getDirectory(folders[0], { create: true }, function (de) { return dive(de, folders.slice(1)); }, reject);
                }
            };
            dive(FSys.fs.root, path.split('/'));
        });
    };
    /**
     * delete path recursively
     * @param path - full path of the directory
     * @returns a promise that delete the directory an resolve in success with no result (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    FSDir.delete = function (path) {
        var _this_1 = this;
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(path))
                    return reject(new Error('FSDir.create disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                if (fs.existsSync(path) && fs.statSync(path).isDirectory()) {
                    // MBZ TODO must delete all directory content recursively
                    fs.rmdirSync(path);
                }
                resolve(true);
            });
        }
        return FSDir.read(path).then(function (dentry) {
            return new Promise(function (resolve, reject) {
                dentry.removeRecursively(function () { return resolve(true); }, reject);
            });
        });
    };
    /**
     * delete path recursively
     * @param path - full path of the directory
     * @returns a promise that delete the directory an resolve in success with no result (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    FSDir.remove = function (path) {
        return FSDir.delete(path);
    };
    /**
     * get the directory entry for path
     * @param path - full path of the directory
     * @returns a promise that read the directory an resolve in success with directory entry (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    FSDir.read = function (path) {
        if (ISNODE) {
            throw new Error("FSDir.read not implemented non sense for node.js !");
        }
        return new Promise(function (resolve, reject) {
            FSys.ready();
            var dive = function (dentry, folders) {
                if (folders.length === 0) {
                    return resolve(dentry);
                }
                dentry.getDirectory(folders[0], { create: false }, function (de) { return dive(de, folders.slice(1)); }, reject);
            };
            dive(FSys.fs.root, path.split('/'));
        });
    };
    /**
     * get a directory metadata for path
     * a metadata object includes the file's size (size property) and modification date and time (modificationTime)
     * @param path - full path of the directory
     * @returns a promise that read the directory an resolve in success with directory metadata (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    FSDir.metadata = function (path) {
        var _this_1 = this;
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(path))
                    return reject(new Error('FSDir.create disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                var stats = fs.statSync(path);
                return { modificationTime: stats.mtime, size: stats.size };
            });
        }
        return FSDir.read(path).then(function (dentry) {
            return new Promise(function (resolve, reject) {
                dentry.getMetadata(resolve, reject);
            });
        });
    };
    /**
     * get a directory file map (plain Object)
     * each filename is a property and each property have a value object containing (fullpath,time,size)
     * corresponding to fullpath name, modification date/time and size of the file.
     * @param path - full path of the directory
     * @returns a promise that read the directory an resolve in success with map object (or fileError in reject case)
     * @throws {Error} - if FS API not initialized
     */
    FSDir.files = function (path, re, deep) {
        var _this_1 = this;
        if (re === void 0) { re = /.*/; }
        if (deep === void 0) { deep = false; }
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(path))
                    return reject(new Error('FSDir.create disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                var stack = [path];
                var files = [];
                while (stack.length > 0) {
                    var content = fs.readdirSync(stack.pop());
                    content.forEach(function (filename) {
                        var fullname = path + '/' + filename;
                        var stats = fs.statSync(fullname);
                        if (stats.isFile() && re.test(fullname)) {
                            files.push({ fullpath: fullname, size: stats.size, time: stats.mtime });
                        }
                        if (deep && stats.isDirectory()) {
                            stack.push();
                        }
                        return files;
                    });
                }
                resolve(files);
            });
        }
        return new Promise(function (resolve, reject) {
            var getfilemd = function (fentry) {
                return new Promise(function (inresolve) {
                    fentry.getMetadata(function (md) {
                        inresolve({ fullpath: fentry.fullPath, time: md.modificationTime, size: md.size });
                    }, function (e) {
                        inresolve();
                    });
                });
            };
            var getdirmd = function (dentry) {
                var r = new Promise(function (inresolve) {
                    var reader = dentry.createReader();
                    reader.readEntries(function (results) {
                        var promises = [];
                        results.forEach(function (e) {
                            var p = (e.isFile) ? getfilemd(e) : (e.isDirectory) ? getdirmd(e) : null;
                            promises.push(p);
                        });
                        inresolve(Promise.all(promises));
                    }, function (e) { inresolve([]); });
                });
                return r;
            };
            FSDir.read(path)
                .then(function (dentry) { return getdirmd(dentry); })
                .then(function (arrofarr) {
                var files = [];
                if (Array.isArray(arrofarr)) {
                    arrofarr.flatten(arrofarr).forEach(function (item) {
                        files.push({ fullpath: item.fullpath, time: item.time, size: item.size });
                    });
                }
                resolve(files);
            }).catch(function (e) { resolve([]); });
        });
    };
    return FSDir;
}(FSys));
exports.FSDir = FSDir;
/**
 * file system class for files operations
 */
var FSFile = /** @class */ (function (_super) {
    __extends(FSFile, _super);
    function FSFile() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(FSFile, "fs", {
        get: function () { FSys.ready(); return FSys.fs; },
        enumerable: true,
        configurable: true
    });
    /**
     * write data in a file
     * @param fullname - full path name of the file
     * @param data - to write
     * @returns a promise that write the file (create if not exist) an resolve in success
     *                    with no params (or fileError in reject case)
     */
    FSFile.write = function (fullname, data, notify) {
        var _this_1 = this;
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(fullname))
                    return reject(new Error('FSDir.create disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                var fd = fs.openSync(fullname, 'w', null);
                var buf = data instanceof String ? Buffer.from(data) : Buffer.from(data);
                fs.write(fd, buf, function (err, written) {
                    fs.closeSync(fd);
                    resolve(written);
                });
            });
        }
        return new Promise(function (resolve, reject) {
            var blob = (data instanceof Blob)
                ? data
                : (typeof data === 'string')
                    ? new Blob([data], { type: 'plain/text' })
                    : new Blob([data], { type: 'application/octet-stream' });
            FSys.fs.root.getFile(fullname, { create: true }, function (fentry) {
                fentry.createWriter(function (fwriter) {
                    fwriter.onwriteend = function (e) { resolve(fentry); };
                    fwriter.onprogress = function (e) { if (notify) {
                        notify(e);
                    } };
                    fwriter.onerror = function (e) { reject(e); };
                    fwriter.write(blob);
                }, reject);
            }, reject);
        });
    };
    /**
     * read data from file
     * @param fullname - full path name of the file
     * @param format - format of the data to read as
     * @param  function to notify on progress (call with one argument onprogressevent)
     * @returns a promise that read data from file and resolve with data (or fileError in reject case)
     */
    FSFile.read = function (fullname, format, notify) {
        var _this_1 = this;
        if (notify === void 0) { notify = function (e) { }; }
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(fullname))
                    return reject(new Error('FSDir.create disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                fs.readFile(fullname, (format === FSFormat.text) ? 'utf8' : null, function (err, data) {
                    err ? reject(err) : (typeof data === 'string') ? resolve(data) : resolve(data.buffer);
                });
            });
        }
        return new Promise(function (resolve, reject) {
            FSys.fs.root.getFile(fullname, { create: false }, function (fentry) {
                fentry.file(function (file) {
                    var reader = new FileReader();
                    reader.onload = function (e) { resolve(this.result); };
                    reader.onerror = function (e) { reject(e); };
                    reader.onprogress = function (e) { if (notify) {
                        notify(e);
                    } };
                    if (format === FSFormat.binarystring) {
                        reader.readAsBinaryString(file);
                    }
                    if (format === FSFormat.arraybuffer) {
                        reader.readAsArrayBuffer(file);
                    }
                    if (format === FSFormat.dataurl) {
                        reader.readAsDataURL(file);
                    }
                    if (format === FSFormat.text) {
                        reader.readAsText(file, 'utf-8');
                    }
                }, reject);
            }, reject);
        });
    };
    /**
     * read a slice data from file
     * @param file File entry
     * @param format format of the data to read as
     * @param offset offset in byte in the file
     * @param length length of the slice to read
     */
    FSFile.slice = function (file, format, offset, length) {
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                var buf = Buffer.alloc(length, 0);
                fs.read(file, buf, 0, length, offset, function (err, bytesread) {
                    if (err) {
                        reject(err);
                    }
                    else if (format == FSFormat.text) {
                        resolve(buf.slice(0, bytesread).toString('utf8'));
                    }
                    else {
                        if (bytesread === length) {
                            resolve(buf.buffer);
                        }
                        else {
                            var target_1 = new Uint8Array(bytesread);
                            var source_1 = new Uint8Array(buf.buffer);
                            source_1.forEach(function (v, i) { return target_1[i] = source_1[i]; });
                            resolve(target_1.buffer);
                        }
                    }
                });
            });
        }
        return new Promise(function (resolve, reject) {
            var type = (format === FSFormat.text) ? 'text/plain; charset=utf-8' : 'application/octet-stream';
            var slice = file.slice(offset, offset + length, type);
            var reader = new FileReader();
            reader.onload = function (e) { resolve(this.result); };
            reader.onerror = function (e) { reject(e); };
            if (format === FSFormat.binarystring) {
                reader.readAsBinaryString(slice);
            }
            if (format === FSFormat.arraybuffer) {
                reader.readAsArrayBuffer(slice);
            }
            if (format === FSFormat.dataurl) {
                reader.readAsDataURL(slice);
            }
            if (format === FSFormat.text) {
                reader.readAsText(slice, 'UTF-8');
            }
        });
    };
    FSFile.stream = function (fullname, format, ondata) {
        var offset = 0;
        if (ISNODE) {
            return FSFile.get(fullname)
                .then(function (file) {
                return new Promise(function (resolve, reject) {
                    var loop = function () {
                        var expected = 64 * 1024;
                        FSFile.slice(file, FSFormat.arraybuffer, offset, expected)
                            .then(function (data) {
                            offset += data.byteLength;
                            try {
                                ondata && ondata(data);
                                return (data.byteLength < expected) ? resolve() : loop();
                            }
                            catch (e) {
                                return reject(new Error("error while parsing file " + fullname + " : " + e.message));
                            }
                        });
                    };
                    loop();
                });
            });
        }
        return FSFile.get(fullname)
            .then(function (file) {
            return new Promise(function (resolve, reject) {
                var loop = function () {
                    var expected = 64 * 1024;
                    FSFile.slice(file, FSFormat.arraybuffer, offset, expected)
                        .then(function (data) {
                        offset += data.byteLength;
                        try {
                            ondata && ondata(data);
                            return (data.byteLength < expected) ? resolve() : loop();
                        }
                        catch (e) {
                            return reject(new Error("error while parsing file " + fullname + " : " + e.message));
                        }
                    });
                };
                loop();
            });
        });
    };
    /**
     * get File object for full path name
     * @param fullname - full path name of the file
     * @param format - format of the data to read as
     */
    FSFile.get = function (fullname) {
        var _this_1 = this;
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(fullname))
                    return reject(new Error('FSDir.get disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                var file = fs.openSync(fullname, 'r');
                resolve(file);
            });
        }
        return new Promise(function (resolve, reject) {
            FSys.fs.root.getFile(fullname, { create: false }, function (fentry) {
                fentry.file(function (file) { return resolve(file); }, reject);
            }, reject);
        });
    };
    /**
     * remove a file
     * @param fullname - full path name of the file
     * @returns a promise that remove the file an resolve in success with no params (or fileError in reject case)
     */
    FSFile.remove = function (fullname) {
        var _this_1 = this;
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(fullname))
                    return reject(new Error('FSDir.remove disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                fs.unlinkSync(fullname);
                resolve();
            });
        }
        return new Promise(function (resolve, reject) {
            FSys.fs.root.getFile(fullname, { create: false }, function (fentry) { return fentry.remove(resolve, reject); }, reject);
        });
    };
    /**
     * remove a file
     * @param fullname - full path name of the file
     * @returns a promise that remove the file an resolve in success with no params (or fileError in reject case)
     */
    FSFile.delete = function (fullname) {
        return FSFile.remove(fullname).then(function () { return true; });
    };
    /**
     * read metadata for a file
     * a metadata object includes the file's size (metadata.size) and modification date and time (metadata.modificationTime)
     * @param fullname - full path name of the file
     * @returns a promise that read the file an resolve in success with file metadata (or fileError in reject case)
     */
    FSFile.metadata = function (fullname) {
        var _this_1 = this;
        if (ISNODE) {
            return new Promise(function (resolve, reject) {
                if (_this_1.hasDisk(fullname))
                    return reject(new Error('FSDir.create disk selector not implemented do not use \"C:\", \"D:\" etc ...]'));
                fs.stat(fullname, function (err, stats) { return err ? resolve(null) : resolve({ modificationTime: stats.mtime, size: stats.size }); });
            });
        }
        return new Promise(function (resolve, reject) {
            FSys.fs.root.getFile(fullname, { create: false }, function (fentry) { return fentry.getMetadata(resolve, reject); }, reject);
        });
    };
    FSFile.release = function (file) {
        if (ISNODE) {
            return new Promise(function (resolve) {
                try {
                    fs.closeSync(file);
                }
                catch (e) { }
                resolve();
            });
        }
        return Promise.resolve();
    };
    return FSFile;
}(FSys));
exports.FSFile = FSFile;
/**
 * Synchronisation state for a synchronisation process (see [class Sync]{@Sync})
 */
var SyncState = /** @class */ (function () {
    function SyncState() {
        this.flist = []; // file list (see [class Sync]{@Sync})
        this.loaded = 0; // number of bytes loaded (file complete)
        this.loading = 0; // number of bytes loaded for unterminated files (in progress)
        this.wrote = 0; // number of bytes written (file complete)
        this.failed = 0; // number of bytes failed to load or write (file complete)
        this.total = 0; // number total of bytes to sync
        this.files = []; // array of files currently downloading
        // (item :{ path: <string>, filename: <string>, state: <DownloadState>} for each file)
        this.begin = Date.now(); // start sync date (millisec from epoc)
        this.end = Date.now(); // end sync date (millisec from epoc)
        this.elapsed = 0; // elapsed time in millisec
        this.left = 0; // estimated time left in millisec to complete
        this.rate = 0; // estimated rate in bytes per sec
        this.error = ''; // text of last error
        this.aborted = false; // true if sync was aborted / false otherwise
    }
    Object.defineProperty(SyncState.prototype, "processed", {
        // total bytes processed bytes loaded + bytes loading + bytes failed
        get: function () { return (this.loaded + this.loading + this.failed); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SyncState.prototype, "processedpc", {
        // percent bytes processed (bytes loaded + bytes loading + bytes failed) vs total bytes
        get: function () { return (this.total > 0) ? (100 * (this.loaded + this.loading + this.failed) / this.total) : 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SyncState.prototype, "wrotepc", {
        // percent bytes written
        get: function () { return (this.total > 0) ? (100 * this.wrote / this.total) : 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SyncState.prototype, "loadedpc", {
        // percent bytes loaded
        get: function () { return (this.total > 0) ? Math.round(100 * this.loaded / this.total) : 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SyncState.prototype, "loadingpc", {
        // percent bytes en loading
        get: function () { return (this.total > 0) ? (100 * this.loading / this.total) : 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SyncState.prototype, "failedpc", {
        // percent bytes failed
        get: function () { return (this.total > 0) ? (100 * this.failed / this.total) : 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SyncState.prototype, "isTerminated", {
        // true if full sync is terminated (failed or succeded)
        get: function () { return this.aborted || (this.wrote + this.failed) >= this.total; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SyncState.prototype, "isFailed", {
        // true if sync is partialy failed
        get: function () { return this.failed > 0; },
        enumerable: true,
        configurable: true
    });
    /**
     * set file list to sync and initialize time counters
     * @param flist - file list
     */
    SyncState.prototype.list = function (flist) {
        this.flist = flist;
        this.loaded = this.loading = this.wrote = this.failed = this.elapsed = this.left = this.rate = 0;
        this.total = this.totalBytes();
        this.begin = this.end = Date.now();
        this.error = '';
        this.aborted = false;
    };
    /**
     * add a file in download state
     * @param path - path of the file
     * @param filename - file name
     * @param dlstate - download state of the file
     */
    SyncState.prototype.fileLoading = function (path, filename, dlstate) {
        var file = this.files.find(function (cfile) { return cfile.path === path && cfile.filename === filename; });
        if (file) {
            file.state = dlstate;
        }
        else {
            this.files.push({ path: path, filename: filename, state: dlstate });
        }
        this.update();
    };
    /**
     * return total count to download in bytes for a given file list
     * @param flist - file list
     * @returns total count to download
     */
    SyncState.prototype.totalBytes = function (flist) {
        if (flist === void 0) { flist = this.flist; }
        return flist.reduce(function (p, sfile) { return p + sfile.size; }, 0);
    };
    /**
     * add loaded bytes for a completely loaded file
     * @param bytes - number of bytes of completely loaded file to add
     * @param url - url of the file
     * @param file name
     */
    SyncState.prototype.loadedB = function (bytes, url, filename) {
        this.fileLoaded(url, filename);
        this.loaded += bytes;
        this.update();
    };
    /**
     * add write bytes for a completely wrote file
     * @param bytes - number of wrote bytes
     */
    SyncState.prototype.writtenB = function (bytes) {
        this.wrote += bytes;
        this.update();
    };
    /**
     * add failed bytes for a failed download or write file
     * @param bytes - number of failed bytes
     */
    SyncState.prototype.failedB = function (bytes, url, filename, err) {
        this.fileLoaded(url, filename);
        this.error = err.message;
        this.failed += bytes;
        this.update();
    };
    /**
     * update sync state
     */
    SyncState.prototype.update = function () {
        this.loading = this.files.reduce(function (sum, file) { return sum + file.state.loaded; }, 0);
        this.end = Date.now();
        this.elapsed = this.end - this.begin;
        this.rate = (this.elapsed === 0) ? 0 : Math.ceil((this.loaded + this.loading) / (this.elapsed / 1000));
        this.left = (this.rate === 0) ? 0 : Math.ceil((this.total - (this.loaded + this.loading)) * 1000 / this.rate);
    };
    /**
     * signal a file completely loaded
     * @param path - path of the file
     * @param filename - file name
     */
    SyncState.prototype.fileLoaded = function (path, filename) {
        var i = this.files.findIndex(function (file) { return file.path === path && file.filename === filename; });
        if (i >= 0) {
            this.files.splice(i, 1);
        }
        this.update();
    };
    return SyncState;
}());
/**
 * Class for synchronizing a local directory (File System API) with a file list of files located on server
 * file list format is a JSON array of SyncItems : {fullpath: string, size: number, time: string}
 * fullpath : path and file name relative to this file
 * size : file size in bytes
 * time : string ISO date of last modification date/time
 * element 3... end of array : child of the directory (recursive representation)
 *  @example : [
 *      {
 *          "fullpath": "world/world_a.geojson",
 *          "size": 25601588,
 *          "time": "2018-10-15T16:38:47.662Z"
 *      },
 *      {
 *          "fullpath": "world/world_a.idx",
 *          "size": 8389,
 *          "time": "2018-11-17T01:50:35.989Z"
 *      },
 *      {
 *          "fullpath": "world/world_a.js",
 *          "size": 1137,
 *          "time": "2018-11-01T03:01:12.438Z"
 *      },
 *      {
 *          "fullpath": "world/world_b.dbf",
 *          "size": 599487,
 *          "time": "2018-05-21T07:24:36.000Z"
 *      }
 * ]
 */
var Sync = /** @class */ (function () {
    /**
     * constructor
     * @param flisturl file list url to download file list JSON
     * @param url source base url on server to sync
     * @param path target base dir on local device to sync
     * @param notify notify callback called when synchronize state changes with SyncState parameter
     */
    function Sync(url, path, notify) {
        if (path === void 0) { path = '/'; }
        if (notify === void 0) { notify = function (state) { }; }
        this.flisturl = url + '.json'; // file list url to download file list JSON
        this.url = url; // source base url on server to sync
        this.path = path; // target base dir on local device to sync
        this.notify = notify; // notify callback called when synchronize state changes with SyncState parameter
        this.state = new SyncState(); // synchronisation state (SyncState) of the sync process
        this.downloads = []; // list of all the Download object used for the sync process
        this.flist = null; // file list downloaded from flisturl (see example)
        this.filemap = new Map(); // local file map for time and size
    }
    Sync.init = function (nbytes) {
        return FSys.init(nbytes);
    };
    /**
     * run a sync process (one step call)
     * for param see Sync constructor
     */
    Sync.synchronize = function (url, path, notify) {
        if (notify === void 0) { notify = function () { }; }
        var sync = new Sync(url, path, notify);
        return sync.process();
    };
    /**
     * run the sync process
     * @returns the promise is fullfilled in sync termination resolved for success, reject when failed
     */
    Sync.prototype.process = function () {
        var _this_1 = this;
        return FSDir.files(this.path)
            .then(function (map) {
            map.forEach(function (file) { return _this_1.filemap.set(file.fullpath, file); });
            var dl = new Download(_this_1.flisturl, 'json');
            return dl.process();
        }).then(function (data) {
            _this_1.flist = data.map(function (item) { return ({ fullpath: item.fullpath, size: item.size, time: new Date(item.time) }); });
            _this_1.state.list(_this_1.flist);
            return _this_1.sync();
        })
            .catch(function (e) { return Promise.reject(new Error('Unable to sync (cause: ' + e.message + ')')); });
    };
    /**
     * Abort the whole sync process
     */
    Sync.prototype.abort = function () {
        this.downloads.forEach(function (dl) { return dl.abort(); });
        this.error = 'aborted by user';
    };
    /**
     * calculate the total sum of bytes for a file list
     * @param flist file list  on which to calculate the total sum of bytes (default to this.flist)
     * @returns sum of bytes
     */
    Sync.prototype.totalBytes = function (flist) {
        if (flist === void 0) { flist = this.flist; }
        return flist.reduce(function (p, sfile) { return p + sfile.size; }, 0);
    };
    /**
     * calculate the total sum of bytes synced of a file list
     * @param flist file list on which to calculate the total sum of bytes synced (default to this.flist)
     * @param path root path prefix (default to this.path)
     * @returns sum of bytes
      */
    Sync.prototype.syncedBytes = function (flist, path) {
        var _this_1 = this;
        if (flist === void 0) { flist = this.flist; }
        if (path === void 0) { path = this.path; }
        return flist.reduce(function (p, sfile) { return p + (_this_1.isUptodate(sfile) ? sfile.size : 0); }, 0);
    };
    /**
     * test if local file is up to date
     * @param fullname - full path and name of the file (on local device)
     * @param srvtime - server time of this file
     * @param srvsize - server size of this file
     * @returns true if <fullname> file is already synced on local device and is up to date.
     *          "up to date" meaning is size are equal and server time is older than device time)
     */
    Sync.prototype.isUptodate = function (srv) {
        var dev = this.filemap.get(srv.fullpath);
        var uptodate = dev ? dev.time >= srv.time && dev.size === srv.size : false;
        console.log(srv.fullpath, ' uptodate: ', uptodate ? 'YES' : 'NO');
        return uptodate;
    };
    /**
     * loop sync processing
     */
    Sync.prototype.sync = function () {
        var _this_1 = this;
        var promises = [];
        this.flist.forEach(function (file) {
            if (_this_1.isUptodate(file)) {
                // if file is uptodate => bytes are already loaded and written
                _this_1.state.loadedB(file.size, _this_1.url, file.fullpath);
                _this_1.state.writtenB(file.size);
                _this_1.notify(_this_1.state);
                promises.push(Promise.resolve());
            }
            else {
                // file is outofdate, download the file => sync the file
                promises.push(_this_1.syncfile(_this_1.url, _this_1.path, file));
            }
        });
        this.notify(this.state);
        return Promise.all(promises).then(function (_) { return _this_1.state; });
    };
    /**
     * file sync processing (test uptodate/download file/remove file/create dir/write file)
     */
    Sync.prototype.syncfile = function (url, path, file) {
        var _this_1 = this;
        var data = null;
        var restype = /\.(geojson|csv|js|json)$/.test(file.fullpath) ? 'text' : 'blob';
        url = url.replace(/.[^\/\\]*$/, '');
        var dl = new Download(url + '/' + file.fullpath, restype, function (dlstate) {
            _this_1.downloads.push(dl);
            _this_1.state.fileLoading(url, file.fullpath, dlstate);
            _this_1.notify(_this_1.state);
        });
        console.log('Loading: %s/%s', path, file.fullpath);
        // launch download
        return dl.process()
            .then(function (response) {
            // update the state and create dir (promise chain)
            data = response;
            console.log('Loaded: %s/%s', path, file.fullpath);
            _this_1.state.loadedB(file.size, url, file.fullpath);
            _this_1.notify(_this_1.state);
            var dir = (path + '/' + file.fullpath).replace(/.[^\/\\]*$/, '');
            return FSDir.create(dir);
        }).then(function (entry) {
            // remove file
            return FSFile.remove(path + '/' + file.fullpath).catch(function (e) { });
        }).then(function (entry) {
            // write data in file
            console.log('Writing: %s/%s', path, file.fullpath);
            return FSFile.write(path + '/' + file.fullpath, data);
        }).then(function () {
            // update state 
            console.log('Wrote: %s/%s', path, file.fullpath);
            _this_1.state.writtenB(file.size);
            _this_1.notify(_this_1.state);
        }).catch(function (e) {
            console.log('Failed: %s/%s', path, file.fullpath);
            _this_1.state.failedB(file.size, url, file.fullpath, e);
            _this_1.notify(_this_1.state);
        });
    };
    return Sync;
}());
exports.Sync = Sync;
//# sourceMappingURL=sync.js.map