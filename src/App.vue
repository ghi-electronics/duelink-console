<template>
    <div id="progress-bar">
        <div
            :ref="(el) => $refs.progress = el"
            class="h-1 bg-sky-500 dark:bg-lime-500 transition duration-1000 ease-linear opacity-0"
        ></div>
    </div>
    <div class="min-h-screen flex flex-col space-y-0.5">
        <MenuBar
            v-model:theme="theme"
            @demo="demo"
            @firmware="firmwareModal.start()"
            @dfu="dfuModal.start()"
            @update:theme="updateTippyTheme"
            @updateTippy="updateTippy"            
            @eraseall_dms_menubar="eraseall_dms_show_confirm_pre"
        />
        <ToolBar
            :can-download="canDownload"
            :can-list="true"
            :can-load="true"
            :can-play="canPlay"
            :can-record="canRecord"
            :can-stop="canStop"
            :can-text-size-plus="textSize < 40"
            :can-text-size-minus="textSize > 12"
            :is-busy="webSerial.isBusy.value"
            :is-connected="webSerial.isConnected.value"
            :is-talking="webSerial.isTalking.value"
            @connect="webSerial.connect()"
            @disconnect="webSerial.disconnect()"
            @download="downloadModal.start()"
            @play="webSerial.play()"
            @stop="webSerial.stop()"
            @record="sendRecordMode"
            @list="sendList"
            @load="onLoad"
            @text-size-plus="textSizePlus"
            @text-size-minus="textSizeMinus"
        />
        <div class="flex-1 flex flex-col space-y-0.5 sm:space-y-0 sm:flex-row sm:space-x-0.5">
            <div id="editor" class="flex-1 p-2 flex flex-col">
                <VAceEditor
                    v-model:value="recordModeCode"
                    :lang="language"
                    :ref="(el) => $refs.editor = el"
                    :theme="theme === 'dark' ? 'tomorrow_night_bright' : 'crimson_editor'"
                    class="flex-1"
                    @init="onEditorInit"
                />
                <div id="direct-bar" class="p-2 sm:pl-[42px] flex space-x-2">
                    <div class="flex-1">
                        <div class="relative">
                            <div
                                class="absolute right-0 inset-y-0 p-1 flex items-center justify-center rounded-r-md"
                                @click="directModeCode = ''; $refs.input.focus();"
                            >
                                <div
                                    :class="[directModeCode.length
                                        ? 'text-slate-400 hover:text-slate-900 dark:text-zinc-600 dark:hover:text-zinc-100'
                                        : 'hidden'
                                    ]"
                                    class="flex items-center justify-center w-8 h-full rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900"
                                >
                                    <i class="fas fa-fw fa-xmark"></i>
                                </div>
                            </div>
                            <input
                                v-model="directModeCode"
                                :ref="(el) => $refs.input = el"
                                placeholder="Code to run immediately..."
                                type="text"
                                @keyup.enter="sendDirectMode"
                            />
                        </div>
                    </div>
                    <Button
                        :disabled="disabled"
                        data-tippy-content="Execute"
                        @click.native="sendDirectMode"
                    >
                        <i class="fas fa-fw fa-arrow-right"></i>
                    </Button>
                </div>
            </div>
            <div id="side-bar" class="sm:w-1/2 lg:w-1/3 p-2 space-y-0.5">
                <RegionsPanel
                    :regions="webSerial.regions.value"
                    @list-all="webSerial.listAll()"
                    @new-all="newAllModal.open = true"
                    @region="webSerial.region($event)"
                />
                <LogPanel v-model:log="webSerial.log.value" />
                <HistoryPanel v-model:history="webSerial.history.value" closed />
                <AboutPanel :available-dfu="availableDfu" :version="webSerial.version.value" />
            </div>
        </div>

        <div v-if="eraseall_dms_msgbox_confirm_pre" class="overlay">
            <div class="dialog">
                <div class="dialog-title">
                    <i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>
                    Warning
                </div>
                <div class="dialog-body">
                    <p>This feature only works on modules loaded with either DUELink official firmware or MicroBlocks firmware.<br>It will completely erase the device and put it in DFU (Device Firmware Update) mode.<br><br></p>
                </div>

                
                <div class="dialog-buttons">
                    <button class="yes" @click="do_eraseall_dms_pre_yes">Continue</button>
                    <button class="no" @click="do_eraseall_dms_pre_no">Abort</button>
                </div>
            </div>
        </div>

        <div v-if="eraseall_dms_msgbox_confirm_final" class="overlay">
            <div class="dialog">
                <div class="dialog-title">
                    <i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>
                    Warning
                </div>
                <div class="dialog-body">
                    <p>{{dms_confirm_final_text}}<br><br></p>
                </div>

                
                <div class="dialog-buttons">
                    <button class="yes" @click="do_eraseall_dms_final_yes">Yes</button>
                    <button class="no" @click="do_eraseall_dms_final_no">No</button>
                </div>                   
            </div>
        </div>

        <div v-if="eraseall_dms_msgbox_finished" class="overlay">
            <div class="dialog">
                <div class="dialog-title-success">
                    <i class="fas fa-check-circle" style="color: green; margin-right: 8px;"></i>
                    Success
                </div>
                <div class="dialog-body">
                     <p>Erase All operation completed.<br><br></p>        
                </div>

                <div class="dialog-buttons">
                    <button class="no" @click="eraseall_dms_msgbox_finished = false">OK</button>
                </div>       
            </div>
        </div>

        <div id="spacer"></div>
        <Footer />
    </div>
    
    <Modal :open="alreadyHasCodeModal.open">
        <template #title>
            Heads up!
        </template>
        <div>You already have code in the editor.</div>
        <div>Do you want to replace it?</div>
        <template #buttons>
            <div class="flex space-x-2">
                <Button class="w-full" @click.native="alreadyHasCodeModal.yes()">
                    Yes
                </Button>
                <Button class="w-full" type="secondary" @click.native="alreadyHasCodeModal.no()">
                    No
                </Button>
            </div>
        </template>
    </Modal>
              
    <Modal :open="downloadModal.open">
        <template #title>
            Download
        </template>
        <div>
            <div class="mb-2">What would you like to name the file?</div>
            <label for="filename">File name</label>
            <input
                v-model="filename"
                :ref="(el) => $refs.filename = el"
                class="mt-2"
                id="filename"
                type="text"
            />
        </div>
        <template #buttons>
            <div class="flex space-x-2">
                <Button :disabled="filename.length === 0" class="w-full" @click.native="downloadModal.download()">
                    Download
                </Button>
                <Button class="w-full" type="secondary" @click.native="downloadModal.cancel()">
                    Cancel
                </Button>
            </div>
        </template>
    </Modal>
    
    <FirmwareModal
        :available-firmware="availableFirmware"
        :open="firmwareModal.open"
        @close="firmwareModal.open = false"
    />

    <DFUModal
        :available-dfu="availableDfu"
        :open="dfuModal.open"
        @close="dfuModal.open = false"
    />
    
    <ListAllModal
        :code="listAllModal.code"
        :language="language"
        :open="listAllModal.open"
        :text-size="textSize"
        :theme="theme"
        @close="listAllModal.open = false"
    />
    
    <NewAllModal
        :open="newAllModal.open"
        @close="newAllModal.open = false"
        @confirm="webSerial.newAll(); newAllModal.open = false"
    />
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import tippy from 'tippy.js';
import { VAceEditor } from 'vue3-ace-editor';
import useWebSerial from './js/useWebSerial.js';
import mitt from "mitt";

