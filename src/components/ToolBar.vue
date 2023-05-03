<template>
    <div class="h-full mx-2 flex items-center space-x-1">
        <Button
            id="plugBtn"
            :class="isConnected ? 'connected' : ''"
            :data-tippy-content="isConnected ? 'Disconnect' : 'Connect'"
            @click.native="onPlug"
        >
            <i class="fas fa-fw fa-plug"></i>
        </Button>
        <Button
            :disabled="disabled || !canRecord"
            class="record"
            data-tippy-content="Record"
            @click.native="$emit('record')"
        >
            <i class="fas fa-fw fa-circle"></i>
        </Button>
        <Button
            :disabled="disabled || !canPlay"
            class="play"
            data-tippy-content="Play"
            @click.native="$emit('play')"
        >
            <i class="fas fa-fw fa-play"></i>
        </Button>
        <Button
            :disabled="!isConnected || !disabled"
            class="stop"
            data-tippy-content="Stop"
            @click.native="$emit('stop')"
        >
            <i class="fas fa-fw fa-square"></i>
        </Button>
        <Button
            :disabled="disabled || !canList"
            data-tippy-content="List"
            @click.native="$emit('list')"
        >
            <i class="fas fa-fw fa-list"></i>
        </Button>
        <Button
            :disabled="!canDownload"
            data-tippy-content="Download"
            @click.native="$emit('download')"
        >
            <i class="fas fa-fw fa-download"></i>
        </Button>
        <Button
            :data-tippy-content="(theme === 'light' ? 'Dark' : 'Light') + ' Theme'"
            @click.native="toggleDarkMode"
        >
            <i :class="theme === 'dark' ? 'fa-sun' : 'fa-moon'" class="fas fa-fw"></i>
        </Button>
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
    'update:theme',
    'updateTippy'
]);

// Props

const props = defineProps({
    canDownload: Boolean,
    canList: Boolean,
    canPlay: Boolean,
    canRecord: Boolean,
    disabled: Boolean,
    isConnected: Boolean,
    theme: String,
});

// Methods

function onPlug(event) {
    if (props.isConnected) {
        $emit('disconnect');
    } else {
        $emit('connect');
    }
}

function toggleDarkMode(event) {
    if (props.theme === 'dark') {
        $emit('update:theme', 'light');
        localStorage.theme = 'light';
        document.documentElement.style.colorScheme = 'light';
        document.documentElement.classList.remove('dark');
    } else {
        $emit('update:theme', 'dark');
        localStorage.theme = 'dark';
        document.documentElement.style.colorScheme = 'dark';
        document.documentElement.classList.add('dark');
    }
    $emit('updateTippy', event.target, true);
}
</script>
