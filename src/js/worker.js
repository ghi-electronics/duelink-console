console.log('worker');
import ConsumerQueue from 'consumer-queue';

const decoder = new TextDecoder();
const encoder = new TextEncoder();
let isConnected = false;
let isEchoing = true;
let isLogging = true;
let mode = '>';
let output = '';
let port = null;
let readLoopActive = true;
let readLoopPromise = null;
let reader = null;
let str = '';
let writer = null;
const queue = new ConsumerQueue();

self.addEventListener('message', (e) => {
    switch (e.data.task) {
        case 'connect':
            connect();
            break;
        case 'disconnect':
            disconnect();
            break;
        case 'execute':
            execute(e.data.line);
            break;
        case 'list':
            list(e.data.callbackId);
            break;
        case 'play':
            play();
            break;
        case 'record':
            record(e.data.lines);
            break;
        case 'stop':
            stop();
            break;
    }
});

// ACTIONS

async function connect() {
    log('worker: connect');
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
    
    startReadLoop();
    await sleep(100);
    await synchronize();

    isConnected = true;
    postMessage({ event: 'connected' });
}

async function disconnect() {
    try {
        await stopReadLoop();
        await writer.releaseLock();
        await reader.releaseLock();
        await port.close();
        isConnected = false;
        postMessage({ event: 'disconnected' });
        postMessage({ event: 'logEvent', message: 'Port disconnected.' });
    } catch (error) {
        postMessage({ event: 'logError', message: error?.message || 'There were problems disconnecting.' });
    }
}

async function execute(line) {
    await write('>');
    await write(line);
    postMessage({ event: 'logEvent', message: `Executed: &nbsp;<code>${line}</code>` });
}

async function list(callbackId) {
    const result = await write('list');
    postMessage({ event: 'writeResult', callbackId, result });
    postMessage({ event: 'logEvent', message: 'Listed program code.' });
}

async function play() {
    await write('run', null, '\n', true);
    postMessage({ event: 'playing' });
}

async function record(lines) {
    postMessage({ event: 'recording', percent: 0 });

    await write('pgmstream()', '&');

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
    postMessage({ event: 'logEvent', message: 'Recorded ' + lines.length + ' line(s) of code...' });
}

async function stop() {
    // Cancel any queue promises.
    queue.cancelWait(new Error('Stop'));
    // Write the escape character.
    writer.write(encoder.encode('\x1B'));
    // Log it.
    postMessage({ event: 'stopped' });
}

// UTILITIES

function flush() {
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

        log('flushed', result);
        resolve(result);
    });
}

async function getVersion() {
    const result = await write('version()');
    for (const line of result) {
        log('line', line, (line.match(/\./g) || []).length);
        if (line.startsWith('v') && (line.match(/\./g) || []).length === 2) {
            return line;
        }
    }
    return undefined;
}

async function readLoop() {
    let line, postOutput = true;
    readLoopActive = true;

    while (readLoopActive) {
        try {
            const { value, done } = await reader.read();

            log('Reading...', done);
            const finalValue = decoder.decode(value).replace('\r', '');

            if (isConnected) {
                output += finalValue;
                if (output.length > 2000) {
                    if (finalValue.length < output.length) {
                        output = output.substring(finalValue.length, output.length);
                        const index = output.indexOf('\n');
                        if (index > -1) {
                            output = output.substring(index + 1, output.length);
                        }
                        postOutput = true;
                    } else {
                        output = '';
                        postMessage({ event: 'output', value: 'Maximum output limit reached.' });
                        postOutput = false;
                    }
                }
                if (postOutput) {
                    postMessage({ event: 'output', value: output });
                }
            }

            str += finalValue;

            if (!str) {
                continue;
            }

            let index = str.indexOf('\n');

            if (index > -1) {
                str.split("\n").forEach((value) => log('->', value));
            } else {
                log('->', str);
            }

            while (index > -1) {
                line = str.substring(0, index);
                if (line) {
                    log('queued:', line);
                    queue.push(line);
                }

                str = str.substring(index + 1);
                index = str.indexOf('\n');
            }

            if (str === '>' || str === '$' || str === '&') {
                log('queued:', str);
                queue.push(str);
                str = '';
            }

            if (done) {
                readLoopActive = false;
            }

            await sleep(2);
        } catch (error) {
            console.error(error);
        }
    }
}

function log() {
    if (isLogging) {
        console.log(...arguments);
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
                log('read until', 'queue waiter terminated', result);
                resolve(result);
            });
            if (line) {
                result.push(line);
                if (line.startsWith('!')) {
                    log('Error:', line);
                    break;
                }
            }
        } while (line !== terminator);
        log('read until found', result);
        if (result.length > 1) {
            result.pop();
        }
        resolve(result);
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function startReadLoop() {
    readLoopPromise = readLoop();
}

async function stopReadLoop() {
    readLoopActive = false;
    if (readLoopPromise) {
        await reader.cancel();
        await readLoopPromise;
        readLoopPromise = null;
    }
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
    log('wrote escape');

    await sleep(100);

    let result = await flush();

    log('escape result', result);
    if (result.length === 1) {
        result = result.pop();
        if (result === '>' || result === '$') {
            mode = result;
            log('mode set to', result);
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
    await write('echo(0)');
    isEchoing = false;
}

// 'ESC' should not be sent through this write function.
async function write(command, terminator = null, lineEnd = '\n', skipReading = false) {
    try {
        log('----- write -----');
        postMessage({ event: 'isTalking', value: true });

        await flush();

        writer.write(encoder.encode(command + lineEnd));
        log('wrote', command);

        if (command === '>' || command === '$') {
            mode = command;
        }

        if (!skipReading) {
            log('write is sleeping');
            await sleep(50);
            log('write is reading until', terminator ? terminator : mode);
            const result = await readUntil(terminator ? terminator : mode);
            log('write result', result);
            return result;
        }
    } finally {
        postMessage({ event: 'isTalking', value: false });
    }
}