import ConsumerQueue from 'consumer-queue';

export default class WebSerial {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        this.queue = new ConsumerQueue();
        this.readLoopActive = false;
        this.readLoopPromise = null;
        this.errorLog = [];
        this.isBusy = true;
        this.isConnected = false;
        this.isEchoing = true;
        this.isTalking = false;
        this.mode = '>';
        this.version = null;
        this.str = '';
        this.output = [];
    }

    async connect() {
        try {
            this.isBusy = true;

            this.port = await navigator.serial.requestPort({ usbVendorId: 0x1B9F });

            try {
                await this.port.open({
                    baudRate: 115200,
                    dataBits: 8,
                    parity: 'none',
                    stopBits: 1,
                    flowControl: 'none',
                });
            } catch (error) {
                alert(error?.message || 'Unable to connect.');
                this.isBusy = false;
                return;
            }

            if (this.port?.writable == null) {
                this.errorLog.push('This is not a writable port.');
                return;
            }
            if (this.port?.readable == null) {
                this.errorLog.push('This is not a readable port.');
                return;
            }

            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();

            this.startReadLoop();

            await this.sleep(100);
            await this.synchronize();

            this.isConnected = true;
            this.port.addEventListener('disconnect', () => this.disconnect());
            console.log('ready');
        } finally {
            this.isBusy = false;
        }
    }

    async disconnect() {
        await this.stopReadLoop();
        await this.writer.releaseLock();
        await this.reader.releaseLock();
        await this.port.close();
        this.isConnected = false;
        this.version = null;
    }

    async synchronize() {
        // Escape the current program.
        this.writer.write(this.encoder.encode("\x1B"));
        console.log('wrote escape');

        await this.sleep(100);
        let result = await this.flush();

        console.log('escape result', result);
        if (result.length === 1) {
            result = result.pop();
            if (result === '>' || result === '$') {
                this.mode = result;
                console.log('mode set to', result);
            }
        }
        
        if (this.isEchoing) {
            await this.turnOffEcho();
        }

        // Try to get the version.
        let tryCount = 3;
        while (tryCount > 0) {
            await this.sleep(100);
            const result = await this.getVersion();
            if (typeof result === 'string') {
                this.version = result;
                break;
            }
            tryCount--;
        }
    }

    async getVersion() {
        const result = await this.write('version()');
        for (const line of result) {
            console.log('line', line, (line.match(/\./g) || []).length);
            if (line.startsWith('v') && (line.match(/\./g) || []).length === 2) {
                return line;
            }
        }
        return undefined;
    }

    async turnOffEcho() {
        if (!this.isEchoing) {
            return;
        }
        await this.write('echo(0)');
        this.isEchoing = false;
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    startReadLoop() {
        this.readLoopPromise = this.readLoop();
    }

    async stopReadLoop() {
        this.readLoopActive = false;
        if (this.readLoopPromise) {
            await this.reader.cancel();
            await this.readLoopPromise;
            this.readLoopPromise = null;
        }
    }

    async readLoop() {
        let line;
        this.readLoopActive = true;
        
        while (this.readLoopActive) {
            try {
                const { value, done } = await this.reader.read();

                console.log('Reading...');
                this.str += this.decoder.decode(value).replace('\r', '');

                if (!this.str) {
                    continue;
                }

                let index = this.str.indexOf('\n');

                if (index > -1) {
                    this.str.split("\n").forEach((value) => console.log('->', value));
                } else {
                    console.log('->', this.str);
                }

                if (this.isConnected) {
                    if (this.output.length && this.str.startsWith(this.output[this.output.length - 1])) {
                        this.output[this.output.length - 1] = this.str;
                    } else if (index === -1) {
                        this.output.push(this.str);
                    }
                }

                while (index > -1) {
                    line = this.str.substring(0, index);
                    if (line) {
                        console.log('queued:', line);
                        this.queue.push(line);

                        if (this.isConnected) {
                            if (this.output.length && this.output[this.output.length - 1].startsWith(line)) {
                                this.output[this.output.length - 1] = line;
                            } else {
                                this.output.push(line);
                            }
                        }
                    }

                    this.str = this.str.substring(index + 1);
                    index = this.str.indexOf("\n");
                }

                if (this.str === '>' || this.str === '$' || this.str === '&') {
                    console.log('queued:', this.str);
                    this.queue.push(this.str);
                    this.str = '';
                    this.output.push('');
                }

                if (done) {
                    this.readLoopActive = false;
                }
            } catch (error) {
                console.error(error);
                break;
            }
        }
    }

    readUntil(terminator = null) {
        if (!terminator) {
            terminator = this.mode;
        }
        return new Promise(async (resolve) => {
            const result = [];
            let line;
            do {
                line = await this.queue.pop().catch(() => {
                    console.log('read until', 'queue waiter terminated', result);
                    resolve(result);
                });
                if (line) {
                    result.push(line);
                    if (line.startsWith('!')) {
                        console.log('Error:', line);
                        break;
                    }
                }
            } while (line !== terminator);
            console.log('read until found', result);
            if (result.length > 1) {
                result.pop();
            }
            resolve(result);                            
        });
    }

    async flush() {
        const result = [];
        let line;
        do {
            line = await this.queue.tryPop();
            if (line) {
                result.push(line);
            }
        } while (line);
        // Clear read loop string.
        if (!result.length) {
            this.str = '';
        }
        console.log('flushed', result);
        return result;
    }

    async escape() {
        try {
            this.isBusy = true;
            this.queue.cancelWait(new Error('Escape'));
            await this.write("\x1B", '');
        } finally {
            this.isBusy = false;
        }
    }

    async write(command, terminator = null, lineEnd = "\n") {
        let wasTalking = this.isTalking;
        try {
            console.log('----- write -----');

            this.isTalking = true;

            await this.flush();

            this.writer.write(this.encoder.encode(command + lineEnd));
            console.log('wrote', command);

            if (command === '>' || command === '$') {
                this.mode = command;
            }

            console.log('write is sleeping');
            await this.sleep(50);

            // In the case of 'ESC' we would have a pending "readUntil"
            // this ensures that we do not trigger a nested "readUntil"
            let result = [];
            if (!wasTalking) {
                console.log('write is reading');
                if (!terminator) {
                    result = await this.readUntil(this.mode);                
                } else {
                    result = await this.readUntil(terminator);                
                }
            }
            console.log('write result', result);
            return result;
        } finally {
            if (!wasTalking) this.isTalking = false;
        }
    }

    async stream(data) {
        const BLOCK_SIZE = 64;

        let bytes = this.encoder.encode(data);
        let count = bytes.length;
        let offset = 0;

        while (count > 0) {
            const buf = bytes.subarray(offset, offset + Math.min(BLOCK_SIZE, count));
            await this.writer.write(buf);

            const response = await this.queue.tryPop();
            if (response) {
                this.output.push(response);
                return response;
            }

            offset += BLOCK_SIZE;
            count -= buf.length;
            await this.sleep(1);
        }
        return null;
    }
}
