<template>
    <Modal :open="open" max-width-class="sm:max-w-xl">
        <template #title>
            Update Firmware Steps
        </template>
        
        <ol class="mb-4 ol-reset space-y-2 leading-loose">
            <li>Connect your board to the computer.</li>
            <li>
                On your board, hold down the <kbd>A</kbd> button while pressing and releasing the <kbd>RESET</kbd> button once.
                <span class="font-semibold">Keep holding the <kbd>A</kbd> button down,</span> wait for a second, and then release it.
                <ul class="mt-2 ul-reset text-[#f08000]">
                    <li>This will put restart your board in bootloader mode.</li>
                </ul>
            </li>
            <li>Click the connect button below and select the <em>GHI Bootloader Interface</em>.</li>
            <li>
                Select the desired firmware and click <em>Load</em>.
                <ul class="mt-2 ul-reset text-[#f08000]">
                    <li>This will completely erase your board.</li>
                </ul>
            </li>
            <li>Once <span class="font-semibold">Loading is complete</span>, press and release the <kbd>RESET</kbd> button.</li>
            <li>You may now begin using the board.</li>
        </ol>
    
        <div v-if="error" class="mb-4 rounded-md bg-red-50 p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    [Icon]
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800">
                        An error has occurred
                    </h3>
                    <div class="mt-2 text-sm text-red-700">
                        <ul role="list" class="list-disc pl-5 space-y-1">
                            <li v-html="error"></li>
                        </ul>
                    </div>
                </div>
                <div class="ml-auto pl-3">
                    <div class="-mx-1.5 -my-1.5">
                        <button @click="error = null" type="button" class="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600">
                            <span class="sr-only">Dismiss</span>
                            [Icon]
                        </button>
                    </div>
                </div>
            </div>
        </div>
    
        <div v-if="isConnected">
            <template v-if="state === 'idle'">
                <label for="firmware" class="block text-sm font-medium text-gray-700">Firmware</label>
                <select v-model="firmware" id="firmware" name="firmware" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md">
                    <option v-for="(option, key) in availableFirmware" :key="key" :value="key">
                        {{ option.title }}
                    </option>
                </select>
            </template>
            <div v-else-if="state === 'erasing'">
                <div class="mb-2">Erasing...</div>
                <div class="w-full h-2"></div>
            </div>
            <div v-else-if="state === 'writing'">
                <div class="mb-2">Loading... {{ percent }}%</div>
                <div class="w-full h-2 bg-[#f08000] bg-opacity-25">
                    <div class="h-2 bg-[#f08000]" :style="`width:${percent}%`"></div>
                </div>
            </div>
            <div v-else-if="state === 'complete'">
                <div class="mb-2">Loading is complete.</div>
                <div class="w-full h-2 bg-[#f08000]"></div>
            </div>
        </div>
        
        <template #buttons>
            <div class="flex space-x-2">
                <template v-if="isConnected">
                    <template v-if="state === 'idle'">
                        <Button @click.native="writeFirmware" :disabled="!firmware || !availableFirmware[firmware].image">
                            Load
                        </Button>
                        <Button @click.native="connect">
                            Disconnect
                        </Button>
                    </template>
                    <template v-else-if="state === 'complete'">
                        <Button @click.native="state = 'idle'">
                            Start Over
                        </Button>
                        <Button @click.native="connect">
                            Disconnect
                        </Button>
                    </template>
                </template>
                <template v-else>
                    <Button @click.native="connect">
                        Connect
                    </Button>
                    <Button @click.native="$emit('close')" type="secondary">
                        Close
                    </Button>
                </template>
            </div>
        </template>
    </Modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import GHILoader from '../js/GHILoader';

// Components

import Modal from './Modal.vue';
import Button from './Button.vue';

// Props

const props = defineProps({
    availableFirmware: {
        type: Object,
        required: true,
    },
    open: Boolean,
});

// Data

const firmware = ref(null);
const ghiLoader = new GHILoader();
const isConnected = ref(false);
const error = ref(null);
const state = ref('idle');
const operation = ref(null);
const percent = ref(0);

let port = undefined;

// Watch

watch(() => firmware.value, async (key) => {
    if (!key) {
        return;
    }
    const url = props.availableFirmware[key].url;
    console.log('Firmware selected', url);
    const hashedKey = await sha256(url);
    const saveAs = `download_${hashedKey}`;
    let blob = null;
    const response = await fetch(url);
    if (response.ok) {
        blob = await response.blob();
        const data = await blob.arrayBuffer();
        await saveFirmwareImage(saveAs, blob);
        props.availableFirmware[key].image = data;
        console.log('Firmware ready');
    } else {
        error.value = `Unable to download the firmware (${response.status}).`;
        props.availableFirmware[key].image = null;
        console.log('Firmware error');
    }
});

// Methods

async function connect() {
    error.value = null;
    try {
        if (isConnected.value) {
            await ghiLoader.close();
            isConnected.value = false;
            port = undefined;
            state.value = 'idle';
            return;
        }
        port = await navigator.serial.requestPort({});
        await ghiLoader.open(port);
        isConnected.value = true;
    } catch (error) {
        // Ignore showing an error when a user cancels the prompt.
        if (error.indexOf('No port selected by the user.') > -1) {
            return;
        }
        error.value = error;
        isConnected.value = false;
        port = undefined;
    }
}

async function sha256(message) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);
    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // convert bytes to hex string
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function progress(current, total) {
    operation.value = current < 3 ? 'Erasing' : 'Loading';
    percent.value = Math.round((current / total) * 100);
    if (percent.value >= 100) {
        state.value = 'complete';
    }
}

async function saveFirmwareImage(saveAs, resp) {
    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        try {
            localStorage.setItem(saveAs, event.target.result);
        } catch (error) {
            error.value = 'Failed to store firmware image.';
        }
    };
    fileReader.readAsDataURL(resp);
}

async function writeFirmware() {
    error.value = null;
    percent.value = 0;
    if (!props.availableFirmware[firmware.value].image) {
        error.value = 'Failed to load firmware from the server &mdash; cannot program the device.';
    }
    state.value = 'erasing';
    await ghiLoader.erase();
    state.value = 'writing';
    await ghiLoader.flash(
        props.availableFirmware[firmware.value].image,
        props.availableFirmware[firmware.value].isGlb,
        (current, total) => progress(current, total)
    );
}
</script>