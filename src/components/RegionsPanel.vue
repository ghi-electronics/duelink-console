<template>
    <Panel title="Regions">
        <div class="p-2 whitespace-pre-wrap">
            <div v-if="regions.length" class="p-2 text-sm divide-y divide-slate-300 dark:divide-zinc-700">
                <div class="px-2 py-1 grid grid-cols-12 font-medium">
                    <div class="col-span-1"></div>
                    <div class="col-span-4">Region</div>
                    <div class="col-span-4 text-right">Used</div>
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
                    <div class="col-span-4">
                        {{ region?.index + ' - ' + (region?.index === 0 ? 'Driver' : 'User') }}
                    </div>
                    <div class="col-span-4 text-right">
                        {{ region?.used }}
                    </div>
                    <div class="col-span-3 text-right">
                        {{ region?.total }}
                    </div>
                </div>
            </div>
            <div v-if="regions.length" class="mt-2 px-4 flex space-x-4">
                <Button
                    :disabled="regions.length >= 2"
                    class="w-full"
                    data-tippy-content="Clear"
                    type="secondary"
                    @click.native.stop="$emit('region', 1)"
                >
                    Add Region
                </Button>
                <Button
                    :disabled="regions.every((region) => region.used === 0)"
                    class="w-full"
                    data-tippy-content="Clear"
                    type="secondary"
                    @click.native.stop="$emit('list-all')"
                >
                    List All
                </Button>
                <Button
                    :disabled="!regions.length || (regions.length === 1 && regions[0].index === 0 && regions[0].used === 0)"
                    class="w-full"
                    data-tippy-content="Clear"
                    type="secondary"
                    @click.native.stop="$emit('new-all')"
                >
                    Erase All
                </Button>
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
