importScripts('../consumer-queue.min.js');

const decoder = new TextDecoder();
const encoder = new TextEncoder();
let ignoreOutput = false;
let isConnected = false;
let isEchoing = true;
let isLogging = true;
let mode = '>';
let output = '';
let port = null;
let readLoopActive = true;
let readLoopPromise = null;
let reader = null;
let stopped = true;
let str = '';
let writer = null;
const queue = new ConsumerQueue();
const ignoreChars = ['>', '$', '&'];

const GHI_VID = 0x1B9F;
const DL_PID = 0xF300;
const MB_PID = 0xF301;

addEventListener('message', (e) => {
    log(`---- on "message", do task: ${e.data.task} ----`);
    switch (e.data.task) {
        case 'clearOutput':
            output = '';
            break;
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
        case 'listAll':
            listAll();
            break;
        case 'memoryRegions':
            //log('memoryRegions 1b');
            memInfo();
            break;
        case 'newAll':
            newAll();
            break;
        case 'play':
            play();
            break;
        case 'record':
            record(e.data.lines);
            break;
        case 'region':
            region(e.data.index);
            break;
        case 'stop':
            stop();
            break;

        case 'eraseall_dms_execute_msg':
            eraseall_dms_execute();
            break;

        case 'eraseall_dms_connect_msg':
            eraseall_dms_connect();
            break;  
            
        case 'driver_connect_msg':
            do_driver_connect();
            break; 

        case 'driver_connect_updadate_msg':
            do_driver_update();
            break; 
    }
});

// ACTIONS

async function connect() {
    log(`Port status ${isConnected}`);
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
        postMessage({ event: 'ConnectFailed', message: error?.message, name: error.name, full:error });
        logError(error?.message || 'Unable to open port.');
        return;
    }

    port.addEventListener('disconnect', () => {
        log('Port disconnected');
        disconnect();
    });

    if (port?.writable == null) {
        logError('Port is not a writable.');
        return;
    }
    if (port?.readable == null) {
        logError('Port is not a readable.');
        return;
    }

    writer = port.writable.getWriter();
    reader = port.readable.getReader();
    
    startReadLoop();
    await sleep(100);
    let ret = await synchronize();

    if (ret != 0) {
        isConnected = true;
        const info = port.getInfo();
        postMessage({ event: 'connected' });
        postMessage({ event: 'eraseall_vid_dms', value: ((info.usbVendorId << 16) | info.usbProductId)});
    }
    else {
        //logEvent('There was an error while connencting.');
        postMessage({ event: 'ConnectFailed', message: "Unable to detect DUELink firmware.", name: "Device is busy" });
    }
}

async function eraseall_dms_execute() {
    const info = port.getInfo();
    
    if (info.usbVendorId == GHI_VID && info.usbProductId == MB_PID) {
        await writer.write(new Uint8Array([0xFA, 0x0F, 0xC7]));
        await sleep(200);        
        postMessage({ event: 'eraseall_status_dms', value: 2 });       
    }
    else if (info.usbVendorId == GHI_VID && info.usbProductId == DL_PID) {
        await writer.write(encoder.encode("\n"));                 
        await sleep(400);
        await writer.write(encoder.encode("reset(1)\n"));         
        await sleep(100);
        await writer.write(encoder.encode("reset(1)\n"));         
        await sleep(700);
        postMessage({ event: 'eraseall_status_dms', value: 2 });  
        
    }

    //await disconnect();
}

async function eraseall_dms_connect() {
    log(`Port status ${isConnected}`);
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
        postMessage({ event: 'ConnectFailed', message: error?.message, name: error.name, full:error });
        logError(error?.message || 'Unable to open port.');
        return;
    }

    port.addEventListener('disconnect', () => {
        log('Port disconnected');
        disconnect();
    });

    if (port?.writable == null) {
        logError('Port is not a writable.');
        return;
    }
    if (port?.readable == null) {
        logError('Port is not a readable.');
        return;
    }

    const info = port.getInfo();

    if (info.usbVendorId == GHI_VID) {
        writer = port.writable.getWriter();
        postMessage({ event: 'eraseall_vid_dms', value: ((info.usbVendorId << 16) | info.usbProductId)});
        
    }       

    postMessage({ event: 'eraseall_status_dms', value: 1});
        
}

