<template>
    <transition-group
        enter-active-class="transition ease-out duration-100"
        enter-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
        @after-leave="close"
    >
        <div
            v-show="open"
            :key="'menu'"
            class="origin-top-right absolute right-0 mt-2 shadow-lg bg-white ring-1 ring-black ring-opacity-5"
            :class="{ [menuClass]: true, 'divide-y divide-gray-100': dividers }"
            role="menu"
            v-bind="aria"
        >
            <slot/>
        </div>
    </transition-group>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { createPopper } from '@popperjs/core';

// Props

const props = defineProps({
    dividers: Boolean,
    id: {
        type: String,
        required: true,
    },
    menuClass: String, // Typically used to set width
    open: Boolean,
});

// Data

const element = ref(null);
const popper = ref(null);
const reference = ref(null);

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
            popper.value = createPopper(reference.value, element.value, {
                placement: 'bottom-start',
                modifiers: [
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
    element.value = document.getElementById(`menu-${props.id}`);
    reference.value = document.getElementById(`menu-${props.id}-btn`);
});

// Methods

function close() {
    if (popper.value) {
        popper.value.destroy();
        popper.value = null;
    }
}
</script>
