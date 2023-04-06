import ConsumerQueue from 'consumer-queue';

export default class WebSerial {
    constructor() {
        this.errorLog = [];
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        this.queue = new ConsumerQueue();
        this.readLoopActive = false;
        this.readLoopPromise = null;
        this.output = [];
        this.isConnected = false;
        this.echo = true;
        this.version = null;


        this.readTimeout = 3000;
        this.leftOver = '';
    }

    async connect() {
        this.port = await navigator.serial.requestPort({ usbVendorId: 0x1B9F });

        try {
            await this.attach();
        } catch (error) {
            this.errorLog.push(error);
            this.port = null;
        }

        this.startReadLoop();

        this.leftOver = '';
        await this.sleep(100);
        await this.synchronize();

        this.isConnected = true;
    }

    async disconnect() {
        await this.detach();
    }

    async synchronize() {
        // Escape the current program.
        await this.send("\x1B", '');
        // Force immediate mode.
        await this.send('>');
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
        await this.send('version()');
        const result = await this.readUntilEmpty();
        if (this.echo) {
            await this.turnOffEcho();
            return result[1];
        }
        return result[0];
    }

    async turnOffEcho() {
        if (!this.echo) {
            return;
        }
        await this.send('echo(0)');
        await this.readUntilEmpty();
        this.echo = false;
    }

    async attach() {
        await this.port.open({
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: 'none',
        });

        if (this.port?.writable == null) {
            this.errorLog.push('This is not a writable port.');
        }
        if (this.port?.readable == null) {
            this.errorLog.push('This is not a readable port.');
        }

        this.reader = this.port.readable.getReader();
        this.writer = this.port.writable.getWriter();
    }

    async detach() {
        await this.stopReadLoop();
        await this.writer.releaseLock();
        await this.reader.releaseLock();
        await this.port.close();
    }

    async sleep(ms) {
        await new Promise((resolve) => setTimeout(resolve, ms));
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

    async readResponse() {
        let str = this.leftOver;
        const end = Date.now() + this.readTimeout;

        const response = { success: false, response: null };

        while (Date.now() < end) {
            const { value } = await this.reader.read();
            const text = this.decoder.decode(value);

            str += text;

            str = str.replace("\n", '');
            str = str.replace("\r", '');

            let idx1 = str.indexOf('>');
            let idx2 = str.indexOf('&');

            if (idx1 === -1) {
                idx1 = str.indexOf('$');
            }

            if (idx1 === -1 && idx2 === -1) {
                continue;
            }

            const idx = (idx1 === -1) ? idx2 : idx1;

            console.log('----------', idx);
            console.log(str);
            console.log('----------');
            console.log(idx + 1, str.length, str.substring(idx + 1, str.length));
            console.log('----------');
            console.log(0, idx, str.substring(0, idx));

            this.leftOver = str.substring(idx + 1);
            response.success = true;
            response.response = str.substring(0, idx);

            const idx3 = str.indexOf('!');
            if (idx3 !== -1 && (response.response.indexOf('error') > -1 || response.response.indexOf('unknown') > -1)) {
                response.success = false;
            }

            return response;
        }

        this.leftOver = '';

        return response;
    }

    async readLoop() {
        let line, str = '';
        this.readLoopActive = true;
        while (this.readLoopActive) {
            try {
                const { value, done } = await this.reader.read();
                if (value) {
                    str += this.decoder.decode(value);
                    let index = str.indexOf("\n");
                    while (index > 0) {
                        line = str.substring(0, index).replace("\r", '');
                        while (line.startsWith('>') || line.startsWith('$')) {
                            line = line.substring(1);
                        }
                        console.log('>>', line);
                        this.queue.push(line);
                        str = str.substring(index + 1);
                        index = str.indexOf("\n");
                    }
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

    async readUntilEmpty() {
        const result = [];
        let line;
        do {
            line = await this.queue.tryPop();
            if (line) {
                result.push(line);
            }
        } while (line);
        return result;
    }

    async send(command, terminator = "\n") {
        console.log(command);
        await this.readUntilEmpty();
        this.writer.write(this.encoder.encode(command + terminator));
        await this.sleep(10);
    }
}
