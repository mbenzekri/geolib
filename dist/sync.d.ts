declare type SyncItem = {
    fullpath: string;
    size: number;
    time: Date;
};
/**
 * this class store the download state for a download to come
 */
declare class DownloadState {
    /** count of byte downloaded between this.begin and this.end timestamps */
    loaded: number;
    /** total count of byte to download (unknown when compressed) */
    total: number;
    /** start download timestamp (millisec since epoc) */
    begin: number;
    /** end download timestamp (millisec since epoc) */
    end: number;
    /** elapsed time in millisec between this.begin and this.end timestamps */
    elapsed: number;
    /** estimated left time in millisec to terminate download */
    left: number;
    /** estimated download rate in bytes per second (average) */
    rate: number;
    /** text for download state */
    status: string;
    constructor();
    /**
     *  percentage of loaded bytes
     */
    readonly loadedpc: number;
    /**
       *  signal start of download
       */
    start(): void;
    /**
       *  signal end of download
       */
    terminate(): void;
    /**
     * update download status
     * @param status - text status to set
     */
    updateStatus(status: string): void;
    /**
       * update the progress state loaded and total bytes and calculate timing data.
       * loaded and total are optionals, if not present update only timing data (end/elapsed/left/rate)
       * @param loaded number of loaded bytes
       * @param total total bytes expected
       */
    update(loaded?: number, total?: number): void;
}
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
declare class Download {
    url: string;
    notify: Function;
    resptype: string;
    xhr: XMLHttpRequest;
    state: DownloadState;
    /**
     * download a resource with notification handler
     * for params see [constructor Download]{@link Download#constructor}
     */
    static download(url: any, resptype: any, notify: any): Promise<any>;
    /**
     * @param url - url of the ressource to download
     * @param resptype - expected response type ("arraybuffer","blob","document","json","text" default to blob')
     * @param notify - on progress notify callback : function(state DownloadState):void
     */
    constructor(url: string, resptype?: string, notify?: Function);
    /**
     * run the download process and return a promise which is fullfilled in download termination
     * resolved for success and reject when failed. notify call are trigerred on download state changes
     * @returns the promise
     */
    process(): Promise<any>;
    /**
     *  call this method to abort the download
     */
    abort(): void;
    /**
     * update the state of the download state and notify changes
     * @param loaded - numer of current loaded bytes
     * @param total - total bytes to download
     * @param status - status text
     */
    private update;
}
declare enum FSFormat {
    binarystring = "binarystring",
    arraybuffer = "arraybuffer",
    text = "text",
    dataurl = "dataurl"
}
/**
 * File system api base class
 */
declare abstract class FSys {
    static fs: any;
    static granted: number;
    /**
     * Initialise File System API with <nbytes> bytes requested (space requested on file system)
     * @param nbytes - number of bytes requested
     * @returns a promise resolve if the granted request is ok, reject in failure
     * @description this static method initialize File system API by requesting an amount of bytes.
     *              caution ! this request may cause a prompt window to popup for user acceptance
     */
    static init(nbytes: number): Promise<number>;
    /**
     * Test if File System API is initialized if not so throws an exception
     * @throws {Error} if FS API not initialized
     */
    static ready(): void;
    static hasDisk(fullname: string): boolean;
    static extname(filename: string): string;
    static basename(filename: string): string;
}
/**
  * file system class for directory operations
 */
declare class FSDir extends FSys {
    static readonly fs: any;
    /**
     * create path recursively
     * @param path - full path of the directory
     * @returns a promise that create the directory an resolve returning dirEntry (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    static create(path: string): Promise<any>;
    /**
     * delete path recursively
     * @param path - full path of the directory
     * @returns a promise that delete the directory an resolve in success with no result (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    static delete(path: string): Promise<boolean>;
    /**
     * delete path recursively
     * @param path - full path of the directory
     * @returns a promise that delete the directory an resolve in success with no result (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    static remove(path: string): Promise<any>;
    /**
     * get the directory entry for path
     * @param path - full path of the directory
     * @returns a promise that read the directory an resolve in success with directory entry (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    static read(path: string): Promise<any>;
    /**
     * get a directory metadata for path
     * a metadata object includes the file's size (size property) and modification date and time (modificationTime)
     * @param path - full path of the directory
     * @returns a promise that read the directory an resolve in success with directory metadata (or fileError in reject case)
     * @throws {Error} if FS API not initialized
     */
    static metadata(path: string): Promise<any>;
    /**
     * get a directory file map (plain Object)
     * each filename is a property and each property have a value object containing (fullpath,time,size)
     * corresponding to fullpath name, modification date/time and size of the file.
     * @param path - full path of the directory
     * @returns a promise that read the directory an resolve in success with map object (or fileError in reject case)
     * @throws {Error} - if FS API not initialized
     */
    static files(path: string, re?: RegExp, deep?: boolean): Promise<SyncItem[]>;
}
/**
 * file system class for files operations
 */
