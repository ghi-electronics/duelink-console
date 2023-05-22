<template>
    <div id="tool-bar" class="p-2 flex items-center space-x-2">
        <Button
            id="plugBtn"
            :class="['tool', isConnected ? 'connected' : '']"
            :data-tippy-content="isConnected ? 'Disconnect' : 'Connect'"
            @click.native="onPlug"
        >
            <i :class="isConnected ? 'fa-plug-circle-xmark' : 'fa-plug'" class="fas fa-fw"></i>
        </Button>
        <Button
            :disabled="disabled || !canRecord"
            class="tool record"
            data-tippy-content="Record"
            @click.native="$emit('record')"
        >
            <i class="fas fa-fw fa-circle"></i>
        </Button>
        <Button
            :disabled="disabled || !canPlay"
            class="tool play"
            data-tippy-content="Play"
            @click.native="$emit('play')"
        >
            <i class="fas fa-fw fa-play"></i>
        </Button>
        {{ !isConnected }} / {{ !disabled }}
        <Button
            class="tool stop"
            data-tippy-content="Stop"
            @click.native="$emit('stop')"
        >
            <i class="fas fa-fw fa-square"></i>
        </Button>
        <Button
            :disabled="disabled || !canList"
            class="tool"
            data-tippy-content="List"
            @click.native="$emit('list', $event.target)"
        >
            <i class="fas fa-fw fa-list"></i>
        </Button>
        <Button
            :disabled="!canDownload"
            class="tool"
            data-tippy-content="Download"
            @click.native="$emit('download')"
        >
            <i class="fas fa-fw fa-download"></i>
        </Button>
        <label
            class="btn primary tool text-center cursor-pointer"
            data-tippy-content="Load"
            for="file"
        >
            <i class="fas fa-fw fa-upload"></i>
            <input id="file" type="file" class="hidden" @change="onLoad" />
        </label>
    </div>
</template>

<script setup>
// Components

import Button from './Button.vue';

// Emits

const $emit = defineEmits([
    'connect',
    'disconnect',
    'download',
    'play',
    'stop',
    'record',
    'list',
    'load',
]);

// Props

const props = defineProps({
    canDownload: Boolean,
    canList: Boolean,
    canLoad: Boolean,
    canPlay: Boolean,
    canRecord: Boolean,
    disabled: Boolean,
    isConnected: Boolean,
});

// Methods

function onLoad(event) {
    if (!event.target.files.length) {
        return;
    }
    const fr = new FileReader();
    fr.onload = function () {
        $emit('load', fr.result.replace(/\r/gm, '').replace(/\t/gm, ' ').split('\n'));
        event.target.value = '';
    }
    fr.readAsText(event.target.files[0]);
}

function onPlug() {
    if (props.isConnected) {
        $emit('disconnect');
    } else {
        $emit('connect');
    }
}
</script>
