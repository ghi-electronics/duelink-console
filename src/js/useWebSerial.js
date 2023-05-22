
import { ref } from 'vue';

const worker = new Worker(new URL('worker.js', import.meta.url), { type: 'module' });

export default function useWebSerial($refs) {
    // Data

    const isBusy = ref(false);
    const isConnected = ref(false);
    const isPlaying = ref(false);
    const isStopped = ref(true);
    const isTalking = ref(false);
    const logs = ref([]);
    const output = ref('');
    const version = ref(null);

    // Setup

    let uid = 0;
    const callbacks = {};

    worker.addEventListener('message', (e) => onWorkerMessage(e.data));

    // Methods - Toolbar

    async function connect() {
        isBusy.value = true;

        try {
            await navigator.serial.requestPort({ usbVendorId: 0x1B9F });
        } catch (error) {
            logError(error?.message || 'Unable to request port.');
            isBusy.value = false;
            return;
        }

        console.log('connect sent');
        worker.postMessage({ task: 'connect' });
    }

    async function disconnect() {
        worker.postMessage({ task: 'disconnect' });
    }

    function record(lines) {
        worker.postMessage({ task: 'record', lines });
    }

    function play() {
        worker.postMessage({ task: 'play' });
    }

    function stop() {
        worker.postMessage({ task: 'stop' });
    }

    function list(callback = null) {
        worker.postMessage({ task: 'list', callbackId: storeCallback(callback) });
    }

    function execute(line) {
        worker.postMessage({ task: 'execute', line });
    }

    // Methods - Utilities

    function logError(message) {
        logs.value.push({ error: message });
    }

    function logEvent(message) {
        logs.value.push({ event: message });
    }

    function onWorkerMessage(data) {
        switch (data.event) {
            case 'connected':
                isBusy.value = false;
                isConnected.value = true;
                logEvent('Port connected.');
                break;
            case 'disconnected':
                isConnected.value = false;
                logEvent('Port disconnected.');
                break;
            case 'isTalking':
                isTalking.value = data.value;
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
            case 'output':
                output.value = data.value;
                break;
            case 'playing':
                isStopped.value = false;
                isPlaying.value = true;
                logEvent('Program started.');
                break;
            case 'recording':
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
                break;
            case 'stopped':
                isPlaying.value = false;
                isStopped.value = true;
                logEvent('Program stopped.');
                break;
            case 'version':
                version.value = data.result;
                break;
            case 'writeResult':
                if (callbacks[data.callbackId]) {
                    callbacks[data.callbackId](data.result);
                    delete callbacks[data.callbackId];
                }
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
        isBusy,
        isConnected,
        isPlaying,
        isStopped,
        isTalking,
        logs,
        output,
        version,
        // Methods
        connect,
        disconnect,
        execute,
        list,
        play,
        record,
        stop,
    };
}