// Components

import MenuBar from './components/MenuBar.vue';
import ToolBar from './components/ToolBar.vue';
import Footer from './components/Footer.vue';
import Button from './components/Button.vue';
import Modal from './components/Modal.vue';
import FirmwareModal from './components/FirmwareModal.vue';
import DFUModal from './components/DFUModal.vue';
import LogPanel from './components/LogPanel.vue';
import RegionsPanel from "./components/RegionsPanel.vue";
import HistoryPanel from './components/HistoryPanel.vue';
import AboutPanel from './components/AboutPanel.vue';
import ListAllModal from "./components/ListAllModal.vue";
import NewAllModal from "./components/NewAllModal.vue";

// Refs

const $refs = { editor: null, filename: null, input: null, progress: null };

// Data

const availableFirmware = reactive({});
const availableDfu = reactive({});
const recordModeCode = ref('');
const directModeCode = ref('');
const lastRecordModeCode = ref('');
const editorLine = ref(1);
const editorColumn = ref(1);
const filename = ref('');
const language = ref('python');
const theme = ref('light');
const textSize = ref(16);

const eraseall_dms_msgbox_confirm_final = ref(false);
const eraseall_dms_msgbox_confirm_pre = ref(false);
const eraseall_dms_msgbox_finished = ref(false);

