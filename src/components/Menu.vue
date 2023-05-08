<template>
    <div v-click-outside="() => open = false">
        <div
            :id="`menu-${id}-btn`"
            class="inline-flex rounded a"
            @click="open = !open"
        >
            <slot/>
        </div>
        <div
            v-bind="aria"
            v-show="open"
            :id="`menu-${id}`"
            class="min-w-[100px] border rounded shadow-lg z-10 bg-slate-50 border-slate-300 dark:bg-zinc-700 dark:border-zinc-600"
            role="menu"
        >
            <component
                v-for="option in options"
                :href="option?.href ? option.href : undefined"
                :is="option?.href ? 'a' : 'div'"
                :key="option.label"
                class="w-full px-4 py-1 text-slate-900 dark:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-600 cursor-pointer"
                @click.prevent="option.click(); open = false;"
            >
                {{ option.label }}
                <template v-if="option?.href">
                    <i class="ml-2 fas fa-fw fa-external-link"></i>
                </template>
            </component>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { createPopper } from '@popperjs/core';

// Props

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    options: {
        type: Array,
        required: true,
    },
});

// Setup

let popper = null;
let el = null;
let reference = null;

// Data

const open = ref(false);

// Computed

const aria = computed(() => ({
    'aria-orientation': props.id ? 'vertical' : false,
    'aria-labelledby': props.id ? `${props.id}-menu` : false,
}));

// Watch

watch(() => open.value, (newValue) => {
    nextTick(() => {
        if (newValue) {
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
        } else if (popper) {
            popper.destroy();
            popper = null;
        }
    });
});

// Mounted

onMounted(() => {
    el = document.getElementById(`menu-${props.id}`);
    reference = document.getElementById(`menu-${props.id}-btn`);
});
</script>
