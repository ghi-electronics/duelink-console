<template>
    <div
        v-click-outside="() => isOpen = false"
        :id="`menu-${id}-btn`"
        class="inline-flex p-2 rounded a"
        @click="isOpen = !isOpen"
    >
        <slot/>
    </div>
    <MenuBarItemMenu :id="id" :open="isOpen">
        <slot name="menu" />
    </MenuBarItemMenu>
</template>

<script setup>
import { ref } from 'vue';

// Components

import MenuBarItemMenu from './MenuBarItemMenu.vue';

// Props

defineProps({
    id: String,
});

// Data

const isOpen = ref(false);
</script>