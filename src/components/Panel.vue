<template>
    <div>
        <div
            class="panel-bar flex items-center px-4 py-2 cursor-pointer select-none transition duration-150 ease-in-out"
            @click="isOpen = !isOpen"
        >
            <div class="flex-1 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-fw" :class="isOpen ? 'fa-angle-down' : 'fa-angle-right'"></i>
                    <span>{{ title }}</span>
                </div>
                <slot name="buttons" />
            </div>
        </div>
        <div
            v-show="isOpen"
            class="panel-content max-h-[600px] overflow-y-auto"
        >
            <slot/>
        </div>
    </div>
</template>

<script setup>
import {nextTick, onMounted, onUnmounted, ref} from 'vue';

// Expose

defineExpose({ open });

// Refs

// const $refs = { slot: null };

// Props

defineProps({
    title: String,
});

// Setup

// let observer = null;

// Data

const isOpen = ref(true);

// Mounted

// onMounted(() => {
//     nextTick(() => {
//         if ($refs.slot) {
//             observer = new MutationObserver(() => $refs.slot.scrollTop = $refs.slot.scrollHeight);
//             observer.observe($refs.slot, {
//                 attributes: false,
//                 childList: true,
//                 characterData: true,
//                 subtree: true,
//             });
//         }
//     });
// });

// Unmounted

// onUnmounted(() => observer.disconnect());

// Methods

function open() {
    isOpen.value = true;
}
</script>
