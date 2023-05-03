<template>
    <div
        v-bind="aria"
        v-show="open"
        :id="`menu-${id}`"
        class="min-w-[100px] border rounded shadow-lg z-10
        bg-slate-50 border-slate-300
        dark:bg-zinc-700 dark:border-zinc-600"
        role="menu"
    >
        <slot/>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, watch } from 'vue';
import { createPopper } from '@popperjs/core';

// Props

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    menuClass: String, // Typically used to set width
    open: Boolean,
});

// Setup

let popper = null;
let el = null;
let reference = null;

// Computed

const aria = computed(() => ({
    'aria-orientation': props.id ? 'vertical' : false,
    'aria-labelledby': props.id ? `${props.id}-menu` : false,
}));

// Watch

watch(() => props.open, (newValue) => {
    nextTick(() => {
        if (newValue) {
            close();
            popper = createPopper(reference, el, {
                placement: 'bottom-start',
                modifiers: [
                    {
                        name: 'offset',
                        options: {
                            offset: [0, 4],
                        },
                    },
                    {
                        name: 'preventOverflow',
                        options: {
                            padding: 16,
                        },
                    },
                ],
                strategy: 'fixed',
            });
        }
    });
});

// Mounted

onMounted(() => {
    el = document.getElementById(`menu-${props.id}`);
    reference = document.getElementById(`menu-${props.id}-btn`);
});

// Methods

function close() {
    if (popper) {
        popper.destroy();
        popper = null;
    }
}
</script>
