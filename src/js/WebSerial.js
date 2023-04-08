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
    }

    async connect() {
        this.isBusy = true;

        this.port = await navigator.serial.requestPort({ usbVendorId: 0x1B9F });
        await this.port.open({
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: 'none',
        });

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
        this.isBusy = false;

        console.log('ready');
    }

    async disconnect() {
        await this.stopReadLoop();
        await this.writer.releaseLock();
        await this.reader.releaseLock();
        await this.port.close();
    }

    async synchronize() {
        // Direct mode.
        await this.write('>');
        // Escape the current program.
        await this.write("\x1B", '');
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
        if (this.isEchoing) {
            await this.turnOffEcho();
        }
    }

    async getVersion() {
        const result = await this.write('version()');
        return result[0];
    }

    async turnOffEcho() {
        if (!this.isEchoing) {
            return;
        }
        await this.write('isEchoing(0)');
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
        let line, str = '';
        this.readLoopActive = true;
        while (this.readLoopActive) {
            try {
                const { value, done } = await this.reader.read();

                console.log('Reading...');
                str += this.decoder.decode(value).replace("\r", '');

                if (!str) {
                    continue;
                }

                let index = str.indexOf("\n");

                if (index > -1) {
                    str.split("\n").forEach((value) => console.log('->', value));
                } else {
                    console.log('->', str);
                }

                while (index > -1) {
                    line = str.substring(0, index);
                    if (line) {
                        console.log('queued:', line);
                        this.queue.push(line);
                    }

                    str = str.substring(index + 1);
                    index = str.indexOf("\n");
                }

                if (str === '>' || str === '$') {
                    console.log('queued:', str);
                    this.queue.push(str);
                    str = '';
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

    readUntil(terminator) {
        return new Promise(async (resolve) => {
            const result = [];
            let line;
            do {
                line = await this.queue.pop().catch(() => {
                    console.log('read until', 'queue waiter terminated', result);
                    resolve(result);
                });
                if (line.startsWith('!')) {
                    console.log('Error:', line);
                    break;
                }
                result.push(line);
            } while (line !== terminator);
            console.log('read until', 'found', result);
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
        console.log('flushed', result);
        return result;
    }

    async escape() {
        this.isBusy = true;
        this.queue.cancelWait(new Error('Escape'));
        await this.write("\x1B", '');
        this.isBusy = false;
    }

    async write(command, lineEnd = "\n") {
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

        console.log('write is reading');
        const result = await this.readUntil(this.mode);

        this.isTalking = false;

        console.log('write result', result);
        return result;
    }
}
