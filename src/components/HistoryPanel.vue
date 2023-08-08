<template>
    <Panel auto-scroll title="History">
        <template #buttons>
            <Button :disabled="!history.length" data-tippy-content="Clear" @click.native.stop="$emit('update:history', [])">
                <i class="fas fa-fw fa-eraser"></i>
            </Button>
        </template>
        <div class="p-2 whitespace-pre-wrap text-sm">
            <template v-for="entry in history">
                <div v-if="entry?.error" v-html="entry.error" class="text-red-600 dark:text-red-400"></div>
                <template v-else-if="entry?.event">
                    <div class="flex space-x-2">
                        <div class="text-sky-600 dark:text-lime-200">[{{ entry.date.toLocaleTimeString() }}]</div>
                        <div v-html="entry.event" class="flex-1"></div>
                    </div>
                </template>
            </template>
        </div>
    </Panel>
</template>

<script setup>
// Components

import Panel from './Panel.vue';
import Button from './Button.vue';

// Props

defineProps({
    history: Array,
});
</script>
