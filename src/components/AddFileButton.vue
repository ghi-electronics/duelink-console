<template>
    <div>
        <Button
            :class="isOpen ? 'active' : ''"
            class="btn-pin"
            data-tippy-content="Add File"
            @click.native.stop="onClick"
        >
            <i class="fas fa-plus"></i>
        </Button>
        <div class="relative">
            <div v-if="isOpen" class="absolute top-1 right-0">
                <input :ref="(el) => $refs.input = el" type="text" class="px-2 py-1" placeholder="Name" @blur="isOpen = false" @keyup.enter="onEnter">
            </div>
        </div>
    </div>
</template>

<script setup>
import { nextTick, ref } from 'vue';

// Components

import Button from './Button.vue';

// Refs

const $refs = { input: null };

// Emits

const $emit = defineEmits(['add']);

// Data

const isOpen = ref(false);

// Methods

function onClick() {
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        nextTick(() => $refs.input.focus());
    }
}

function onEnter(event) {
    $emit('add', event.target.value);
    isOpen.value = false;
}
</script>