const ERASE_ALL_DMS_CONFIRM_FINAL_TEXT = "Firmware detected.\nAre you sure you want to erase all and enter DFU mode?";
const dms_confirm_final_text = ref(ERASE_ALL_DMS_CONFIRM_FINAL_TEXT);


// Emitter

const emitter = mitt();

emitter.on('erased', () => {
    recordModeCode.value = '';
});

emitter.on('listAllResult', (data) => {
    if (data.result.length === 1 && data.result[0] === '>') {
        data.result = [];
    }
    listAllModal.code = data.result.join("\n");
    listAllModal.open = true;
});

emitter.on('regionSelected', () => sendList(null));

// Setup

const webSerial = useWebSerial($refs, emitter);

const tippyConfig = {
    animation: 'fade',
    appendTo: document.body,
    interactive: true,
    placement: 'bottom',
    theme: 'light',
};

const alreadyHasCodeModal = reactive({
    lines: [],
    list: false,
    open: false,
    target: null,
    async yes() {
        if (this.list) {
            this.list = false;
            webSerial.list((lines) => {
                if (lines.length) {
                    recordModeCode.value = lines.join('\n');
                } else{
                    recordModeCode.value = ''
                }
            });
        }
        if (this.lines.length) {
            recordModeCode.value = this.lines.join('\n');
            this.lines = [];
        }
        this.open = false;
        this.fixTippy();
    },
    async no() {
        if (this.list) {
            this.list = false;
            // This call will create output.
            // TQD: don't do anything since select no
            // webSerial.list();
        }
        this.open = false;
        this.fixTippy();
    },
    fixTippy() {
        if (this?.target?._tippy) {
            this.target._tippy.destroy();
            setTimeout(() => {
                tippyConfig.theme = theme.value;
                tippy(this.target, tippyConfig)
            }, 200);
        }
    },
});


const firmwareModal = reactive({
    open: false,
    toggleCounter: 0,
    start() {
        if (webSerial.isConnected) {
            webSerial.disconnect();
        }
        //this.open = true;
        this.toggleCounter++;
    },
});

const dfuModal = reactive({
    open: false,
    toggleCounter: 0,
    start() {
        if (webSerial.isConnected) {
            webSerial.disconnect();
        }
        //this.open = true;
        this.toggleCounter++;

        //console.log("Increased dfuModal.toggleCounter: " + this.toggleCounter)

    }
});

const downloadModal = reactive({
    open: false,
    start() {
        this.open = true;
        nextTick(() => $refs.filename.focus());
    },
    download() {
        download(filename.value);
        this.cancel();
    },
    cancel() {
        filename.value = '';
        this.open = false;
    },
});

const listAllModal = reactive({
    open: false,
    code: null,
});

const newAllModal = reactive({
    open: false,
});

let editor = null;
let tippyInstances = [];

// Computed

