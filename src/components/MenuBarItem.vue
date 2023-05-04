<template>
    <div v-click-outside="() => isOpen = false">
        <div
            :id="`menu-${id}-btn`"
            class="inline-flex p-2 rounded a"
            @click="isOpen = !isOpen"
        >
            <slot/>
        </div>
        <MenuBarItemMenu :id="id" :open="isOpen">
            <slot v-bind="{ close }" name="menu" />
        </MenuBarItemMenu>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

// Components

import MenuBarItemMenu from './MenuBarItemMenu.vue';

// Props

const props = defineProps({
    id: String,
});

// Data

const isOpen = ref(false);

// Methods

function close() {
    isOpen.value = false;
}
</script>