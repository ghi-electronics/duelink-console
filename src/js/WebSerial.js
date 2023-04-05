import ConsumerQueue from 'consumer-queue';

export default class WebSerial {
    constructor() {
        this.errorLog = [];
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.readLoopPromise = null;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        this.queue = new ConsumerQueue();
        this.enableReadLoop = false;
    }

    async connect() {
        this.port = await navigator.serial.requestPort({ usbVendorId: 0x1B9F });
        try {
            await this.attach();
        } catch (error) {
            this.errorLog.push(error);
            this.port = null;
        }
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

        console.log(this.port);

        if (this.port?.writable == null) {
            this.errorLog.push('This is not a writable port.');
        }
        if (this.port?.readable == null) {
            this.errorLog.push('This is not a readable port.');
        }

        this.reader = this.port.readable.getReader();
        this.writer = this.port.writable.getWriter();

        this.startReadLoop();
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
        this.enableReadLoop = false;
        if (this.readLoopPromise) {
            await this.reader.cancel();
            await this.readLoopPromise;
            this.readLoopPromise = null;
        }
    }

    async readLoop() {
        let strBuf = '';
        let firstRun = 0
        this.enableReadLoop = true;
        while (this.enableReadLoop) {
            try {
                const { value, done } = await this.reader.read();
                if (value) {
                    const text = this.decoder.decode(value);
                    strBuf += text;
                    let idx = strBuf.indexOf('\n');

                    while (idx >= 0) {
                        let line = strBuf.substr(0, idx).replace("\r", "");
                        // We do this to eliminate the first three lines that the loader spits out when booted
                        if (firstRun < 2) {
                            if (line.includes("Bootloader")) {
                                firstRun = 0
                            } else if (line.includes("------")) {
                                firstRun = 1
                            } else if (line.includes("OK.")) {
                                // skip the OK that follows the header lines
                                firstRun = 2
                            }
                            else {
                                firstRun = 3
                            }
                        }

                        if (firstRun === 3) {
                            this.queue.push(line);
                        }

                        strBuf = strBuf.substr(idx + 1);
                        idx = strBuf.indexOf('\n');

                        if (firstRun === 2) {
                            firstRun = 3
                        }
                    }
                }
                if (done) {
                    this.enableReadLoop = false;
                }
            } catch (error) {
                this.errorLog.push(error);
                break;
            }
        }
    }

    async readUntil(str) {
        const result = [];
        let line = "";
        do {
            line = await this.queue.pop();
            result.push(line);
        } while (!line.startsWith(str));
        return result;
    }

    async readUntilEmpty() {
        const result = [];
        let line = "";
        do {
            line = await this.queue.tryPop();
            if (line) {
                result.push(line);
            }
        } while (line);
        return result;
    }

    async send(command) {
        command += "\n";
        await this.readUntilEmpty();
        this.writer.write(this.encoder.encode(command));
    }

    async sendAndExpect(command, str) {
        await this.send(command);
        return await this.readUntil(str);
    }
}
