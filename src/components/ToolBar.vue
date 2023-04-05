<template>
    <div class="h-full mx-2 flex items-center space-x-8">
        <Button
            class="btn-tool"
            data-tippy-content="Run"
            @click.native="$emit('run')"
        >
            <i class="fas fa-fw fa-play"></i>
        </Button>
    </div>
</template>

<script setup>
// Components

import Button from './Button.vue';

// Emits

const $emit = defineEmits(['configure', 'run', 'update:state', 'update:theme', 'updateTippy']);

// Props

const props = defineProps({
    theme: String,
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
