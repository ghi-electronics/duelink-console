<template>
    <div id="menu-bar">
        <MenuBar/>
    </div>
    <div id="tool-bar">
        <ToolBar
            v-model:theme="theme"
            :disabled="disabled"
            :has-code="recordModeCode.length > 0"
            :is-connected="webSerial.isConnected"
            @connect="webSerial.connect()"
            @disconnect="webSerial.disconnect()"
            @download="download"
            @play="sendRun"
            @stop="sendEscape"
            @record="sendRecordModeOld"
            @list="sendList"
            @update:theme="updateTippyTheme"
            @updateTippy="updateTippy"
        />
    </div>
    <div id="tab-bar"></div>
    <div id="progress-bar">
        <div
            class="h-full bg-sky-400 dark:bg-lime-400 transition-all duration-150 ease-linear opacity-0"
        ></div>
    </div>
    <div id="editor">
        <div class="h-full flex flex-col">
            <v-ace-editor
                v-model:value="recordModeCode"
                :lang="language"
                :theme="theme === 'dark' ? 'tomorrow_night_bright' : 'crimson_editor'"
                class="w-full flex-1"
                ref="editor"
                @init="onEditorInit"
            />
            <div class="px-4 py-2 pl-[42px]">
                <div id="info-bar">
                    <div v-if="webSerial.version">
                        {{ webSerial.version }}
                    </div>
                    <div>
                        {{ `Line ${editorLine}, Column ${editorColumn}` }}
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="direct-panel">
        <input
            v-model="directModeCode"
            class="w-full xl:w-1/2"
            placeholder="Code to execute immediately..."
            type="text"
            @keyup.enter="sendDirectMode"
        />
        <Button
            :disabled="disabled"
            data-tippy-content="Execute"
            @click.native="sendDirectMode"
        >
            <i class="fas fa-fw fa-arrow-right"></i>
        </Button>
    </div>
    <div id="side-panel" class="space-y-2">
        <Panel title="Output">
            <template #buttons>
                <Button :disabled="!output.length" @click.native.stop="output = []">
                    <i class="fas fa-fw fa-ban"></i>
                </Button>
            </template>
            <div class="p-2 whitespace-pre-wrap">
                <template v-if="!output.length">
                    ...
                </template>
                <template v-else>
                    {{ output.join("\n") }}
                </template>
            </div>
        </Panel>
    </div>
    <div id="footer">
        <Footer/>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import tippy from 'tippy.js';

// Components

import { VAceEditor } from 'vue3-ace-editor';
import WebSerial from "./js/WebSerial";
import MenuBar from "./components/MenuBar.vue";
import ToolBar from "./components/ToolBar.vue";
import Panel from "./components/Panel.vue";
import Footer from "./components/Footer.vue";
import Button from "./components/Button.vue";

// Refs

// const $refs = { input: null, progress: null };

// Data

const recordModeCode = ref('');
const directModeCode = ref('');
const editorLine = ref(1);
const editorColumn = ref(1);
const language = ref('javascript');
const webSerial = reactive(new WebSerial());
const output = ref([]);
const theme = ref('light');

const tippyConfig = {
    animation: 'fade',
    appendTo: document.body,
    interactive: true,
    placement: 'bottom',
    theme: 'light',
};

let editor = null;
let tippyInstances = [];

// Watch

watch(() => webSerial.isConnected, () => {
    const el = document.getElementById('plugBtn');
    if (el) {
        updateTippy(el);
    }
});

// Created

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    theme.value = 'dark';
    tippyConfig.theme = 'dark';
}

// Mounted

onMounted(() => tippyInstances = tippy('[data-tippy-content]', tippyConfig));

// Computed

const disabled = computed(() => !webSerial.isConnected || webSerial.isBusy || webSerial.isTalking);

// Methods

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

async function sendRecordModeOld() {
    console.log('sendRecordModeOld');
    // $refs.progress.style.width = '0';
    // $refs.progress.classList.remove('opacity-0');
    await sendNew();
    await webSerial.write('$');
    const lines = recordModeCode.value.replace("\r", '').split("\n");
    for (let i = 0; i < lines.length; i++) {
        await webSerial.write(lines[i]);
        // $refs.progress.style.width = Math.trunc((i/lines.length) * 100) + '%';
    }
    // $refs.progress.style.width = '100%';
    // setTimeout(() => $refs.progress.classList.add('opacity-0'), 500);
}

async function sendRecordMode() {
    console.log('sendRecordMode');
    // $refs.progress.style.width = '0';
    // $refs.progress.classList.remove('opacity-0');

    const result = await webSerial.write('pgmstream()', '&');
    console.log(result);

    const lines = recordModeCode.value.replace(/\r/gm, '').replace(/\t/gm, ' ').split(/\n/);
    let lineNumber = 0;
    
    for (let line of lines) {
        if (line.trim().length === 0) {
            line = ' ';
        }
        let response = await webSerial.stream(line + '\n');
        if (response) {
            output.value.push(response);
            break;
        }
        // $refs.progress.style.width = Math.trunc((++lineNumber/lines.length) * 100) + '%';
    }
    
    // $refs.progress.style.width = '100%';
    await webSerial.stream('\0');
    await webSerial.readUntil();
    // $refs.progress.classList.add('opacity-0');
}

async function sendDirectMode() {
    console.log('sendDirectMode');
    await webSerial.write('>');
    const line = directModeCode.value.replace(/\t/gm, ' ');
    const result = await webSerial.write(line);
    output.value.push(...result);
    directModeCode.value = '';
    // $refs.input.focus();
}

async function sendNew() {
    console.log('sendNew');
    await webSerial.write('new');
    output.value = [];
}

async function sendRun() {
    console.log('sendRun');
    const result = await webSerial.write('run');
    output.value.push(...result);
}

async function sendList() {
    console.log('sendList');
    const result = await webSerial.write('list');
    output.value.push(...result);
}

async function testPrint() {
    console.log('testPrint');
    await webSerial.write('>');
    const result = await webSerial.write('print("Hello World")');
    output.value.push(...result);
}

async function testDigitalWrite() {
    console.log('testDigitalWrite');
    const lines = ['for x = 1 to 10', 'DWrite(100,1)', 'Wait(200)', 'DWrite(100,0)', 'Wait(200)', 'next'];
    await webSerial.write('$');
    for (const line of lines) {
        await webSerial.write(line);
    }
    await webSerial.write('run');
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
