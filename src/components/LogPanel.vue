<template>
    <Panel auto-scroll title="Log">
        <template #buttons>
            <Button :disabled="!logs.length" data-tippy-content="Clear" @click.native.stop="$emit('update:logs', [])">
                <i class="fas fa-fw fa-eraser"></i>
            </Button>
        </template>
        <div class="p-2 whitespace-pre-wrap">
            <template v-for="log in logs">
                <div v-if="log?.error" class="text-red-600 dark:text-red-400">
                    {{ log.error }}
                </div>
                <div v-else-if="log?.event" class="text-green-700 dark:text-green-400">
                    {{ log.event }}
                </div>
            </template>
        </div>
    </Panel>
</template>

<script setup>
// Components

import Panel from './Panel.vue';
import Button from './Button.vue';

// Props

const props = defineProps({
    logs: Array,
});
</script>