const canDownload = computed(() => recordModeCode.value.length > 0);
const canPlay = computed(() => recordModeCode.value !== '' && recordModeCode.value === lastRecordModeCode.value && !webSerial.isPlaying.value);
const canRecord = computed(() => recordModeCode.value.length > 0 && recordModeCode.value !== lastRecordModeCode.value);
const canStop = computed(() => !webSerial.isStopped.value);
const disabled = computed(() => !webSerial.isConnected.value || webSerial.isBusy.value || webSerial.isTalking.value);

// Watch

watch(() => webSerial.isConnected, (value) => {
    const el = document.getElementById('plugBtn');
    if (el) {
        updateTippy(el);
    }
    // When disconnected, re-enable record button.
    if (!value) {
        lastRecordModeCode.value = '';
    }
});

// Created

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    theme.value = 'dark';
    tippyConfig.theme = 'dark';
}

loadDfu()

// Mounted
function ClickAnyWhereCallback(event) {  
    if (dfuModal.toggleCounter === 1) {
        dfuModal.open = true
        dfuModal.toggleCounter = 0
        // console.log("Reset dfuModal.toggleCounter: " + dfuModal.toggleCounter )
    }
    else {
        dfuModal.open = false
    }

    if (firmwareModal.toggleCounter === 1) {
        firmwareModal.open = true
        firmwareModal.toggleCounter = 0
        // console.log("Reset dfuModal.toggleCounter: " + dfuModal.toggleCounter )
    }
    else {
        firmwareModal.open = false
    }
}

onMounted(() => {
    tippyInstances = tippy('[data-tippy-content]', tippyConfig);
    
    window.onbeforeunload = function() {
        if (recordModeCode.value) {
            return false;
        }
    }

    document.addEventListener('click', ClickAnyWhereCallback);
});

// Methods

async function demo(lines) {
    console.log('demo');
    if (recordModeCode.value) {
        alreadyHasCodeModal.lines = lines.slice(0);
        alreadyHasCodeModal.open = true;
    } else {
        recordModeCode.value = lines.join('\n');
    }
}

function download(filename) {
    if (!recordModeCode.value.length || !filename.length) {
        return;
    }
    const blob = new Blob([recordModeCode.value], { type: 'text/csv' });
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = `${filename}.txt`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

async function loadDfu() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/ghi-electronics/duelink-website/refs/heads/dev/static/duelink-fw.json');
        const jsonData = await response.json();
        
        Object.keys(jsonData).forEach((key) => {
            availableDfu[key] = jsonData[key];
            availableDfu[key].isGlb = false;
            availableDfu[key].image = null;
        });
    } catch (error) {
        console.log(error);
    }
}


function onEditorInit(instance) {
    instance.setShowPrintMargin(false);
    instance.setOptions({
        fontSize: textSize.value + 'px'
    });
    instance.session.selection.on('changeCursor', () => {
        const pos = instance.getCursorPosition();
        editorLine.value = pos.row + 1;
        editorColumn.value = pos.column + 1;
    });
    editor = instance;
}

function onLoad(lines) {
    if (recordModeCode.value) {
        alreadyHasCodeModal.lines = lines.slice(0);
        alreadyHasCodeModal.open = true;
    } else {
        recordModeCode.value = lines.join('\n');
    }
}

async function sendRecordMode() {
    console.log('sendRecordMode');
    lastRecordModeCode.value = recordModeCode.value;
    webSerial.record(recordModeCode.value);
}

async function sendDirectMode() {
    console.log('sendDirectMode');
    webSerial.execute(directModeCode.value.replace(/\t/gm, ' '));
}

async function sendList(target) {
    console.log('[App.vue] sendList');
    if (recordModeCode.value) {
        alreadyHasCodeModal.target = target;
        alreadyHasCodeModal.list = true;
        alreadyHasCodeModal.open = true;
    } else {
        webSerial.list((result) => {
            const code = result.join('\n');
            if (recordModeCode.value !== code) {
                recordModeCode.value = code;
                lastRecordModeCode.value = code;
            }
        });
    }
}

async function eraseall_dms_show_confirm_pre() {
    eraseall_dms_msgbox_confirm_pre.value = true
}

