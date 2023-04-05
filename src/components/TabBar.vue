<template>
    <div class="flex overflow-hidden">
        <div :ref="(el) => $refs.bar = el" class="flex-1 overflow-y-scroll scroller flex divide-x divide-geyser-900 dark:divide-bunker-500 md:border-r-4 md:border-geyser-50 md:dark:border-black">
            <div
                v-for="tab in tabs"
                :ref="(el) => $refs[tab] = el"
                :key="tab"
                :class="modelValue === tab ? 'bg-geyser-100 text-geyser-2100 dark:bg-bunker-600 dark:text-white' : 'hover:bg-geyser-200 text-geyser-1400 hover:text-geyser-2100 dark:hover:bg-bunker-700 dark:text-bunker-200 dark:hover:text-white'"
                class="py-2 px-4 inline-flex items-center space-x-2 max-w-xs select-none cursor-pointer transition duration-150 ease-in-out"
                @click.stop="$emit('update:modelValue', tab)"
            >
                <div class="truncate">{{ tab }}</div>
                <div
                    v-if="tabs.length > 1"
                    :class="modelValue === tab ? 'hover:bg-geyser-50 dark:hover:bg-bunker-500' : 'hover:bg-geyser-100 dark:hover:bg-bunker-600'"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full text-geyser-900 hover:text-geyser-2100 dark:text-bunker-300 dark:hover:text-white transition duration-150 ease-in-out"
                    @click.stop="$emit('close', tab)"
                >
                    <i class="fas fa-times"></i>
                </div>
            </div>
        </div>
        <div
            :class="isOverflowing ? '' : 'disabled'"
            class="btn btn-scroller"
            @mousedown="slideLeft"
            @mouseup="stopSlide"
            @mouseleave="stopSlide"
        >
            <i class="fas fa-angle-left"></i>
        </div>
        <div
            :class="isOverflowing ? '' : 'disabled'"
            class="btn btn-scroller"
            @mousedown="slideRight"
            @mouseup="stopSlide"
            @mouseleave="stopSlide"
        >
            <i class="fas fa-angle-right"></i>
        </div>
    </div>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref, watch } from 'vue';

// Emits

const $emit = defineEmits(['close', 'update:modelValue']);

// Refs

const $refs = reactive({ bar: null });

// Props

const props = defineProps({
    tabs: {
        type: Array,
        required: true,
    },
    modelValue: String,
});

// Data

const intervalId = ref(null);
const isOverflowing = ref(false);

// Watch

watch (() => props.tabs, () => {
    nextTick(() => checkOverflow());
}, { deep: true });

watch (() => props.modelValue, () => {
    nextTick(() => slideIntoView());
}, { deep: true });

// Mounted

onMounted(() => {
    window.addEventListener('resize', () => {
        nextTick(() => checkOverflow());
    });
});

// Methods

function checkOverflow() {
    const original = $refs.bar.scrollLeft++;
    isOverflowing.value = $refs.bar.scrollLeft-- > original;
}

function slideIntoView() {
    if (props.modelValue) {
        clearInterval(intervalId.value);
        checkOverflow();
        $refs[props.modelValue].scrollIntoView({ behavior: 'smooth' });
    }
}

function slideLeft() {
    clearInterval(intervalId.value);
    intervalId.value = setInterval(() => $refs.bar.scrollLeft -= 20, 20);
}

function slideRight() {
    clearInterval(intervalId.value);
    intervalId.value = setInterval(() => $refs.bar.scrollLeft += 20, 20);
}

function stopSlide() {
    clearInterval(intervalId.value);
}
</script>
