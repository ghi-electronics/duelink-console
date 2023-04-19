<template>
    <div class="h-full mx-2 flex items-center space-x-8">
        <Button
            :disabled="isConnected"
            data-tippy-content="Connect"
            @click.native="$emit('connect')"
        >
            <i class="fas fa-fw fa-play"></i>
        </Button>
        <Button
            :disabled="disabled"
            data-tippy-content="Run"
            @click.native="$emit('run')"
        >
            <i class="fas fa-fw fa-play"></i>
        </Button>
        <Button
            :data-tippy-content="theme[0].toUpperCase() + theme.substring(1).toLowerCase()"
            @click.native="toggleDarkMode"
        >
            <i :class="theme === 'dark' ? 'fas' : 'far'" class="fa-fw fa-moon"></i>
        </Button>
    </div>
</template>

<script setup>
// Components

import Button from './Button.vue';

// Emits

const $emit = defineEmits(['connect', 'run', 'update:theme', 'updateTippy']);

// Props

const props = defineProps({
    disabled: Boolean,
    theme: String,
    isConnected: Boolean,
});

// Methods

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
    $emit('updateTippy', event.target);
}
</script>