async function eraseall_dms_show_connect() {
   
    webSerial.eraseall_status_dms.value = 0;
    
    if (webSerial.isConnected.value == false) {
        webSerial.eraseall_vid_dms.value = 0;

        await webSerial.eraseall_dms_connect();
        
        while (webSerial.eraseall_status_dms.value == 0) {
            await sleep(100);
        }

        await sleep(100);
    }

    if ( webSerial.eraseall_vid_dms.value != 0){
        
        if (webSerial.eraseall_vid_dms.value == 0x1B9F) {
            dms_confirm_final_text.value = "DUELink "  + ERASE_ALL_DMS_CONFIRM_FINAL_TEXT;
        }
        else {
            dms_confirm_final_text.value = "MicroBlocks "  + ERASE_ALL_DMS_CONFIRM_FINAL_TEXT;
        }

        eraseall_dms_msgbox_confirm_final.value = true;
    }
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function do_eraseall_dms_pre_no() {
    eraseall_dms_msgbox_confirm_pre.value = false;
}

async function do_eraseall_dms_pre_yes() {
    eraseall_dms_msgbox_confirm_pre.value = false;

    eraseall_dms_show_connect();
    
}


async function do_eraseall_dms_final_no() {
    eraseall_dms_msgbox_confirm_final.value = false;

    if (webSerial.eraseall_status_dms.value > 0) {
        await webSerial.disconnect();
    }
}

async function do_eraseall_dms_final_yes() {
    eraseall_dms_msgbox_confirm_final.value = false;
    
    await webSerial.eraseall_dms_execute();
    
    while (webSerial.eraseall_status_dms.value < 2) {
        await sleep(100);
    }

    await sleep(100);
    eraseall_dms_msgbox_finished.value = true;


}

function updateTippy(target, show = false) {
    if (!target) {
        return;
    }
    nextTick(() => {
        if (target._tippy) {
            target._tippy.setContent(target.getAttribute('data-tippy-content'));
            if (show) {
                target._tippy.show();
            }
        } else {
            tippyConfig.theme = theme.value;
            tippy([target], tippyConfig);
        }
    });
}

function updateTippyTheme() {
    tippyInstances.forEach((instance) => instance.setProps({ theme: theme.value }));
}

function textSizePlus() {
    textSize.value += 4;
    if (textSize.value > 40) {
        textSize.value = 40;
    }
    editor.setOptions({ fontSize: textSize.value + 'px' });
}

function textSizeMinus() {
    textSize.value -= 4;
    if (textSize.value < 12) {
        textSize.value = 12;
    }
    editor.setOptions({ fontSize: textSize.value + 'px' });
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.dialog {
  width: auto;        
  max-width: 25vw;    
  min-width: 200px;
  display: inline-block;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  overflow: hidden;      
  font-family: Arial, sans-serif;
  background-color: white;  /* Add white background here */
}

.dialog-title {
  background-color: #d9534f;  /* green background */
  color: white;                /* white text */
  padding: 10px;
  font-weight: bold;
  font-size: 1.1em;
}

.dialog-title-success {
  background-color: #4CAF50;  /* green background */
  color: white;                /* white text */
  padding: 10px;
  font-weight: bold;
  font-size: 1.1em;
}

/* Remove bottom margin on dialog-body and buttons */
.dialog-body {
  background-color: white;
  color: black;
  padding: 15px;
  margin-bottom: 0;  /* prevent extra space */
}
.dialog-buttons {
  margin-top: 0;       /* remove top margin */
  padding: 10px 0 15px 0; /* keep vertical padding */
  display: flex;
  justify-content: center;
  gap: 20px;
  background-color: white;
}

/* Base button styles */
.dialog-buttons button {
  padding: 5px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
}

/* Hover effect for all buttons */
.dialog-buttons button:hover {
  filter: brightness(0.9);
}

/* Your specific button colors */
button.yes {
  background: #d9534f;
  color: white;
}

button.no {
  background: #ccc;
  color: black;
}

button.ok {
  background: #d9534f;
  color: white;
}
</style>
