<template>
    <Panel :title="`USB Devices${availableDevices.length ? ` (${availableDevices.length})` : ''}`">
        <template #button>
            <Button
                class="btn-pin"
                data-tippy-content="Connect"
                @click.native.stop="webSerial.connect()"
            >
                <i class="fas fa-fw fa-plug"></i>
            </Button>
        </template>
        <div
            v-for="device in availableDevices"
            :key="device.productId"
            :class="isConnected(device) ? 'text-green-900 dark:text-green-300' : 'text-geyser-1400 dark:text-bunker-200'"
            class="flex items-center space-x-4 transition duration-150 ease-in-out"
        >
            <i
                :ref="(el) => $refs[`icon-${device.productId}`] = el"
                :class="isConnected(device) ? 'fas text-green-500 dark:text-green-300' : 'far'"
                :data-tippy-content="isConnected(device) ? 'Connected' : 'Not Connected'"
                class="fa-circle"
            ></i>
            <div class="flex-1">
                {{ device.productName }}
            </div>
        </div>
    </Panel>
</template>

<script setup>
import { nextTick, reactive, ref, watch } from 'vue';
import WebSerial from "../js/WebSerial";

// Components

import Button from './Button.vue';
import Panel from './Panel.vue';

// Refs

const $refs = reactive({});

// Emits

const $emit = defineEmits(['updateTippy']);

// Props

const props = defineProps({
    webSerial: WebSerial,
});

// Data

const availableDevices = reactive([]);
const firstConnect = ref(false);

// Watch

// watch(() => props.webUsb.device, () => {
//     nextTick(() => {
//         availableDevices.forEach((device) => {
//             $emit('updateTippy', $refs[`icon-${device.productId}`]);
//         });
//     });
// });

// Created

navigator.usb.getDevices().then((devices) => {
    devices.forEach((device) => {
        const index = availableDevices.findIndex((availableDevice) => availableDevice.vendorId === device.vendorId && availableDevice.productId === device.productId);
        if (index === -1) {
            availableDevices.push(device);
            availableDevices.sort((a, b) => a.productName.localeCompare(b.productName));
        }
    });
});

// This feature is available only in secure contexts (HTTPS), in some or all supporting browsers.
navigator.usb.addEventListener('connect', (event) => {
    if (findDeviceIndex(event.device) === -1) {
        addDevice(event.device);
    }
});

// This feature is available only in secure contexts (HTTPS), in some or all supporting browsers.
navigator.usb.addEventListener('disconnect', (event) => {
    const index = findDeviceIndex(event.device);
    if (index > -1) {
        availableDevices.splice(index, 1);
    }
    if (event.device.vendorId === props.webUsb?.device?.vendorId &&
        event.device.productId === props.webUsb?.device?.productId) {
        console.log('disconnect', 'device is undefined');
        props.webUsb.device = undefined;
    }
});

navigator.serial.addEventListener('connect', (event) => {
    console.log('connect', event);
});

navigator.serial.addEventListener('disconnect', (event) => {
    console.log('disconnect', event);
});

// Methods

function addDevice(device) {
    availableDevices.push(device);
    availableDevices.sort((a, b) => a.productName.localeCompare(b.productName));
    nextTick(() => $emit('updateTippy', $refs[`icon-${device.productId}`]));
}

async function connect() {
    await props.webUsb.connect();
    if (firstConnect.value && props.webUsb.device && findDeviceIndex(props.webUsb.device) === -1) {
        firstConnect.value = false;
        addDevice(props.webUsb.device);
    }
}

function findDeviceIndex(device) {
    return availableDevices.findIndex((d) => d.vendorId === device.vendorId && d.productId === device.productId);
}

function isConnected() {
    return false;
}
</script>
