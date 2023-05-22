
import { ref } from 'vue';

const worker = new Worker(new URL('worker.js', import.meta.url + '/js/'), { type: 'module' });

export default function useWebSerial($refs) {
    // Data

    const isBusy = ref(false);
    const isConnected = ref(false);
    const isTalking = ref(false);
    const logs = ref([]);
    const output = ref([]);
    const version = ref(null);

    // Setup

    let uid = 0;
    const callbacks = {};

    worker.addEventListener('message', (e) => onWorkerMessage(e.data));

    // Methods

    function logError(message) {
        logs.value.push({ error: message });
    }

    function logEvent(message) {
        logs.value.push({ event: message });
    }

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

    function escape() {
        worker.postMessage({ task: 'escape' });
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
            case 'logError':
                logError(data.message);
                if (data.message.toLowerCase().indexOf('port') > -1) {
                    isBusy.value = false;
                }
                break;
            case 'logEvent':
                logEvent(data.message);
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
            case 'version':
                version.value = data.result;
                break;
            case 'writeResult':
                if (callbacks[data.id]) {
                    callbacks[data.id](data.result);
                    delete callbacks[data.id];
                }
                break;
        }
    }

    function record(lines) {
        worker.postMessage({ task: 'record', lines });
    }

    /**
     * @param {String} command
     * @param {Function} [callback=null]
     * @param {String} [terminator=null]
     * @param {String} [lineEnd='\n']
     */
    function write(command, callback = null, terminator = null, lineEnd = '\n') {
        let id = null;
        if (callback) {
            id = ++uid;
            callbacks[id] = callback;
        }
        worker.postMessage({ task: 'write', id, command, terminator, lineEnd });
    }

    // Export
    return {
        // Data
        isBusy,
        isConnected,
        isTalking,
        logs,
        output,
        version,
        // Methods
        connect,
        disconnect,
        escape,
        record,
        write,
    };
}
