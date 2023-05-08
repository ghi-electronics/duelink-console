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
            @update:theme="updateTippyTheme"
            @updateTippy="updateTippy"
        />
        <ToolBar
            :can-download="recordModeCode.length > 0"
            :can-list="true"
            :can-load="true"
            :can-play="recordModeCode !== '' && recordModeCode === lastRecordModeCode"
            :can-record="recordModeCode.length > 0 && recordModeCode !== lastRecordModeCode"
            :disabled="disabled"
            :is-connected="webSerial.isConnected"
            @connect="webSerial.connect()"
            @disconnect="webSerial.disconnect()"
            @download="download"
            @play="sendRun"
            @stop="sendEscape"
            @record="sendRecordMode"
            @list="sendList"
            @load="onLoad"
        />
        <div class="flex-1 flex flex-col space-y-0.5 sm:space-y-0 sm:flex-row sm:space-x-0.5">
            <div id="editor" class="flex-1 p-2 flex flex-col">
                <v-ace-editor
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
                                @click="directModeCode = ''; $refs.input.$el.focus();"
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
                            <Input
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
                <Panel title="Output">
                    <template #buttons>
                        <Button :disabled="!output.length" data-tippy-content="Clear" @click.native.stop="output = []">
                            <i class="fas fa-fw fa-eraser"></i>
                        </Button>
                    </template>
                    <div class="p-2 whitespace-pre-wrap">
                        {{ output ? output : '&nbsp;' }}
                    </div>
                </Panel>
                <Panel title="About">
                    <div class="p-2 text-sm divide-y divide-slate-300 dark:divide-zinc-700">
                        <div class="px-2 py-1 flex justify-between">
                            <div>Console</div>
                            <div>
                                v1.0.0
                            </div>
                        </div>
                        <div class="px-2 py-1 flex justify-between">
                            <div>Latest firmware</div>
                            <div>
                                {{ latestFirmwareVersion ? latestFirmwareVersion : '...'  }}
                            </div>
                        </div>
                        <div class="px-2 py-1 flex justify-between">
                            <div>Device firmware</div>
                            <div>
                                {{ webSerial.version ? webSerial.version : '...'  }}
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
        <div id="spacer"></div>
        <Footer />
    </div>
    
    <Modal :open="alreadyHasCodeModal.open">
        <template #title>
            Heads up!
        </template>
        You already have code in the editor. Do you want to replace it?
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
    
    <FirmwareModal
        :available-firmware="availableFirmware"
        :open="firmwareModal.open"
        @close="firmwareModal.open = false"
    />
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import tippy from 'tippy.js';
import firmware from './js/firmware.js';

// Components

import { VAceEditor } from 'vue3-ace-editor';
import WebSerial from './js/WebSerial';
import MenuBar from './components/MenuBar.vue';
import ToolBar from './components/ToolBar.vue';
import Panel from './components/Panel.vue';
import Footer from './components/Footer.vue';
import Button from './components/Button.vue';
import Modal from './components/Modal.vue';
import FirmwareModal from './components/FirmwareModal.vue';
import Input from './components/Input.vue';

// Refs

const $refs = { editor: null, input: null, progress: null };

// Data

const availableFirmware = reactive(firmware);
const recordModeCode = ref('');
const directModeCode = ref('');
const lastRecordModeCode = ref('');
const editorLine = ref(1);
const editorColumn = ref(1);
const language = ref('javascript');
const webSerial = reactive(new WebSerial());
const theme = ref('light');
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
            this.lines = await webSerial.write('list');
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
            await webSerial.write('list');
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
    start() {
        if (webSerial.isConnected) {
            webSerial.disconnect();
        }
        this.open = true;
    },
});

let editor = null;
let tippyInstances = [];

// Computed

const disabled = computed(() => !webSerial.isConnected || webSerial.isBusy || webSerial.isTalking);

const latestFirmwareVersion = computed(() => {
    if (webSerial.version) {
        const lastChar = webSerial.version.substring(webSerial.version.length - 1, webSerial.version.length);
        const firmware = Object.values(availableFirmware).find((firmware) => firmware.boards.includes(lastChar));
        if (firmware) {
            return firmware.title;
        }
    }
    return null;
});

const output = computed({
    get() {
        return webSerial.output
            .filter((line) => line && ['\n', '$', '>', '&'].every((char) => !line.startsWith(char)))
            .join('\n');
    },
    set(value) {
        webSerial.output = value;
    },
});

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

// Mounted

onMounted(() => {
    tippyInstances = tippy('[data-tippy-content]', tippyConfig);
    
    window.onbeforeunload = function() {
        if (recordModeCode.value) {
            return false;
        }
    }
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

function download() {
    if (!recordModeCode.value.length) {
        return;
    }
    const blob = new Blob([recordModeCode.value], { type: 'text/csv' });
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = 'due-code.txt';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
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
    
    $refs.progress.style.width = '0';
    $refs.progress.classList.remove('opacity-0');

    const result = await webSerial.write('pgmstream()', '&');
    console.log(result);

    const lines = recordModeCode.value.replace(/\r/gm, '').replace(/\t/gm, ' ').split(/\n/);
    let lineNumber = 0;
    
    for (let line of lines) {
        if (line.trim().length === 0) {
            line = ' ';
        }
        await webSerial.stream(line + '\n');
        $refs.progress.style.width = Math.trunc((++lineNumber/lines.length) * 100) + '%';
    }
    
    $refs.progress.style.width = '100%';
    await webSerial.stream('\0');
    await webSerial.readUntil();
    $refs.progress.classList.add('opacity-0');
}

async function sendDirectMode() {
    console.log('sendDirectMode');
    await webSerial.write('>');
    const line = directModeCode.value.replace(/\t/gm, ' ');
    webSerial.output.push(line);
    await webSerial.write(line);
}

async function sendRun() {
    console.log('sendRun');
    await webSerial.write('run');
}

async function sendList(target) {
    console.log('sendList');
    if (recordModeCode.value) {
        alreadyHasCodeModal.target = target;
        alreadyHasCodeModal.list = true;
        alreadyHasCodeModal.open = true;
    } else {
        const result = await webSerial.write('list');
        const code = result.join('\n');
        if (recordModeCode.value !== code) {
            recordModeCode.value = code;
            lastRecordModeCode.value = code;
        }
    }
}

async function sendEscape() {
    console.log('sendEscape');
    await webSerial.escape();
}

function onEditorInit(instance) {
    instance.setShowPrintMargin(false);
    instance.setOptions({
        fontSize: '16px'
    });
    instance.session.selection.on('changeCursor', () => {
        const pos = instance.getCursorPosition();
        editorLine.value = pos.row + 1;
        editorColumn.value = pos.column + 1;
    });
    editor = instance;
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
</script>
