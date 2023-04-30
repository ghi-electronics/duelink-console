<template>
    <div class="bg-slate-300 dark:bg-zinc-700">
        <div
            class="flex items-center px-4 py-2 cursor-pointer select-none transition duration-150 ease-in-out"
            @click="isOpen = !isOpen"
        >
            <div class="flex-1 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas" :class="isOpen ? 'fa-angle-down' : 'fa-angle-right'"></i>
                    <span>{{ title }}</span>
                </div>
                <slot name="buttons" />
            </div>
        </div>
        <div v-show="isOpen" class="bg-slate-100 border-b-8 border-slate-300 dark:bg-zinc-900 dark:border-zinc-700">
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
