"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileReader = exports.File = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
require("./polyfill");
const fs_1 = __importDefault(require("fs"));
const FILE_MAX_OPEN = 100;
const FILE_OPENED = [];
class File extends Blob {
    constructor(name, type = 'application/octet-stream') {
        super([' '], { type });
        this.name = name;
        const stats = fs_1.default.statSync(name);
        this.fsize = stats.size;
    }
    get size() { return this.fsize; }
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
}
exports.File = File;
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
    // ---------- Events ----------
    // Un gestionnaire pour l'évènement abort. Cet évènement est déclenché à chaque fois que l'opération de lecture est interrompue.
    set onabort(handler) {
        this.addEventListener('abort', handler);
    }
    // Un gestionnaire pour l'évènement error. Cet évènement est déclenché à chaque fois qu'il y a une erreur pendant l'opération de lecture.
    set onerror(handler) {
        this.addEventListener('error', handler);
    }
    // Un gestionnaire pour l'évènement load. Cet évènement est déclenché à chaque fois qu'une opération de lecture est menée à bien.
    set onload(handler) {
        this.addEventListener('load', handler);
    }
    // Un gestionnaire pour l'évènement loadstart. Cet évènement est déclenché chaque fois qu'une opération de lecture commence.
    set onloadstart(handler) {
        this.addEventListener('loadstart', handler);
    }
    // Un gestionnaire pour l'évènement loadend. Cet évènement est déclenché chaque fois qu'une opération de lecture est terminée 
    // (que ce soit un succès ou un échec).
    set onloadend(handler) {
        this.addEventListener('loadend', handler);
    }
    // Un gestionnaire pour l'évènement progress. Cet évènement est déclenché lorsque la lecture du Blob est en cours.
    set onprogress(handler) {
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
        blob.read()
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
        throw Error(`FileReader.readAsBinaryString() not implemented !`);
    }
    // Cette méthode démarre la lecture du contenu pour le blob indiqué. Une fois que la lecture est terminée, 
    // l'attribut result contient une URL de données qui représente les données du fichier.
    readAsDataURL() {
        throw Error(`FileReader.readAsDataURL() not implemented !`);
    }
    // Cette méthode démarre la lecture du contenu pour le blob indiqué. Une fois la lecture terminée, 
    // l'attribut result contient les données du fichier sous la forme d'une chaîne de caractères.
    readAsText() {
        throw Error(`FileReader.readAsText() not implemented !`);
    }
}
exports.FileReader = FileReader;
//# sourceMappingURL=NodeFile.js.map