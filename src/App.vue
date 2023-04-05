<template>
    <div id="menu-bar">
        <MenuBar/>
    </div>
    <div id="tool-bar">
        <ToolBar v-model:theme="theme" @run="run"/>
    </div>
    <div id="tab-bar">
        <TabBar v-model="activeTab" :tabs="tabs" @close="closeFile"/>
    </div>
    <div id="progress-bar"></div>
    <div id="editor">
        <div class="h-full flex flex-col">
            <v-ace-editor
                ref="editor"
                v-model:value="code"
                :lang="language"
                :theme="theme === 'dark' ? 'tomorrow_night_bright' : 'crimson_editor'"
                class="w-full flex-1"
                @init="onEditorInit"
            />
            <div class="w-full py-2 px-4 text-right text-geyser-1100 dark:text-bunker-300">
                {{ `Line ${editorLine}, Column ${editorColumn}` }}
            </div>
        </div>
    </div>
    <div id="side-panel">
        <div class="space-y-1">
            <PanelSerial :web-serial="webSerial" />
            <Panel title="Output">
                {{ output }}
            </Panel>
            <Panel title="Errors">
                <ul v-for="error in webSerial.errorLog" :key="error">
                    <li>{{ error }}</li>
                </ul>
            </Panel>
        </div>
    </div>
    <div id="footer">
        <Footer/>
    </div>
</template>

<script setup>
import { nextTick, reactive, ref } from 'vue';
import states from './js/states';
import tippy from 'tippy.js';

// Components

import MenuBar from './components/MenuBar.vue';
import ToolBar from './components/ToolBar.vue';
import TabBar from './components/TabBar.vue';
import Footer from './components/Footer.vue';
import Panel from './components/Panel.vue';
import PanelSerial from './components/PanelSerial.vue';
import { VAceEditor } from 'vue3-ace-editor';
import WebSerial from "./js/WebSerial";

// Expose

defineExpose({ run });

// Refs

const $refs = { explorerPanel: null };

// Data

const activeTab = ref(null);
const breakpointIcon = ref('fa-circle');
const code = ref('');
const editor = ref(null);
const editorLine = ref(1);
const editorColumn = ref(1);
const files = reactive([{ name: 'Program', content: '' }]);
const language = ref('javascript');
const output = ref('');
const removeIcon = reactive({});
const state = ref(states.idle);
const tabs = reactive([]);
const theme = ref(localStorage.theme ? localStorage.theme : 'light');
const tippyConfig = reactive({
    animation: 'fade',
    appendTo: document.body,
    interactive: true,
    placement: 'bottom',
    theme: 'due',
});
const webSerial = reactive(new WebSerial());

// Created

openFile('Program');

// Methods

async function run() {
    console.log('run');
    await webSerial.sendAndExpect('$', '$');
    const lines = code.value.replace("\r", '').split("\n");
    for (const line of lines) {
        await webSerial.sendAndExpect(line.trim() + "\n", '$');
    }
    await webSerial.sendAndExpect('run', '$');
}

function addFile(name) {
    if (! name.length) {
        alert('You cannot have a blank file name.');
        return;
    }
    const index = files.findIndex((file) => file.name.toUpperCase() === name.toUpperCase());
    if (index > -1) {
        alert(`A file named ${files[index].name} already exists.`);
        return;
    }
    files.push({ name: name, content: '' });
    $refs.explorerPanel.open();
}

function closeFile(name) {
    if (tabs.length === 1) {
        return;
    }
    const index = tabs.findIndex((tab) => tab === name);
    if (index > -1) {
        tabs.splice(index, 1);
        activeTab.value = tabs.length > 0 ? tabs[tabs.length - 1] : undefined;
    }
}

function editorSelection(line, column, length) {
    editor.value.selection.setRange(new window.ace.Range(line, column, line, column + length));
}

function determineBreakpointIcon() {
    if (editor.value) {
        const breakpoints = editor.value.session.getBreakpoints();
        if (typeof breakpoints[editorLine.value - 1] !== 'undefined') {
            breakpointIcon.value = 'fa-minus-circle';
            return;
        }
    }
    breakpointIcon.value = 'fa-plus-circle';
}

function hideRemove(name) {
    delete removeIcon[name];
}

function onEditorInit(editor) {
    editor.setOptions({
        fontSize: '16px'
    });
    editor.session.selection.on('changeCursor', () => {
        const pos = editor.getCursorPosition();
        editorLine.value = pos.row + 1;
        editorColumn.value = pos.column + 1;
        // determineBreakpointIcon();
    });
    editor.value = editor;
}

function openFile(name) {
    if (!tabs.find((tab) => tab === name)) {
        tabs.push(name);
    }
    activeTab.value = name;
}

function removeFile(name) {
    if (name !== 'Program') {
        const index = files.findIndex((file) => file.name === name);
        if (index > -1) {
            closeFile(name);
            files.splice(index, 1);
        }
    }
}

function showRemove(name) {
    if (name !== 'Program') {
        removeIcon[name] = true;
    }
}

function updateTippy(target) {
    if (! target) {
        return;
    }
    nextTick(() => {
        if (target._tippy) {
            target._tippy.setContent(target.getAttribute('data-tippy-content'));
        } else {
            tippy([target], tippyConfig);
        }
    });
}
</script>