// driver update
let dl_json_data = null;
async function loadDLJson() {
  //const response = await fetch('https://www.duelink.com/duelink.json');
  const response = await fetch('https://raw.githubusercontent.com/ghi-electronics/duelink-website/refs/heads/dev/static/duelink.json');
  
  const json = await response.json();

  // Ensure products array exists
  dl_json_data = Array.isArray(json.products) ? json.products : [];
}

function getDeviceByPID(pid) {
   if (!dl_json_data) return "NA";

  // Convert pid to uppercase for case‑insensitive match
  const pidStr = String(pid).toUpperCase();

  const item = dl_json_data.find(d => String(d.PID).toUpperCase() === pidStr);

  if (!item) return "NA";

  return {
    name: item.name ?? "NA",
    partNumber: item.partNumber ?? "NA"
  };
}

let update_driver_ver = "";
let update_device_name = "";
let update_device_pid = "";
let update_device_partNum = "";
let update_can_update = false;
async function do_driver_connect() {
    update_can_update = false;
    await connect()

    await sleep(100);

    if (!isConnected) {
        return;
    }

    await writer.write(encoder.encode("\n"));                 
    await sleep(400);
    (await flush()).pop();
    await writer.write(encoder.encode("Dver()\n"));         
    await sleep(100);

    let response = await flush();


    if (response.length > 0) {   
        response.pop();

        let c = response.pop();

        if (c.includes("unknown identifier")) {

           update_driver_ver = "N/A";
        }
        else {
           update_driver_ver = c;
        }
        
    }

    // get pid
    await writer.write(encoder.encode("Info(0)\n")); 
    await sleep(100);
    response = await flush();
    if (response.length > 0) {  
        response.pop();

        let c = response.pop();

        const num = Number(c);

        const hexStr = num.toString(16).toUpperCase().padStart(6, "0");

        update_device_pid = "0x" + hexStr;

    }

    await loadDLJson();

    const device = getDeviceByPID(update_device_pid);

    if (device === "NA") {
        console.log("NA");
        return;
    } else {
       
        update_device_name = device.name;
        update_device_partNum = device.partNumber; 
        
        postMessage({ event: 'driver_ver_msg', value: update_driver_ver });
        postMessage({ event: 'device_name_msg', value: update_device_name });
        
        update_can_update = true;
    }
       
}

async function do_driver_update() {
    if (!isConnected || !update_can_update) {
        return;
    }

    //console.log(device.name, device.partNumber);

    const device_part_number = update_device_partNum.toLowerCase();
    //const device_driver_path = "https://www.duelink.com/code/driver/" + device_part_number + ".txt";
    const device_driver_path = "https://raw.githubusercontent.com/ghi-electronics/duelink-website/refs/heads/dev/static/code/driver/" + device_part_number + ".txt";

    const response = await fetch(device_driver_path);

    if (!response.ok) {
        console.error("Failed to load text file:", response.status);
        return;
    }
    driverText = await response.text(); // store content in variable
    //console.log("Driver text loaded:", driverText);

    const lines = driverText.replace(/\r/gm, '').replace(/\t/gm, ' ').split(/\n/);

    postMessage({ event: 'update_driver_percent_msg', value: 0 });

    // erase program
    await write('new all');

    // start program
    postMessage({ event: 'update_driver_percent_msg', value: 10 });


    await write('pgmbrst()', '&');
    
    postMessage({ event: 'update_driver_percent_msg', value: 20 });

    
    let lineNumber = 0;
    for (let line of lines) {
        await sleep(2);
        if (line.trim().length === 0) {
            line = ' ';
        }
        log('line', `"${line}"`);
        await stream(line + '\n');

        lineNumber++;

        let per =  Math.floor((lineNumber / lines.length) * 70);

        

        if (per > 70)
        {
            per = 70;
        }

        per = per + 20;

        postMessage({ event: 'update_driver_percent_msg', value: per });

        //postMessage({ event: 'recording', percent: (++lineNumber/lines.length) * 100 });
    }

    //postMessage({ event: 'recording', percent: 100 });

    postMessage({ event: 'update_driver_percent_msg', value: 95 });

    await stream('\0');
    await readUntil();


    await writer.write(encoder.encode("run\n"));         
    await sleep(100);

    await writer.write(encoder.encode("Statled(100,100,10)\n"));         
    await sleep(100);


    postMessage({ event: 'update_driver_percent_msg', value: 100 });
    
    //postMessage({ event: 'isTalking', value: false });

    //postMessage({ event: 'recorded' });
    //logEvent('Recorded ' + lines.length + ' line(s) of code.');

    // end program

    //console.log("done");


    
}

