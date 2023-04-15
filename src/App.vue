<template>
    <div class="grid lg:grid-cols-2 gap-4 bg-gray-200">
        <div class="col-span-1 space-y-4">
            <div class="mb-4 flex items-center space-x-2">
                <button :disabled="webSerial.isConnected" @click="webSerial.connect">Connect</button>
                <div class="flex divide-x-2 divide-gray-200">
                    <button :disabled="disabled" @click="sendNew">New</button>
                    <button :disabled="disabled" @click="sendRecordMode">Send</button>
                    <button :disabled="disabled" @click="sendRun">Run</button>
                    <button :disabled="disabled" @click="sendList">List</button>
                </div>
                <button :disabled="!webSerial.isConnected || webSerial.isBusy" @click="sendEscape">Esc</button>
                <div class="px-2">{{ webSerial.version }}</div>
            </div>
            <div class="w-full" style="border: solid;">
                <div :ref="(el)=>$refs.progress=el"  style="width:0%; height:5px; background-color: blue;"/>
            </div>
            <v-ace-editor
                v-if="webSerial.isConnected"
                v-model:value="recordModeCode"
                :lang="language"
                class="w-full h-[480px]"
                ref="editor"
                @init="onEditorInit"
            />
            <div v-else class="bg-white w-full h-[480px]"></div>
            <div class="space-y-2">
                <div class="flex">
                    <div class="bg-gray-300 px-2.5 py-1">
                        {{ webSerial.mode }}
                    </div>
                    <input
                        :disabled="disabled"
                        :ref="(el) => $refs.input = el"
                        v-model="directModeCode"
                        type="text"
                        class="flex-1"
                        @keyup.enter="sendDirectMode"
                    >
                    <button :disabled="disabled" @click="sendDirectMode">Send</button>
                </div>
                <div v-if="lastCode" class="bg-white bg-opacity-50 px-2 py-1 font-mono whitespace-pre-wrap">
                    {{ lastCode }}
                </div>
            </div>
        </div>
        <div class="col-span-1 space-y-4">
            <div class="flex divide-x divide-blue-400">
                <button :disabled="disabled" @click="output = []">Clear Output</button>
            </div>
            <div :class="['w-full h-[480px] p-4 bg-black overflow-y-auto whitespace-pre-wrap text-white', !webSerial.isConnected ? 'opacity-40' : '']">
                <template v-if="output.length">
                    {{ output.join("\n") }}
                </template>
                <span v-else class="text-gray-500">
                    No output
                </span>
            </div>
            <div class="flex divide-x-2 divide-gray-200">
                <button :disabled="disabled" class="tester" @click="testPrint">Test Print</button>
                <button :disabled="disabled" class="tester" @click="testDigitalWrite">Test Digital Write</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';

// Components

import { VAceEditor } from 'vue3-ace-editor';
import WebSerial from "./js/WebSerial";

// Refs

const $refs = { input: null, progress: null };

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

// Computed

const disabled = computed(() => !webSerial.isConnected || webSerial.isBusy || webSerial.isTalking);

// Methods

async function sendRecordMode() {
    console.log('sendRecordMode');
    //await sendNew();
    //await webSerial.write('$');
    //const lines = recordModeCode.value.replace("\r", '').split("\n");
    //for (const line of lines) {
    //    await webSerial.write(line);
    //}

    const result = await webSerial.write('pgmstream()', '&');
    console.log(result);

    const lines = recordModeCode.value.replace(/\r/gm, '').replace(/\t/gm, ' ').split(/\n/);
    let lineNumber = 0;
    
    for (let line of lines) {
        if (line.trim().length===0) line=' ';
        let response = await webSerial.stream(line+'\n');
        if (response) {
            output.value.push(response);
            break;
        }
        $refs.progress.style.width = Math.trunc((++lineNumber/lines.length) * 100) + '%';
    }
    $refs.progress.style.width = '100%';
    await webSerial.stream('\0');
    await webSerial.readUntil()
    $refs.progress.style.width = '0%';
}

async function sendDirectMode() {
    console.log('sendDirectMode');
    const line = directModeCode.value.replace(/\t/gm, ' ');
    const result = await webSerial.write(line);
    output.value.push(...result);
    lastCode.value = directModeCode.value;
    directModeCode.value = '';
    $refs.input.focus();
}

async function sendNew() {
    console.log('sendNew');
    await webSerial.write('new');
    lastCode.value = '';
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
</script>
