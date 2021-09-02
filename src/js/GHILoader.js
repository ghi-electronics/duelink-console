import ConsumerQueue from 'consumer-queue';
import Xmodem from './Xmodem';

const log = function (message) {
    //console.log(message);
};

export default class GHILoader {
    constructor() {
        this.port = null;
        this.writer = null;
        this.reader = null;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        this.inputStream = null;
        this.outputStream = null;
        this.respq = new ConsumerQueue();
        this.xmodem = new Xmodem();
        this.readLoopPromise = null;
        this.enableReadLoop = false;
    }

    async open(port) {
        try {
            this.port = port;
            await this.attach();
            this.startReadLoop();
        } catch (err) {
            alert(err);
            this.port = null;
            throw err;
        }
    }

    async readLoop() {
        let strbuf = "";
        let firstRun = 0
        this.enableReadLoop = true;
        while (this.enableReadLoop) {
            try {
                const { value, done } = await this.reader.read();
                if (value) {
                    const text = this.decoder.decode(value);
                    log("ghiLoader <<< ", text);
                    strbuf += text;
                    let idx = strbuf.indexOf('\n');
                    while (idx >= 0) {
                        let line = strbuf.substr(0, idx).replace("\r", "");
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
                            this.respq.push(line);
                        }

                        strbuf = strbuf.substr(idx + 1);
                        idx = strbuf.indexOf('\n');

                        if (firstRun === 2) {
                            firstRun = 3
                        }
                    }
                }
                if (done) {
                    this.enableReadLoop = false;
                }
            } catch (err) {
                log(err)
                break;
            }
        }
    }

    async attach() {
        const options = {
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: 'none',

            // Prior to Chrome 86 these names were used.
            baudrate: 115200,
            databits: 8,
            stopbits: 1,
            rtscts: false,
        };
        await this.port.open(options);
        if (this.port?.writable == null) {
            throw new Error("This is not a writable port");
        }
        if (this.port?.readable == null) {
            throw new Error("This is not a readable port");
        }

        this.reader = this.port.readable.getReader();
        this.writer = this.port.writable.getWriter();
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

    async detach() {
        await this.stopReadLoop();
        await this.writer.releaseLock();
        await this.reader.releaseLock();
        await this.port.close();
    }

    async close() {
        await this.detach();
    }

    ensureOpen() {
        if (!this.port) {
            throw new Error("port not opened");
        }
    }

    async readUntil(terminator) {
        const result = [];
        let line = "";
        do {
            line = await this.respq.pop();
            result.push(line);
        } while (line !== terminator);
        return result;
    }

    async readUntilEmpty() {
        const result = [];
        let line = "";
        do {
            line = await this.respq.tryPop();
            if (line) {
                result.push(line);
            }
        } while (line);
        return result;
    }

    async sendCommand(cmd) {
        await this.readUntilEmpty();
        log("ghiLoader >>> " + cmd)
        this.writer.write(this.encoder.encode(cmd + "\n"))
    }

    async sendAndExpect(cmd, exp) {
        await this.sendCommand(cmd);
        return await this.readUntil(exp);
    }

    async sendConfirmAndExpect(cmd, exp) {
        await this.sendCommand(cmd);
        var line = await this.respq.pop();
        if (line.endsWith("?")) {
            await this.sendAndExpect("Y", exp);
        }
    }

    async loaderVersion() {
        this.ensureOpen();
        const response = await this.sendAndExpect("v", "OK.");
        return response[0];
    }

    async erase() {
        this.ensureOpen();
        await this.sendConfirmAndExpect("E", "OK.");
    }

    async flash(data, isGlb, progressFn) {
        this.ensureOpen();
        if (isGlb) {
            await this.sendConfirmAndExpect("U", "Waiting...");
        } else {
            await this.sendConfirmAndExpect("X", "Waiting...");
        }
        await this.detach(); // stop the read loop and detach, but this leaves the readers in a bad state
        await this.attach(); // attach again without the read loop running
        try {
            await this.xmodem.send(this.reader, this.writer, data, progressFn)
        } catch (err) {
            log("Xmodem error : ", err)
        }
        // start the read loop again
        this.startReadLoop();
    }
}
