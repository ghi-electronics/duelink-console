<template>
    <div id="menu-bar">
        <MenuBar/>
    </div>
    <div id="tool-bar">
        <ToolBar
            v-model:theme="theme"
            :disabled="disabled"
            :is-connected="webSerial.isConnected"
            @connect="webSerial.connect()"
            @run="sendRun"
            @updateTippy="updateTippy"
        />
    </div>
    <div id="tab-bar"></div>
    <div id="progress-bar"></div>
    <div id="editor">
        <div class="h-full flex flex-col">
            <v-ace-editor
                v-if="webSerial.isConnected"
                v-model:value="recordModeCode"
                :lang="language"
                :theme="theme === 'dark' ? 'tomorrow_night_bright' : 'crimson_editor'"
                class="w-full flex-1"
                ref="editor"
                @init="onEditorInit"
            />
            <div class="w-full py-2 px-4 text-right text-geyser-1100 dark:text-bunker-300">
                {{ `Line ${editorLine}, Column ${editorColumn}` }}
            </div>
        </div>
    </div>
    <div id="side-panel">
        <div class="space-y-1"></div>
    </div>
    <div id="footer">
        <Footer/>
    </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';

// Components

import { VAceEditor } from 'vue3-ace-editor';
import WebSerial from "./js/WebSerial";
import MenuBar from "./components/MenuBar.vue";
import ToolBar from "./components/ToolBar.vue";
import Footer from "./components/Footer.vue";

// Refs

const $refs = { input: null };

// Data

const recordModeCode = ref('');
const directModeCode = ref('');
const editor = ref(null);
const editorLine = ref(1);
const editorColumn = ref(1);
const language = ref('javascript');
const webSerial = reactive(new WebSerial());
const output = ref([]);
const lastCode = ref(null);
const theme = ref('light');

let prevProgram = '';


// Computed

const disabled = computed(() => !webSerial.isConnected || webSerial.isBusy || webSerial.isTalking);

// Methods

async function sendRecordMode() {
    console.log('sendRecordMode');
    await sendNew();
    await webSerial.write('$');
    const lines = recordModeCode.value.replace("\r", '').split("\n");
    for (const line of lines) {
        await webSerial.write(line);
    }
}

async function sendDirectMode() {
    console.log('sendDirectMode');
    const result = await webSerial.write(directModeCode.value);
    output.value.push(...result);
    lastCode.value = directModeCode.value;
    directModeCode.value = '';
    $refs.input.focus();
}

async function sendNew() {
    console.log('sendNew');
    await webSerial.write('new');
    prevProgram = '';
    lastCode.value = '';
    output.value = [];
}

async function sendRun() {
    if (recordModeCode.value !== prevProgram) {
        console.log('code changed');
        await sendRecordMode();
    }
    prevProgram = recordModeCode.value;
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

function onEditorInit(editor) {
    editor.setOptions({
        fontSize: '16px'
    });
    editor.session.selection.on('changeCursor', () => {
        const pos = editor.getCursorPosition();
        editorLine.value = pos.row + 1;
        editorColumn.value = pos.column + 1;
    });
    editor.value = editor;
}

function updateTippy() {}
</script>
