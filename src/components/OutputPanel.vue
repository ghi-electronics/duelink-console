<template>
    <Panel auto-scroll title="Output">
        <template #buttons>
            <Button :disabled="!output.length" data-tippy-content="Clear" @click.native.stop="$emit('update:output', '')">
                <i class="fas fa-fw fa-eraser"></i>
            </Button>
        </template>
        <div class="p-2 whitespace-pre-wrap">
            {{ finalOutput }}
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
    output: String,
});

// Computed

const finalOutput = computed(() => {
    return props.output
        .split('\n')
        .map((line) => {
            if (line.startsWith('$') || line.startsWith('>') || line.startsWith('&')) {
                return line.substring(1);
            }
            return line;
        })
        .filter((line) => line)
        .join('\n')
});
</script>
