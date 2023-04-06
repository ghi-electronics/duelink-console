<template>
    <div class="mb-4">
        <button @click="webSerial.connect">Connect</button>
    </div>
    <div class="grid grid-cols-2 gap-4 bg-gray-200">
        <div class="col-span-1 space-y-4">
            <v-ace-editor
                v-if="webSerial.isConnected"
                v-model:value="recordingModeCode"
                :lang="language"
                class="w-full h-[600px]"
                :disabled="!webSerial.isConnected"
                ref="editor"
                @init="onEditorInit"
            />
            <div v-else class="bg-white w-full h-[600px]"></div>
            <div class="flex divide-x divide-gray-400">
                <button :disabled="!webSerial.isConnected" @click="sendRecordingMode">Send</button>
                <button :disabled="!webSerial.isConnected" @click="list">List</button>
                <button :disabled="!webSerial.isConnected" @click="_new">New</button>
            </div>
        </div>
        <div class="col-span-1 space-y-4">
            <div :class="['w-full h-[600px] p-4 bg-black overflow-y-auto whitespace-pre-wrap text-white', !webSerial.isConnected ? 'opacity-40' : '']">
                {{ webSerial.output.join("\n") }}
            </div>
            <div class="flex divide-x divide-gray-400">
                <button :disabled="!webSerial.isConnected" @click="webSerial.output.length = 0">Clear</button>
            </div>
        </div>
        <div class="col-span-1">
            <div class="flex">
                <input :disabled="!webSerial.isConnected" v-model="immediateModeCode" type="text" class="flex-1">
                <button :disabled="!webSerial.isConnected" @click="sendImmediateMode">Send</button>
            </div>
            <hr class="my-2 h-px bg-gray-400 text-gray-400">
            <div class="mt-4 flex divide-x divide-gray-400">
                <button :disabled="!webSerial.isConnected" @click="testPrint">Test Print</button>
                <button :disabled="!webSerial.isConnected" @click="testDigitalWrite">Test Digital Write</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref } from 'vue';

// Components

import { VAceEditor } from 'vue3-ace-editor';
import WebSerial from "./js/WebSerial";

// Data

const recordingModeCode = ref('');
const immediateModeCode = ref('');
const editor = ref(null);
const editorLine = ref(1);
const editorColumn = ref(1);
const language = ref('javascript');
const webSerial = reactive(new WebSerial());
const echo = ref(true);

// Methods

async function sendRecordingMode() {
    console.log('Send recording mode code');
    await webSerial.send('$');
    const lines = recordingModeCode.value.replace("\r", '').split("\n");
    for (const line of lines) {
        await webSerial.send(line);
    }
    await webSerial.send('run');
}

async function sendImmediateMode() {
    console.log('Send immediate mode code');
    //await webSerial.send('>');
    await webSerial.send(immediateModeCode.value);
}

async function list() {
    console.log('Send list');
    await webSerial.send('list');
}

async function _new() {
    console.log('Send new');
    await webSerial.send('new');
}

async function testPrint() {
    await webSerial.send('print("Hello World")');
}

async function testDigitalWrite() {
    const lines = ['for x = 1 to 10', 'DWrite(100,1)', 'Wait(200)', 'DWrite(100,0)', 'Wait(200)', 'next'];
    await webSerial.send('$');
    for (const line of lines) {
        await webSerial.send(line);
    }
    await webSerial.send('run');
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
