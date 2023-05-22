import ConsumerQueue from 'consumer-queue';

const decoder = new TextDecoder();
let done = false;
const encoder = new TextEncoder();
let isEchoing = true;
let mode = '>';
let port = null;
let readLoopActive = true;
let readLoopPromise = null;
let reader = null;
let str = '';
let writer = null;
const queue = new ConsumerQueue();

onmessage = (e) => {
    switch (e.data.task) {
        case 'connect':
            connect();
            break;
        case 'disconnect':
            disconnect();
            break;
        case 'escape':
            escape();
            break;
        case 'record':
            record(e.data.lines);
            break;
        case 'write':
            write(e.data.id, e.data.command, e.data.terminator, e.data.lineEnd);
            break;
    }
};

async function connect() {
    [port] = await navigator.serial.getPorts();
    try {
        await port.open({
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: 'none',
        });
    } catch (error) {
        postMessage({ event: 'logError', message: error?.message || 'Unable to open port.' });
        return;
    }

    port.addEventListener('disconnect', disconnect);

    if (port?.writable == null) {
        postMessage({ event: 'logError', message: 'Port is not a writable.' });
        return;
    }
    if (port?.readable == null) {
        postMessage({ event: 'logError', message: 'Port is not a readable.' });
        return;
    }

    writer = port.writable.getWriter();
    reader = port.readable.getReader();

    postMessage({ event: 'connected' });

    readLoopPromise = readLoop();

    await sleep(100);
    await synchronize();
}

async function disconnect() {
    try {
        // await this.stopReadLoop();
        await writer.releaseLock();
        await reader.releaseLock();
        await port.close();
        postMessage({ event: 'disconnected' });
    } catch (error) {
        postMessage({ event: 'logError', message: error?.message || 'There were problems disconnecting.' });
    }
}

async function escape() {
    done = true;
    await sleep(10);
    queue.cancelWait(new Error('Escape'));
    await writeWithin('\x1B', '');
    postMessage({ event: 'logEvent', message: 'Stopped program.' });

    readLoopPromise = readLoop();
}

async function flush() {
    return new Promise(async (resolve) => {
        const result = [];
        let line;
        do {
            line = await queue.tryPop();
            if (line) {
                result.push(line);
            }
        } while (line);

        // Clear read loop string.
        if (!result.length) {
            str = '';
        }

        console.log('flushed', result);
        resolve(result);
    });
}

async function getVersion() {
    const result = await writeWithin('version()');
    for (const line of result) {
        console.log('line', line, (line.match(/\./g) || []).length);
        if (line.startsWith('v') && (line.match(/\./g) || []).length === 2) {
            return line;
        }
    }
    return undefined;
}

async function readLoop() {
    let line;
    readLoopActive = true;

    while (readLoopActive) {
        try {
            const { value, done } = await reader.read();

            console.log('Reading...');
            str += decoder.decode(value).replace('\r', '');

            if (!str) {
                continue;
            }

            let index = str.indexOf('\n');

            if (index > -1) {
                str.split("\n").forEach((value) => console.log('->', value));
            } else {
                console.log('->', str);
            }

            // if (this.isConnected) {
            //     if (this.output.length && str.startsWith(this.output[this.output.length - 1])) {
            //         this.output[this.output.length - 1] = str;
            //     } else if (index === -1) {
            //         this.output.push(str);
            //     }
            // }

            while (index > -1) {
                line = str.substring(0, index);
                if (line) {
                    console.log('queued:', line);
                    queue.push(line);

                    // if (this.isConnected) {
                    //     if (this.output.length && this.output[this.output.length - 1].startsWith(line)) {
                    //         this.output[this.output.length - 1] = line;
                    //     } else {
                    //         this.output.push(line);
                    //     }
                    // }
                }

                str = str.substring(index + 1);
                index = str.indexOf('\n');
            }

            if (str === '>' || str === '$' || str === '&') {
                console.log('queued:', str);
                queue.push(str);
                str = '';
                // this.output.push('');
            }

            if (done) {
                readLoopActive = false;
            }

            await sleep(1);
        } catch (error) {
            console.error(error);
        }
    }
}

function readUntil(terminator = null) {
    if (!terminator) {
        terminator = mode;
    }
    return new Promise(async (resolve) => {
        const result = [];
        let line;
        do {
            line = await queue.pop().catch(() => {
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

async function record(lines) {
    postMessage({ event: 'recording', percent: 0 });

    await writeWithin('pgmstream()', '&');

    let lineNumber = 0;
    for (let line of lines) {
        if (line.trim().length === 0) {
            line = ' ';
        }
        await stream(line + '\n');
        postMessage({ event: 'recording', percent: (++lineNumber/lines.length) * 100 });
    }

    postMessage({ event: 'recording', percent: 100 });

    await stream('\0');
    await readUntil();

    postMessage({ event: 'recorded' });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stream(data) {
    const BLOCK_SIZE = 64;

    let bytes = encoder.encode(data);
    let count = bytes.length;
    let offset = 0;

    while (count > 0) {
        const buf = bytes.subarray(offset, offset + Math.min(BLOCK_SIZE, count));
        await writer.write(buf);

        const response = await queue.tryPop();
        if (response) {
            // this.output.push(response);
            return response;
        }

        offset += BLOCK_SIZE;
        count -= buf.length;
        await sleep(1);
    }

    return null;
}

async function synchronize() {
    // Escape the current program.
    writer.write(encoder.encode('\x1B'));
    console.log('wrote escape');

    await sleep(100);

    let result = await flush();

    console.log('escape result', result);
    if (result.length === 1) {
        result = result.pop();
        if (result === '>' || result === '$') {
            mode = result;
            console.log('mode set to', result);
        }
    }

    if (isEchoing) {
        await turnOffEcho();
    }

    // Try to get the version.
    let tryCount = 3;
    while (tryCount > 0) {
        await sleep(100);
        const result = await getVersion();
        if (typeof result === 'string') {
            postMessage({ event: 'version', result });
            break;
        }
        tryCount--;
    }
}

async function turnOffEcho() {
    if (!isEchoing) {
        return;
    }
    await writeWithin('echo(0)');
    isEchoing = false;
}

function write(id, command, terminator = null, lineEnd = '\n') {
    console.log('----- write -----');
    flush().then(() => {
        writer.write(encoder.encode(command + lineEnd));
        console.log('wrote', command);

        if (command === '>' || command === '$') {
            mode = command;
        }

        console.log('write is reading');
        readUntil(terminator ? terminator : mode)
            .then((result) => {
                console.log('write result', result);
                postMessage({ event: 'writeResult', id, result });
            });
    });
}

async function writeWithin(command, terminator = null, lineEnd = '\n') {
    console.log('----- write within -----');

    await flush();

    writer.write(encoder.encode(command + lineEnd));
    console.log('wrote', command);

    if (command === '>' || command === '$') {
        mode = command;
    }

    console.log('write is reading');
    return await readUntil(terminator ? terminator : mode);
}