async function disconnect() {
    try {
        await stopReadLoop();
        if (writer) {
            await writer.releaseLock();
        }
        if (reader) {
            await reader.releaseLock();
        }
        await port.close();
        logEvent('Port disconnected.');
    } catch (error) {
        if (isConnected) {
            logEvent('There was an error while disconnecting.');
            logError(error?.message || 'Unknown error.');
        }
    } finally {
        isConnected = false;
        postMessage({ event: 'disconnected' });
        postMessage({ event: 'version', value: null });
    }
}

async function execute(line) {
    await write('>');
    line = line.toLowerCase();
    if (line.startsWith('mem')) {
        const result = await write(line);
        postMessage({ event: 'memoryRegionsResult', result });
    } else {
        await write(line);
    }
    logEvent(`Executed: &nbsp;<code>${line}</code>`);
}

async function list(callbackId) {
    const result = await write('list');
    postMessage({ event: 'writeResult', callbackId, result });
    logEvent('Listed program code.');
}

/**
 * List all region code.
 */
async function listAll() {
    const result = await write('list all');
    postMessage({ event: 'listAllResult', result });
}

async function memInfo() {
    
    //log('memoryRegions 2');
    ignoreOutput = true;
    const result = await write('mem()');
    postMessage({ event: 'memoryRegionsResult', result });
    ignoreOutput = false;
}

/**
 * Erase all regions.
 */
async function newAll() {
    //await write('>');
    await write('new all');
    postMessage({ event: 'erased' });
    await memInfo();
}

async function play() {
    stopped = false;
    postMessage({ event: 'playing' });
    await write('run');
    if (!stopped) {
        stopped = true;
        postMessage({ event: 'stopped' });
    }
}

async function record(lines) {
    postMessage({ event: 'recording', percent: 0 });

    await write('pgmbrst()', '&');
    
    postMessage({ event: 'isTalking', value: true });

    lines = lines.replace(/\r/gm, '').replace(/\t/gm, ' ').split(/\n/);
    let lineNumber = 0;
    for (let line of lines) {
        await sleep(1);
        if (line.trim().length === 0) {
            line = ' ';
        }
        log('line', `"${line}"`);
        await stream(line + '\n');
        postMessage({ event: 'recording', percent: (++lineNumber/lines.length) * 100 });
    }

    postMessage({ event: 'recording', percent: 100 });

    await stream('\0');
    await readUntil();
    
    postMessage({ event: 'isTalking', value: false });

    postMessage({ event: 'recorded' });
    logEvent('Recorded ' + lines.length + ' line(s) of code.');
}

/**
 * Select a region.
 * @param {Number} index
 */
async function region(index) {
    await write(`region(${index})`);
    postMessage({ event: 'regionSelected', index });
}

async function stop() {
    stopped = true;
    // Cancel any queue promises.
    queue.cancelWait(new Error('Stop'));
    // Write the escape character.
    writer.write(encoder.encode('\x1B'));
    // No longer playing.
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
                log('flushed - push line:', line);
            }
            else {
                log('flushed: No line');
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
        let p = line.indexOf ('GHI Electronics DUELink v')
        if ( p != -1) {
            let lines = line.split(':')
       
       
            return lines[0].substring(24);
        }
    }
    return undefined;
}

