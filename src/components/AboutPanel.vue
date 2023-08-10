<template>
    <Panel title="About">
        <div class="p-2 text-sm divide-y divide-slate-300 dark:divide-zinc-700">
            <div class="px-2 py-1 flex justify-between">
                <div class="font-medium">Console</div>
                <div>
                    v{{ appVersion }}
                </div>
            </div>
            <div class="px-2 py-1 flex justify-between">
                <div class="font-medium">Device</div>
                <div>
                    {{ device ? device : '...'  }}
                </div>
            </div>
            <div class="px-2 py-1 flex justify-between">
                <div class="font-medium">Device firmware</div>
                <div>
                    {{ deviceFirmwareVersion ? deviceFirmwareVersion : '...'  }}
                </div>
            </div>
            <div class="px-2 py-1 flex justify-between">
                <div class="font-medium">Latest firmware</div>
                <div>
                    {{ latestFirmwareVersion ? latestFirmwareVersion : '...'  }}
                </div>
            </div>
        </div>
    </Panel>
    <div
        v-if="deviceFirmwareVersion !== null && latestFirmwareVersion !== null && deviceFirmwareVersion !== latestFirmwareVersion"
        class="px-4 py-2 font-medium bg-yellow-200 dark:text-zinc-900"
    >
        <i class="fas fa-fw fa-triangle-exclamation mr-1"></i> Please update to the latest firmware.
    </div>
    <div class="flex justify-end px-4">
        <a
            class="mt-4 inline-block w-full sm:w-auto text-center sm:text-left px-4 py-2 font-medium rounded transition bg-slate-300 hover:bg-slate-500 text-slate-600 hover:text-slate-50 dark:bg-zinc-600 dark:hover:bg-zinc-300 dark:text-zinc-100 dark:hover:text-zinc-950"
            href="https://github.com/ghi-electronics/due-console/issues/"
            target="_blank"
        >
            <i class="fas fa-fw fa-arrow-up-right-from-square mr-1"></i> Report Issue
        </a>
    </div>
</template>

<script setup>
import { computed } from 'vue';

// Components

import Panel from './Panel.vue';

// Props

const props = defineProps({
    availableFirmware: Object,
    version: String,
});

// Setup

const appVersion = APP_VERSION;

// Computed

const deviceChar = computed(() => {
    if (props.version) {
        return props.version.substring(props.version.length - 1, props.version.length);
    }
    return null;
});

const deviceVersion = computed(() => {
    if (props.version) {
        return props.version.substring(0, props.version.length - 1);
    }
    return null;
});

const firmware = computed(() => Object.values(props.availableFirmware).find((firmware) => (firmware?.boards || []).find((board) => board.id === deviceChar.value)));

const device = computed(() => {
    if (firmware.value) {
        const board = firmware.value.boards.find((board) => board.id === deviceChar.value);
        if (board) {
            return board.name;
        }
    }
    return null;
});

const deviceFirmwareVersion = computed(() => {
    if (firmware.value && deviceVersion.value) {
        return `${deviceVersion.value}`;
        // return `${firmware.value.name} ${deviceVersion.value}`;
    }
    return null;
});

const latestFirmwareVersion = computed(() => {
    if (Object.values(props.availableFirmware).length) {
        const key = Object.keys(props.availableFirmware)[0];
        const maxId = Math.max(...props.availableFirmware[key].versions.map((version) => version.id));
        const version = props.availableFirmware[key].versions.find((version) => version.id === maxId);
        return `${version.name}`;
    }
    // if (firmware.value) {
    //     const maxId = Math.max(...firmware.value.versions.map((version) => version.id));
    //     const version = firmware.value.versions.find((version) => version.id === maxId);
    //     return `${firmware.value.name} ${version.name}`;
    // }
    return null;
});
</script>
