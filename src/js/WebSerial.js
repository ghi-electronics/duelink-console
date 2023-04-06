// import ConsumerQueue from 'consumer-queue';

export default class WebSerial {
    constructor() {
        this.errorLog = [];
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        // this.queue = new ConsumerQueue();
        this.readLoopActive = false;
        this.readLoopPromise = null;
        this.output = [];
        this.isConnected = false;
    }

    async connect() {
        this.port = await navigator.serial.requestPort({ usbVendorId: 0x1B9F });

        try {
            await this.attach();
        } catch (error) {
            this.errorLog.push(error);
            this.port = null;
        }

        await this.sleep(100);
        await this.synchronize();

        await this.send('>');

        // Turn off echoing
        await this.send('echo(0)');

        this.startReadLoop();

        this.isConnected = true;
    }

    async synchronize() {
        // Escape the current program
        await this.send("\x1B", '');
        // Version
        await this.send('version()');
    }

    async disconnect() {
        await this.detach();
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

    async sleep(ms) {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    async detach() {
        await this.stopReadLoop();
        await this.writer.releaseLock();
        await this.reader.releaseLock();
        await this.port.close();
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

    async readResponse(v1 = true) {
        let str = this.leftOver;
        const end = Date.now() + this.readTimeout;

        const response = { success: false, response: null };

        while (Date.now() < end) {
            const { value, _ } = await this.reader.read();
            if (value) {
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
        }
    }

    async readResponse2() {
        let str = '';
        try {
            while (true) {
                console.log('reading...');
                const { value, done } = await this.reader.read();
                // const { value, done } = await Promise.race([
                //     this.reader.read(),
                //     new Promise((_, reject) => setTimeout(reject, this.readTimeout))
                //         .catch(() => ({ value: null, done: true }))
                // ]);
                if (value) {
                    const text = this.decoder.decode(value);
                    str += text;
                    console.log('value', text);
                } else {
                    console.log('no value');
                }
                if (done) {
                    console.log('done');
                    break;
                } else {
                    console.log('not done');
                }
            }
        } catch (error) {
            console.error(error);
        }
        return str;
    }

    async send(command, terminator = "\n") {
        command += terminator;
        this.writer.write(this.encoder.encode(command));
        console.log(command);
        await this.sleep(1);
    }

    async readLoop() {
        let str = '';
        this.readLoopActive = true;
        while (this.readLoopActive) {
            try {
                const { value, done } = await this.reader.read();
                if (value) {
                    str += this.decoder.decode(value);
                    const index = str.indexOf("\n");
                    if (index > -1) {
                        this.output.push(str.substring(0, index).replace("\r", ''));
                        str = str.substring(index + 1);
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
}
