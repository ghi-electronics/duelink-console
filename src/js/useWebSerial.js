
import { ref, watch } from 'vue';

const worker = new Worker(new URL('worker.js', import.meta.url));

export default function useWebSerial($refs) {
    // Data
    const history = ref([]);
    const isBusy = ref(false);
    const isConnected = ref(false);
    const isPlaying = ref(false);
    const isStopped = ref(true);
    const isTalking = ref(false);
    const log = ref('');
    const version = ref(null);

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
