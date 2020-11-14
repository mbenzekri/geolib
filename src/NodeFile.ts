import fs from 'fs'

const FILE_MAX_OPEN = 100
const FILE_OPENED: NodeFile[] = []

export class NodeFile extends Blob {
    private fd: number
    private fsize: number
    constructor(public readonly name: string, type = 'application/octet-stream') {
        super([' '], { type })
        const stats = fs.statSync(name)
        this.fsize =stats.size
    }
    get size():number {return this.fsize}
    open(): void {
        if (this.fd === null || this.fd === undefined ) {
            this.release()
            this.fd = fs.openSync(this.name, 'r')
            FILE_OPENED.push(this)
        }
    }
    slice(start: number, end: number, type = this.type): Blob {
        this.open()
        const length = end - start
        const buffer = Buffer.alloc(length, 0)
        const read = fs.readSync(this.fd, buffer, 0, length, start)
        return new Blob([buffer.buffer.slice(0,read)], { type })
    }

    close(): void {
        if (this.fd !== null) {
            const index = FILE_OPENED.findIndex(file => this === file)
            if (index >= 0) FILE_OPENED.splice(index, 1)
            fs.closeSync(this.fd)
            this.fd = null
        }
    }

    private release(): void {
        if (FILE_OPENED.length === FILE_MAX_OPEN) {
            const file = FILE_OPENED.shift()
            fs.closeSync(file.fd)
            file.fd = null
        }
    }
} 