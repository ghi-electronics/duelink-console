
import { ref, watch } from 'vue';

const worker = new Worker(new URL('worker.js', import.meta.url));

/**
 * Web Serial composable.
 * @param {Object} $refs
 * @param {import('mitt').Emitter} emitter
 * @returns {Object}}
 */
export default function useWebSerial($refs, emitter) {
    // Data
    const history = ref([]);
    const isBusy = ref(false);
    const isConnected = ref(false);
    const isPlaying = ref(false);
    const isStopped = ref(true);
    const isTalking = ref(false);
    const log = ref('');
    const regions = ref([]);
    const version = ref(null);

    let memoryRegionsCallback = null;

    // Setup

    let uid = 0;
    const callbacks = {};

    worker.addEventListener('message', (e) => onWorkerMessage(e.data));
    worker.addEventListener('error', (e) => {
        console.log(e);
        worker.terminate();
    });

    watch(() => log.value, (newValue) => {
        if (newValue === '') {
            worker.postMessage({ task: 'clearOutput' });
        }
    });

    // Methods - Toolbar

    async function connect() {
        if (window.document.documentMode || !navigator.serial) {
            window.location = '/browser-not-supported.html';
        }

        isBusy.value = true;

        try {
            await navigator.serial.requestPort({ usbVendorId: 0x1B9F });
        } catch (error) {
            logError(error?.message || 'Unable to request port.');
            isBusy.value = false;
            return;
        }

        worker.postMessage({ task: 'connect' });
    }

    async function disconnect() {
        worker.postMessage({ task: 'disconnect' });
    }

    function execute(line) {
        worker.postMessage({ task: 'execute', line });
    }

    function list(callback = null) {
        worker.postMessage({ task: 'list', callbackId: storeCallback(callback) });
    }

    /**
     * Request the worker to list all region code.
     */
    function listAll() {
        worker.postMessage({ task: 'listAll' });
    }

    function memoryRegions(regionSelected = false) {
        window.console.log('memoryRegions 1');
        if (regionSelected) {
            memoryRegionsCallback = () => emitter.emit('regionSelected');
        }
        worker.postMessage({ task: 'memoryRegions' });
    }

    /**
     * Request the worker to erase all regions.
     */
    function newAll() {
        worker.postMessage({ task: 'newAll' });
    }

    function play() {
        worker.postMessage({ task: 'play' });
    }

    function record(lines) {
        worker.postMessage({ task: 'record', lines });
    }

    /**
     * Request the worker to select a region.
     * @param {Number} index
     */
    function region(index) {
        worker.postMessage({ task: 'region', index });
    }

    function stop() {
        worker.postMessage({ task: 'stop' });
    }
    
    function erase_all() {
        worker.postMessage({ task: 'erase_all' });
    }

    // Methods - Utilities

    function logError(message) {
        history.value.push({ date: new Date(), error: message });
    }

    function logEvent(message) {
        history.value.push({ date: new Date(), event: message });
    }

    function onWorkerMessage(data) {
        switch (data.event) {
            case 'connected':
                isBusy.value = false;
                isConnected.value = true;
                logEvent('Port connected.');
                memoryRegions(true);
                break;
            case 'disconnected':
                isConnected.value = false;
                logEvent('Port disconnected.');
                break;
            case 'erased':
                regions.value = [];
                emitter.emit('erased');
                break;
            case 'isTalking':
                isTalking.value = data.value;
                if (data?.lastCommand?.startsWith?.('region')) {
                    memoryRegions();
                }
                break;
            case 'listAllResult':
                emitter.emit('listAllResult', data);
                break;
            case 'logError':
                logError(data.message);
                if (data.message.toLowerCase().indexOf('port') > -1) {
                    isBusy.value = false;
                }
                break;
            case 'logEvent':
                logEvent(data.message);
                break;
            case 'memoryRegionsResult':
                regions.value = [];
                // Ignore the headings.
                data.result.shift();
                // Make more usable.
                data.result.forEach((info) => {
                    if (info) {
                        info = info.match(/(\*?\d+)/gm);
                        const current = info[0].startsWith('*');
                        if (current) {
                            info[0] = info[0].substring(1, info[0].length);
                        }
                        regions.value.push({
                            current,
                            index: Number(info[0]),
                            used: Number(info[1]),
                            total: Number(info[2]),
                        });
                    }
                });
                if (memoryRegionsCallback) {
                    memoryRegionsCallback();
                    memoryRegionsCallback = null;
                }
                break;
            case 'output':
                log.value = data.value;
                break;
            case 'playing':
                isStopped.value = false;
                isPlaying.value = true;
                logEvent('Program started.');
                break;
            case 'recording':
                isPlaying.value = false;
                isStopped.value = true;
                if (data.percent === 0) {
                    $refs.progress.style.width = '0';
                    $refs.progress.classList.remove('opacity-0');
                } else {
                    $refs.progress.style.width = Math.trunc(data.percent) + '%';
                }
                break;
            case 'recorded':
                $refs.progress.style.width = '100%';
                $refs.progress.classList.add('opacity-0');
                //memoryRegions();
                break;
            case 'regionSelected':
                // Toggle `current` for each region.
                regions.value.forEach((region) => region.current = region.index === data.index);
                memoryRegions(true);
                break;
            case 'stopped':
                isPlaying.value = false;
                isStopped.value = true;
                logEvent('Program stopped.');
                break;
            case 'version':
                version.value = data.value;
                break;
            case 'writeResult':
                if (callbacks[data.callbackId]) {
                    callbacks[data.callbackId](data.result);
                    delete callbacks[data.callbackId];
                }
                break;
            case 'ConnectFailed':
                const index = data.message.indexOf(':');
                let msg = data.message               
                
                if (index !== -1)
                    msg = data.message.substring(0, index)

                alert(msg)
                
                break;
        }
    }

    function storeCallback(callback) {
        let id = null;
        if (callback) {
            id = ++uid;
            callbacks[id] = callback;
        }
        return id;
    }

    // Export
    return {
        // Data
        history,
        isBusy,
        isConnected,
        isPlaying,
        isStopped,
        isTalking,
        log,
        regions,
        version,
        // Methods
        connect,
        disconnect,
        execute,
        list,
        listAll,
        newAll,
        play,
        record,
        region,
        stop,
        erase_all,
    };
}
