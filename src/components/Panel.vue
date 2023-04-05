<template>
    <div class="bg-geyser-200 dark:bg-bunker-700">
        <div
            :class="isOpen ?
            'text-geyser-2100 dark:text-white' :
            'text-geyser-1400 hover:text-geyser-2100 dark:text-bunker-100 dark:hover:text-white'"
            class="flex items-center bg-geyser-300 dark:bg-bunker-800 p-2 select-none font-semibold transition duration-150 ease-in-out"
        >
            <div class="flex-1">
                <div class="btn btn-pin mr-2" @click="isOpen = !isOpen">
                    <i class="fas" :class="isOpen ? 'fa-angle-down' : 'fa-angle-right'"></i>
                </div>
                <span class="cursor-pointer" @click="isOpen = !isOpen">{{ title }}</span>
            </div>
            <slot name="button"></slot>
        </div>
        <div v-show="isOpen" class="p-4">
            <slot/>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

// Expose

defineExpose({ open });

// Props

defineProps({
    title: String,
});

// Data

const isOpen = ref(true);

// Methods

function open() {
    isOpen.value = true;
}
</script>
