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
            @erase_all="erase_all"
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
    
    <Modal :open="alreadyHasFWModal.open">
        <template #title>
            Heads up!
        </template>
        <div>Your device will be erased all</div>
        <div>Do you want to continue?</div>
        <template #buttons>
            <div class="flex space-x-2">
                <Button class="w-full" @click.native="alreadyHasFWModal.yes()">
                    Yes
                </Button>
                <Button class="w-full" type="secondary" @click.native="alreadyHasFWModal.no()">
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

const alreadyHasFWModal = reactive({
    open: false,
    target: null,
    async yes() {
        webSerial.erase_all()
        this.open = false;
        this.fixTippy();
    },
    async no() {

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

loadFirmware()
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

async function loadFirmware() {
    try {
        const response = await fetch('/legacy.json');
        const jsonData = await response.json();
        
        Object.keys(jsonData).forEach((key) => {
            availableFirmware[key] = jsonData[key];
            availableFirmware[key].isGlb = false;
            availableFirmware[key].image = null;
        });
    } catch (error) {
        console.log(error);
    }
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

async function erase_all() {
    console.log('erase_all');
    
    //alreadyHasFWModal.target = target;    
    alreadyHasFWModal.open = true;
    //webSerial.erase_all();

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