function log() {
    if (isLogging) {
        console.log(...arguments);
    }
}

function logError(message) {
    postMessage({ event: 'logError', message });
}

function logEvent(message) {
    postMessage({ event: 'logEvent', message });
}

async function readLoop() {
    let line, postOutput = true;
    readLoopActive = true;

    while (readLoopActive) {
        try {
            const { value, done } = await reader.read();

            log('Reading... Done?', done);
            const finalValue = decoder.decode(value).replace(/\r/gm, '');

            if (isConnected && !ignoreChars.includes(finalValue.substring(-1, 1))) {
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
                if (postOutput && !ignoreOutput) {
                    postMessage({ event: 'output', value: output });
                } else if (ignoreOutput) {
                    output = '';
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
            postMessage({ event: 'logError', message: error?.message || 'There were problems reading.' });
            break;
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
                log('read until', 'queue waiter terminated', result);
                resolve(result);
            });
            if (line) {
                result.push(line);
                if (line.startsWith('!')) {
                    log('Error:', line);
                    break;
                }
            } else {
                // The waiter was canceled so we break
                break;
            }
        } while (line !== terminator);
        log('read until found', result);
        if (result.length > 1) {
            result.pop();
        } else if (result?.[0] === terminator) {
            log('removed terminator from result', terminator);
            result.shift();
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
    // although USB fast but UART 115200 can send  ~10 bytes in 1ms.
    // If we program chain (from second device, it is always UART interface, need limited 10KB/second)
    const BLOCK_SIZE = 10; 

    let bytes = encoder.encode(data);
    let count = bytes.length;
    let offset = 0;

    while (count > 0) {
        const buf = bytes.subarray(offset, offset + Math.min(BLOCK_SIZE, count));
        await writer.write(buf);

        const response = await queue.tryPop();
        if (response) {
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
    let tryCount = 4;
    while (tryCount > 0) {
        await writer.write(encoder.encode('\x1B'));
        log(`wrote escape count: ${4-tryCount + 1}`);

        await sleep(100);

        let result = await flush();

        log('escape result', result);
                
        
        if (result.length >= 1) { // when more than 1 device, more than '>' will be return
            result = result.pop();
            if (result === '>' || result === '$') {
                mode = result;
                log('mode set to', result);
            }
            
            break;
        }
        else {
                        
            if (result.length === 0) {
                await sleep(500);
            }
        }
        tryCount--;
    }
    
    log(`synchronize : ${4-tryCount + 1}`);
    
    if (tryCount === 0) {        
        await disconnect();
        return 0;
    }
    
    
    let result = await write('');
    log('new line result', result);

    await sleep(500); // max devices 255, each take 1ms, give 2ms to initialize
    
    result = await write('sel(1)');
    log('sel(1) result ', result);
        
    if (isEchoing) {
        await turnOffEcho();
    }

    // Try to get the version.
    tryCount = 3;
    while (tryCount > 0) {
        await sleep(100);
        const result = await getVersion();
        if (typeof result === 'string') {
            log('version found', result);
            postMessage({ event: 'version', value: result });
            break;
        }
        tryCount--;
    }
    
    return tryCount;


}

async function turnOffEcho() {
    if (!isEchoing) {
        return;
    }
    await write('echo(0)');
    isEchoing = false;
}

async function write(command, terminator = null, lineEnd = '\n') {
    try {
        log('----- write -----');
        postMessage({ event: 'isTalking', value: true });

        await flush();

        writer.write(encoder.encode(command + lineEnd));
        log('wrote', command);

        if (command === '>' || command === '$') {
            mode = command;
        }

        log('write is sleeping');
        await sleep(50);
        log('write is reading until', terminator ? terminator : mode);
        const result = await readUntil(terminator ? terminator : mode);
        log('write result', result);
        return result;
    } finally {
        postMessage({ event: 'isTalking', value: false, lastCommand: command });
    }
}