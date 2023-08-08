<template>
    <Panel auto-scroll title="Log">
        <template #buttons>
            <Button :disabled="!finalLog.length" data-tippy-content="Clear" @click.native.stop="$emit('update:log', '')">
                <i class="fas fa-fw fa-eraser"></i>
            </Button>
        </template>
        <div class="p-2 whitespace-pre-wrap">
            {{ finalLog }}
        </div>
    </Panel>
</template>

<script setup>
import { computed } from 'vue';

// Components

import Panel from './Panel.vue';
import Button from './Button.vue';

// Props

const props = defineProps({
    log: String,
});

// Computed

const finalLog = computed(() => {
    return props.log
        .split('\n')
        .map((line) => {
            while (line && (line.startsWith('$') || line.startsWith('>') || line.startsWith('&'))) {
                line = line.substring(1);
            }
            return line;
        })
        .filter((line) => line)
        .join('\n')
});
</script>
