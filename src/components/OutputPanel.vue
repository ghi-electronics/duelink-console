<template>
    <Panel auto-scroll title="Output">
        <template #buttons>
            <Button :disabled="!output.length" data-tippy-content="Clear" @click.native.stop="$emit('update:output', [])">
                <i class="fas fa-fw fa-eraser"></i>
            </Button>
        </template>
        <div class="p-2 whitespace-pre-wrap">
            {{ finalOutput ? finalOutput : '&nbsp;' }}
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
    output: Array,
});

// Computed

const finalOutput = computed(() => props.output.filter((line) => line && ['\n', '$', '>', '&'].every((char) => !line.startsWith(char))).join('\n'));
</script>
