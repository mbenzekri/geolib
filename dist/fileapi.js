"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFile = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const polyfill_1 = require("./polyfill");
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
function getFile(name, type) {
    return File.get(name, type);
}
exports.getFile = getFile;
if (process) {
    class Blob {
        constructor(blobParts, options) {
            if (options && options.endings === 'native')
                throw Error(`Blob.constructor(): options ending not implemented !`);
            this.type = options && options.type ? options.type : '';
            this.start = 0;
            const buffers = blobParts.map(part => {
                if (part instanceof ArrayBuffer)
                    return new Uint8Array(part);
                if (typeof part === 'string')
                    return (new util_1.TextEncoder()).encode(part);
                if (part instanceof Blob)
                    throw Error(`Blob.constructor() Blob from Blob parts not implemented`);
            });
            this.end = buffers.reduce((total, arr) => total + arr.byteLength, 0);
            this.array = new Uint8Array(this.size);
            let offset = 0;
            for (const array of buffers) {
                this.array.set(array, offset);
                offset += array.byteLength;
            }
        }
        //La taille des données contenues dans l'objet Blob, exprimée en octets.
        get size() { return this.end - this.start; }
        // Cette méthode renvoie un nouvel objet Blob qui contient les données dans le fragment 
        // du Blob source entre début et fin.
        slice(start = 0, end = this.size, type = '') {
            if (this.start === start && this.end === end)
                return this;
            const blob = new Blob([this.array.slice(start, end)], { type });
            if (start < 0 || start > this.size)
                throw Error(`Blob.slice() parameter start=${start} out of range [0, ${this.size}]`);
            if (end < start || end > this.size)
                throw Error(`Blob.slice() parameter end=${start} out of range [${start}, ${this.size}]`);
            blob.start = this.start + start;
            blob.end = this.start + end;
            return blob;
        }
        arrayBuffer(offset = 0, length = this.size) {
            if (!this)
                return Promise.reject("null blob provided to read");
            return Promise.resolve(this.array.buffer.slice(offset, offset + length));
        }
        text(offset = 0, length = this.size) {
            return this.arrayBuffer(offset, length).then(array => polyfill_1.toUtf8(array));
        }
        dataview(offset = 0, length = this.size) {
            return this.arrayBuffer(offset, length).then(array => new DataView(array));
        }
    }
    globalThis.Blob = Blob;
    const FILE_MAX_OPEN = 100;
    const FILE_OPENED = [];
    class File extends Blob {
        constructor(name, type = 'application/octet-stream') {
            super([], { type });
            if (!fs_1.default.existsSync(name))
                throw Error(`File.constructor(): file not found "${name}" `);
            this.name = name;
            const stat = fs_1.default.statSync(name);
            this.lastModified = stat.mtime.getTime();
            this._size = stat.size;
        }
        get size() { return this._size; }
        static get(name, type) {
            return new File(name, type);
        }
        open() {
            if (this.fd === null || this.fd === undefined) {
                this.release();
                this.fd = fs_1.default.openSync(this.name, 'r');
                FILE_OPENED.push(this);
            }
        }
        slice(start, end, type = this.type) {
            this.open();
            const length = end - start;
            const buffer = Buffer.alloc(length, 0);
            const read = fs_1.default.readSync(this.fd, buffer, 0, length, start);
            return new Blob([buffer.buffer.slice(0, read)], { type });
        }
        close() {
            if (this.fd !== null) {
                const index = FILE_OPENED.findIndex(file => this === file);
                if (index >= 0)
                    FILE_OPENED.splice(index, 1);
                fs_1.default.closeSync(this.fd);
                this.fd = null;
            }
        }
        release() {
            if (FILE_OPENED.length === FILE_MAX_OPEN) {
                const file = FILE_OPENED.shift();
                fs_1.default.closeSync(file.fd);
                file.fd = null;
            }
        }
        arrayBuffer(offset = 0, length = this.size) {
            const blob = this.slice(offset, offset + length);
            return Promise.resolve(blob.arrayBuffer());
        }
    }
    globalThis.File = File;
    class FileReader extends EventTarget {
        constructor() {
            super(...arguments);
            // total: total bytes read
            this.total = 0;
            // error: Un objet DOMError qui représente l'erreur qui s'est produite lors de la lecture du fichier.
            this.error = null;
            // readyState: Un nombre qui indique l'état du FileReader. Cette valeur est l'une des suivantes :
            // EMPTY	0	Aucune donnée n'a encore été chargée.
            // LOADING	1	Des données sont en cours de chargement.
            // DONE	2	La demande de lecture est complètement terminée.
            this.readyState = 0;
            // result: Le contenu du fichier. Cette propriété est uniquement valide lorsque l'opération de lecture est terminée et le format des données dépend de la méthode utilisée pour l'opération de lecture.
            this.result = null;
        }
        set _total(total) { this.total = total; }
        set _error(e) { this.error = e; }
        set _readyState(state) { this.readyState = state; }
        set _result(result) { this.result = result; }
        // Un gestionnaire pour l'évènement abort. Cet évènement est déclenché à chaque fois que l'opération de lecture est interrompue.
        set onabort(handler) {
            if (this._onabort)
                this.removeEventListener('abort', this._onabort);
            this.addEventListener('abort', handler);
        }
        // Un gestionnaire pour l'évènement error. Cet évènement est déclenché à chaque fois qu'il y a une erreur pendant l'opération de lecture.
        set onerror(handler) {
            if (this._onerror)
                this.removeEventListener('error', this._onerror);
            this.addEventListener('error', handler);
        }
        // Un gestionnaire pour l'évènement load. Cet évènement est déclenché à chaque fois qu'une opération de lecture est menée à bien.
        set onload(handler) {
            if (this._onload)
                this.removeEventListener('load', this._onload);
            this.addEventListener('load', handler);
        }
        // Un gestionnaire pour l'évènement loadstart. Cet évènement est déclenché chaque fois qu'une opération de lecture commence.
        set onloadstart(handler) {
            if (this._onloadstart)
                this.removeEventListener('loadstart', this._onloadstart);
            this.addEventListener('loadstart', handler);
        }
        // Un gestionnaire pour l'évènement loadend. Cet évènement est déclenché chaque fois qu'une opération de lecture est terminée 
        // (que ce soit un succès ou un échec).
        set onloadend(handler) {
            if (this._onloadend)
                this.removeEventListener('loadend', this._onloadend);
            this.addEventListener('loadend', handler);
        }
        // Un gestionnaire pour l'évènement progress. Cet évènement est déclenché lorsque la lecture du Blob est en cours.
        set onprogress(handler) {
            if (this._onprogress)
                this.removeEventListener('progress', this._onprogress);
            this.addEventListener('progress', handler);
        }
        // Cette méthode interrompt l'opération de lecture. Après avoir renvoyé une valeur, 
        // l'état readyState aura la valeur DONE.
        abort() {
            console.error(`FileReader.abort() not implemented !`);
            return;
        }
        // Cette méthode démarre la lecture du contenu pour le blob indiqué. Une fois que la lecture est terminée, 
        // l'attribut result contient un objet ArrayBuffer représentant les données du fichier.
        readAsArrayBuffer(blob) {
            this._readyState = 1;
            this.dispatchEvent(new Event('loadstart'));
            this._total = 0;
            blob.arrayBuffer()
                .then(array => {
                this._result = array;
                this._total = array.byteLength;
                this.dispatchEvent(new Event('load'));
            }).catch(error => {
                this._error = error;
                this.dispatchEvent(new Event('error'));
            })
                .finally(() => {
                this._readyState = 2;
                this.dispatchEvent(new Event('loadend'));
            });
        }
        // Cette méthode démarre la lecture du contenu pour le blob indiqué. Une fois que la lecture est terminée, 
        // l'attribut result contient les données binaires brutes sous la forme d'une chaîne de caractères.
        readAsBinaryString() {
            throw Error(`FileReader.readAsBinaryString() deprecated !!!`);
        }
        // Cette méthode démarre la lecture du contenu pour le blob indiqué. Une fois que la lecture est terminée, 
        // l'attribut result contient une URL de données qui représente les données du fichier.
        readAsDataURL() {
            throw Error(`FileReader.readAsDataURL() not implemented !`);
        }
        // Cette méthode démarre la lecture du contenu pour le blob indiqué. Une fois la lecture terminée, 
        // l'attribut result contient les données du fichier sous la forme d'une chaîne de caractères.
        readAsText(blob) {
            this._readyState = 1;
            this.dispatchEvent(new Event('loadstart'));
            this._total = 0;
            blob.arrayBuffer()
                .then(array => {
                this._result = polyfill_1.toUtf8(array);
                this._total = array.byteLength;
                this.dispatchEvent(new Event('load'));
            }).catch(error => {
                this._error = error;
                this.dispatchEvent(new Event('error'));
            })
                .finally(() => {
                this._readyState = 2;
                this.dispatchEvent(new Event('loadend'));
            });
        }
    }
    globalThis.FileReader = FileReader;
}
else {
    globalThis.getFile = () => { throw Error(`File.get() not implemented for browsers (may be never !!!)`); };
}
if (!process)
    Blob.prototype.arrayBuffer = function (offset = 0, length = this.size) {
        if (!this)
            return Promise.reject("null blob provided to read");
        const blob = this.slice(offset, offset + length);
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(r.error);
            r.onload = () => resolve(r.result);
            r.readAsArrayBuffer(blob);
        });
    };
if (!process)
    Blob.prototype.dataview = function (offset = 0, length = this.size) {
        return this.arrayBuffer(offset, length).then(array => new DataView(array));
    };
if (!process)
    Blob.prototype.text = function (offset = 0, length = this.size) {
        return this.arrayBuffer(offset, length).then(array => polyfill_1.toUtf8(array));
    };
//# sourceMappingURL=fileapi.js.map