declare class FSFile extends FSys {
    static readonly fs: any;
    /**
     * write data in a file
     * @param fullname - full path name of the file
     * @param data - to write
     * @returns a promise that write the file (create if not exist) an resolve in success
     *                    with no params (or fileError in reject case)
     */
    static write(fullname: string, data: string | ArrayBuffer | Blob, notify?: Function): Promise<any>;
    /**
     * read data from file
     * @param fullname - full path name of the file
     * @param format - format of the data to read as
     * @param  function to notify on progress (call with one argument onprogressevent)
     * @returns a promise that read data from file and resolve with data (or fileError in reject case)
     */
    static read(fullname: string, format: FSFormat, notify?: (e: any) => void): Promise<any>;
    /**
     * read a slice data from file
     * @param file File entry
     * @param format format of the data to read as
     * @param offset offset in byte in the file
     * @param length length of the slice to read
     */
    static slice(file: number | File, format: FSFormat, offset: number, length: number): Promise<string | ArrayBuffer>;
    static stream(fullname: string, format: FSFormat, ondata: (data: string | ArrayBuffer) => void): Promise<void>;
    /**
     * get File object for full path name
     * @param fullname - full path name of the file
     * @param format - format of the data to read as
     */
    static get(fullname: string): Promise<any>;
    /**
     * remove a file
     * @param fullname - full path name of the file
     * @returns a promise that remove the file an resolve in success with no params (or fileError in reject case)
     */
    static remove(fullname: string): Promise<any>;
    /**
     * remove a file
     * @param fullname - full path name of the file
     * @returns a promise that remove the file an resolve in success with no params (or fileError in reject case)
     */
    static delete(fullname: string): Promise<any>;
    /**
     * read metadata for a file
     * a metadata object includes the file's size (metadata.size) and modification date and time (metadata.modificationTime)
     * @param fullname - full path name of the file
     * @returns a promise that read the file an resolve in success with file metadata (or fileError in reject case)
     */
    static metadata(fullname: string): Promise<any>;
    static release(file: number): Promise<void>;
}
/**
 * Synchronisation state for a synchronisation process (see [class Sync]{@Sync})
 */
declare class SyncState {
    flist: SyncItem[];
    loaded: number;
    loading: number;
    wrote: number;
    failed: number;
    total: number;
    files: any[];
    begin: number;
    end: number;
    elapsed: number;
    left: number;
    rate: number;
    error: string;
    aborted: boolean;
    readonly processed: number;
    readonly processedpc: number;
    readonly wrotepc: number;
    readonly loadedpc: number;
    readonly loadingpc: number;
    readonly failedpc: number;
    readonly isTerminated: boolean;
    readonly isFailed: boolean;
    /**
     * set file list to sync and initialize time counters
     * @param flist - file list
     */
    list(flist: Array<any>): void;
    /**
     * add a file in download state
     * @param path - path of the file
     * @param filename - file name
     * @param dlstate - download state of the file
     */
    fileLoading(path: string, filename: string, dlstate: DownloadState): void;
    /**
     * return total count to download in bytes for a given file list
     * @param flist - file list
     * @returns total count to download
     */
    totalBytes(flist?: SyncItem[]): number;
    /**
     * add loaded bytes for a completely loaded file
     * @param bytes - number of bytes of completely loaded file to add
     * @param url - url of the file
     * @param file name
     */
    loadedB(bytes: number, url: string, filename: string): void;
    /**
     * add write bytes for a completely wrote file
     * @param bytes - number of wrote bytes
     */
    writtenB(bytes: number): void;
    /**
     * add failed bytes for a failed download or write file
     * @param bytes - number of failed bytes
     */
    failedB(bytes: number, url: any, filename: any, err: any): void;
    /**
     * update sync state
     */
    private update;
    /**
     * signal a file completely loaded
     * @param path - path of the file
     * @param filename - file name
     */
    private fileLoaded;
}
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
declare class Sync {
    flisturl: string;
    url: string;
    path: string;
    notify: (state: SyncState) => void;
    state: SyncState;
    downloads: Download[];
    flist: SyncItem[];
    filemap: Map<string, SyncItem>;
    error: string;
    /**
     * constructor
     * @param flisturl file list url to download file list JSON
     * @param url source base url on server to sync
     * @param path target base dir on local device to sync
     * @param notify notify callback called when synchronize state changes with SyncState parameter
     */
    constructor(url: string, path?: string, notify?: (state: SyncState) => void);
    static init(nbytes: any): Promise<number>;
    /**
     * run a sync process (one step call)
     * for param see Sync constructor
     */
    static synchronize(url: string, path: string, notify?: (state: SyncState) => void): Promise<SyncState>;
    /**
     * run the sync process
     * @returns the promise is fullfilled in sync termination resolved for success, reject when failed
     */
    process(): Promise<SyncState>;
    /**
     * Abort the whole sync process
     */
    abort(): void;
    /**
     * calculate the total sum of bytes for a file list
     * @param flist file list  on which to calculate the total sum of bytes (default to this.flist)
     * @returns sum of bytes
     */
    totalBytes(flist?: SyncItem[]): number;
    /**
     * calculate the total sum of bytes synced of a file list
     * @param flist file list on which to calculate the total sum of bytes synced (default to this.flist)
     * @param path root path prefix (default to this.path)
     * @returns sum of bytes
      */
    syncedBytes(flist?: SyncItem[], path?: string): number;
    /**
     * test if local file is up to date
     * @param fullname - full path and name of the file (on local device)
     * @param srvtime - server time of this file
     * @param srvsize - server size of this file
     * @returns true if <fullname> file is already synced on local device and is up to date.
     *          "up to date" meaning is size are equal and server time is older than device time)
     */
    isUptodate(srv: SyncItem): boolean;
    /**
     * loop sync processing
     */
    private sync;
    /**
     * file sync processing (test uptodate/download file/remove file/create dir/write file)
     */
    private syncfile;
}
export { Sync, Download, FSys, FSDir, FSFile, FSFormat };
