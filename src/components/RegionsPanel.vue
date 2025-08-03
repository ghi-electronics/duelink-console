<template>
    <Panel title="Regions">
        <template #buttons>
            <Button :disabled="!regions.length" data-tippy-content="Clear" @click.native.stop="$emit('erase')">
                <i class="fas fa-fw fa-eraser"></i>
            </Button>
        </template>
        <div v-if="regions.length" class="p-2 whitespace-pre-wrap">
            <div class="p-2 text-sm divide-y divide-slate-300 dark:divide-zinc-700">
                <div class="px-2 py-1 grid grid-cols-12 font-medium">
                    <div class="col-span-1"></div>
                    <div class="col-span-3">Region</div>
                    <div class="col-span-5 text-right">Used</div>
                    <div class="col-span-3 text-right">Total</div>
                </div>
                <div
                    v-for="region in regions"
                    :class="region?.current ? 'font-medium bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900'"
                    class="px-2 py-1 grid grid-cols-12"
                    @click="region?.current ? undefined : $emit('region', region.index)"
                >
                    <div class="col-span-1">
                        <i v-if="region?.current" class="fas fa-fw fa-angle-right"></i>
                    </div>
                    <div class="col-span-3">
                        {{ region?.index || 0 }}
                    </div>
                    <div class="col-span-5 text-right">
                        {{ region?.used || 0 }}
                    </div>
                    <div class="col-span-3 text-right">
                        {{ region?.total || 0 }}
                    </div>
                </div>
            </div>
        </div>
    </Panel>
</template>

<script setup>
// Components

import Panel from './Panel.vue';
import Button from './Button.vue';

// Props

const props = defineProps({
    regions: {
        type: Array,
        default: () => [],
    },
});
</script>
