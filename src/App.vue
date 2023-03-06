<template>
    <div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="py-8">
                <img class="mx-auto" src="./assets/BrainPad.png" alt="" />
            </div>
            <div class="max-w-3xl mx-auto space-y-8">

                <h1 class="text-2xl font-bold">Steps to load new firmware.</h1>

                <ol class="ol-reset space-y-4 leading-loose">
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

                <button v-if="!isConnected" @click="doConnect" type="button" class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    Connect
                </button>

                <div v-if="error" class="rounded-md bg-red-50 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
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
                                    <XIcon class="h-5 w-5" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="isConnected" class="bg-gray-100 rounded-lg p-8">
                    <template v-if="state === 'idle'">
                        <div class="mb-4">
                            <label for="firmware" class="block text-sm font-medium text-gray-700">Firmware</label>
                            <select v-model="firmware" id="firmware" name="firmware" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md">
                                <option v-for="(option, key) in availableFirmware" :key="key" :value="key">
                                    {{ option.title }}
                                </option>
                            </select>
                        </div>
                        <div class="space-x-4">
                            <button @click="writeFirmware" :disabled="!firmware || !availableFirmware[firmware].image" type="button" class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 select-none disabled:opacity-25 disabled:pointer-events-none">
                                Load
                            </button>
                            <button @click="doConnect" type="button" class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                Disconnect
                            </button>
                        </div>
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
                        <div class="mb-4 w-full h-2 bg-[#f08000]"></div>
                        <div class="space-x-4">
                            <button @click="state = 'idle'" type="button" class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                Start Over
                            </button>
                            <button @click="doConnect" type="button" class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>

                <footer class="bg-white">
                    <div class="max-w-7xl mx-auto py-12 md:flex md:items-center md:justify-between">
                        <div class="flex justify-center space-x-6 md:order-2">
                            <a v-for="item in socials" :key="item.name" :href="item.href" target="_blank" class="text-gray-400 hover:text-gray-500">
                                <span class="sr-only">{{ item.name }}</span>
                                <i :class="item.icon" class="fab fa-fw fa-2x" aria-hidden="true"></i>
                            </a>
                        </div>
                        <div class="mt-8 md:mt-0 md:order-1">
                            <p class="text-center text-base text-gray-400">
                                &copy; {{ new Date().getFullYear() }} BrainPad, LLC. All rights reserved.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    </div>
</template>

<script>
import GHILoader from './js/GHILoader';
import { XCircleIcon, XIcon } from '@heroicons/vue/solid';

export default {
    components: {
        XCircleIcon,
        XIcon,
    },
    data() {
        return {
            availableFirmware: {
                'microPython_0_2_4': {
                    title: 'Python (MicroPython v0.2.4)',
                    url: 'firmware/SITCore-SC13-MP-Firmware-v0.2.4.glb',
                    isGlb: true,
                    image: null,
                },
                'TinyCLR_2_1_0_6500': {
                    title: '.NET C# (TinyCLR OS v2.1.0.6500)',
                    url: 'firmware/SITCore-SC13-Firmware-v2.1.0.6500.ghi',
                    isGlb: false,
                    image: null,
                },
				'MakeCode_0_1_0': {
                    title: 'MakeCode Loader (v0.1.0)',
                    url: 'firmware/MakeCode_BrainPadPulse_Bootloader_v0.1.0.ghi',
                    isGlb: false,
                    image: null,
                },
				'Brainpad_Due_Pulse_011': {
                    title: 'Brainpad_Due_Pulse (v0.1.1)',
                    url: 'firmware/Brainpad_Due_Pulse_011.ghi',
                    isGlb: false,
                    image: null,
                },
            },
            error: null,
            firmware: undefined,
            ghiLoader: new GHILoader(),
            isConnected: false,
            operation: undefined,
            percent: 0,
            port: undefined,
            socials: [
                {
                    name: 'Facebook',
                    href: 'https://www.facebook.com/brainpadboard/',
                    icon: 'fa-facebook',
                },
                {
                    name: 'YouTube',
                    href: 'https://www.youtube.com/channel/UCBOWfhv7bPF3tevjmGQMa7A',
                    icon: 'fa-youtube',
                },
                {
                    name: 'Twitter',
                    href: 'https://www.twitter.com/brainpadboard',
                    icon: 'fa-twitter',
                },
            ],
            state: 'idle',
        };
    },
    created() {
        navigator.serial.addEventListener('disconnect', () => {
            if (this.state === 'complete') {
                this.state = 'idle';
                this.firmware = undefined;
                this.isConnected = false;
            }
        });
    },
    methods: {
        async doConnect() {
            this.error = null;
            try {
                if (this.isConnected) {
                    await this.ghiLoader.close();
                    this.isConnected = false;
                    this.port = undefined;
                    this.state = 'idle';
                    return;
                }
                this.port = await navigator.serial.requestPort({});
                await this.ghiLoader.open(this.port);
                this.isConnected = true;
            } catch (error) {
                // Ignore showing an error when a user cancels the prompt.
                if (error.indexOf('No port selected by the user.') > -1) {
                    return;
                }
                this.error = error;
                this.isConnected = false;
                this.port = undefined;
            }
        },
        progress(current, total) {
            this.operation = current < 3 ? 'Erasing' : 'Loading';
            this.percent = Math.round((current / total) * 100);
            if (this.percent >= 100) {
                this.state = 'complete';
            }
        },
        async saveFirmwareImage(saveAs, resp) {
            const fileReader = new FileReader();
            fileReader.onload = function (event) {
                try {
                    localStorage.setItem(saveAs, event.target.result);
                } catch (error) {
                    this.error = 'Failed to store firmware image.';
                }
            };
            fileReader.readAsDataURL(resp);
        },
        async sha256(message) {
            // encode as UTF-8
            const msgBuffer = new TextEncoder().encode(message);
            // hash the message
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            // convert ArrayBuffer to Array
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            // convert bytes to hex string
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },
        async writeFirmware() {
            this.error = null;
            this.percent = 0;
            if (!this.availableFirmware[this.firmware].image) {
                this.error = 'Failed to load firmware from the server &mdash; cannot program the device.';
            }
            this.state = 'erasing';
            await this.ghiLoader.erase();
            this.state = 'writing';
            await this.ghiLoader.flash(
                this.availableFirmware[this.firmware].image,
                this.availableFirmware[this.firmware].isGlb,
                (current, total) => this.progress(current, total)
            );
        },
    },
    watch: {
        async firmware(key) {
            const url = this.availableFirmware[key].url;
            const hashedKey = await this.sha256(url);
            const saveAs = `download_${hashedKey}`;
            let blob = null;
            const response = await fetch(url);
            if (response.ok) {
                blob = await response.blob();
                const data = await blob.arrayBuffer();
                await this.saveFirmwareImage(saveAs, blob);
                this.availableFirmware[key].image = data;
            } else {
                this.error = `Unable to download the firmware (${response.status}).`;
                this.availableFirmware[key].image = null;
            }
        },
    },
}
</script>
