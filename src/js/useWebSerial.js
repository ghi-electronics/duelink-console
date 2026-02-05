
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

    const eraseall_status_dms = ref(0);
    const eraseall_vid_dms = ref(0);

    const update_driver_status = ref(0);
    const driver_ver = ref("");
    const device_name = ref("");
    const progress_percent = ref(0);
    const update_driver_path = ref("");
    const update_devaddr=ref(1);
    const connect_status=ref(0);

    const connection_mode=ref(0);; // 0: duelink regular, 1: update driver, 1: erase all
    const clone_fw_status=ref(0)
    const clone_fw_progress=ref(0)
    const clone_fw_dev=ref(0)
    
    

    let memoryRegionsCallback = null;

    // Const
    const GHI_VID = 0x1B9F;
    const DL_PID = 0xF300;
    const MB_PID = 0xF301;

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
            //const available = await navigator.serial.getPorts(); // this refresh port only
            await navigator.serial.requestPort({ 
                filters: [
                    { usbVendorId: GHI_VID, usbProductId:DL_PID } // GHI Electronics VID           
                ]
             });
        } catch (error) {
            logError(error?.message || 'Unable to request port.');
            isBusy.value = false;
            return 0;
        }
        //update_devaddr.value = 1;
        worker.postMessage({ task: 'connect', value: update_devaddr.value });
        return 1;
    }

    async function eraseall_dms_execute() {
        if (window.document.documentMode || !navigator.serial) {
            window.location = '/browser-not-supported.html';
        }

        isBusy.value = true;

        worker.postMessage({ task: 'eraseall_dms_execute_msg' });
    }

    async function eraseall_dms_connect() {
        if (window.document.documentMode || !navigator.serial) {
            window.location = '/browser-not-supported.html';
        }

        if (isConnected.value == false) {
            
            try {
                //const available = await navigator.serial.getPorts(); // this refresh port only
                await navigator.serial.requestPort({ 
                    
                    filters: [
                        { usbVendorId: GHI_VID, usbProductId:DL_PID }, // GHI Electronics VID
                        { usbVendorId: GHI_VID, usbProductId:MB_PID }  
                    ]
                });
            } catch (error) {
                logError(error?.message || 'Unable to request port.');                
                eraseall_status_dms.value = 1;
                return;
            }

            worker.postMessage({ task: 'eraseall_dms_connect_msg',value: update_devaddr.value });
        }
        else {
            eraseall_status_dms.value = 1;
        }
    }

    // driver update
    async function driver_connect() {
        if (window.document.documentMode || !navigator.serial) {
            window.location = '/browser-not-supported.html';
        }

        if (isConnected.value == false) {
            
            try {
                //const available = await navigator.serial.getPorts(); // this refresh port only
                await navigator.serial.requestPort({ 
                    
                    filters: [
                        { usbVendorId: GHI_VID, usbProductId:DL_PID } // GHI Electronics VID                     
                    ]
                });
            } catch (error) {
                logError(error?.message || 'Unable to request port.');     
                update_driver_status.value = -1;           
                return 0;
            }
            
            worker.postMessage({ task: 'driver_connect_msg', value: update_devaddr.value });
            update_driver_status.value = 1;
        }
        else {
            update_driver_status.value = 1;
        }

        return 1;
    }

    async function driver_update() {
        if (isConnected.value == true)
        {

            worker.postMessage({ task: 'driver_connect_updadate_msg' });
        }
        
    }

    async function sendescape() {
        if (isConnected.value == true)
        {
            worker.postMessage({ task: 'sendescape' });
        }        
    }

    async function do_clone_fw(add_start, add_end) {
        if (isConnected.value == true)
        {
            worker.postMessage({ task: 'do_clone_fw', value1: add_start, value2: add_end });
        }  
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

    function memoryRegionsSelect(regionSelected = false) {        
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
                if (connection_mode.value == 0) {
                    memoryRegionsSelect(true);
                }

                connect_status.value = 1;
                break;
            case 'disconnected':
                isConnected.value = false;
                logEvent('Port disconnected.');
                regions.value = [];
                connect_status.value = -1;
                isBusy.value = false;
                break;
            case 'erased':
                regions.value = [];
                emitter.emit('erased');
                break;
            case 'isTalking':
                isTalking.value = data.value;
                // window.console.log('***********  TQD isTalking.......' + isTalking.value );
                // if (data?.lastCommand?.startsWith?.('region')) {
                    // window.console.log('***********  TQD isTalking command: ' + data?.lastCommand );
                    // // memoryRegionsSelect(false);
                // }
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
                
                memoryRegionsSelect(false);
                break;
            case 'regionSelected':
                // Toggle `current` for each region.
                regions.value.forEach((region) => region.current = region.index === data.index);
                memoryRegionsSelect(true);
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
                connect_status.value = -2;
                isBusy.value = false;
                
                break;

            case 'eraseall_status_dms':
                eraseall_status_dms.value = data.value;
                break; 
                
            case 'eraseall_vid_dms':
                eraseall_vid_dms.value = data.value;
                break;

            case 'update_driver_status':
                update_driver_status.value = data.value;
                break;

            case 'driver_ver_msg':
                driver_ver.value = data.value;
                break;

            case 'device_name_msg':
                device_name.value = data.value;
                break;

            case 'update_driver_percent_msg':
                progress_percent.value = data.value;
                break;

            case 'update_driver_path_msg':
                update_driver_path.value = data.value;
                break; 
                
            case 'clone_fw_progress':
                clone_fw_progress.value = data.value
                break;  
                
            case 'clone_fw_dev':
                clone_fw_dev.value = data.value
                break;

            case 'clone_fw_status':
                clone_fw_status.value = data.value
                break
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
        eraseall_status_dms,
        eraseall_vid_dms,
        update_driver_status,
        driver_ver,
        device_name,
        progress_percent,
        update_driver_path,
        update_devaddr,
        connect_status,
        connection_mode,
        clone_fw_status,
        clone_fw_progress,
        clone_fw_dev,
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
        eraseall_dms_execute,        
        eraseall_dms_connect,
        driver_connect,
        driver_update,
        sendescape,
        do_clone_fw,
    };
}
