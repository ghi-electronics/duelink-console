<template>
  <Modal
  :open="open"
  max-width-class="w-auto max-w-[50vw] min-w-[350px] sm:max-w-[60vw] lg:max-w-[80vw]"
>  
    <template #title> Firmware Update </template>
    <div
      v-if="!isConnected "
    >
      Updates will bring new features and fixes to your module, see <a target="_blank" href="https://www.duelink.com/docs/release-notes"> Release Notes</a>.<br>
      <ol class="list-decimal">
        <li>Connect your module to a computer.</li>
        <li>Enter the <kbd>DFU Mode</kbd>. You can either use the <kbd>Erase All</kbd> button, or <kbd>Force DFU Mode</kbd> as explained on the <a target="_blank" href="https://www.duelink.com/docs/loader">Loader page</a>.</li>
        <li>Click the <kbd>Connect</kbd> button and select <kbd>DFU in FS mode</kbd>. If no compatible device found, check your <kbd>Device Manager</kbd>, you might need to install the <a target="_blank" href="https://www.duelink.com/docs/downloads#usb-drivers"> USB drivers</a>.</li>
      </ol>
    </div>
    
    <div v-if="error" class="mb-4 rounded-md bg-red-50 p-4">
      <div class="flex">
        <div class="flex-shrink-0">[Icon]</div>
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
            <button
              @click="error = null"
              type="button"
              class="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
            >
              <span class="sr-only">Dismiss</span>
              [Icon]
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isConnected">
      You have 2 firmware options:<br>
      <ol class="list-decimal">
        <li><kbd>DUELink (Official)</kbd> firmware: Use this to write scripts using this console, to load <a target="_blank" href="https://www.duelink.com/docs/engine/drivers">drivers</a>, and to control modules using one of the <a target="_blank" href="https://www.duelink.com/docs/language/intro"> Coding Languages</a> page.</li>
        <li><kbd>MicroBlocks (microblocks.fun)</kbd> firmware: This brings block-coding option right to your DUELink module. See <a target="_blank" href="https://www.duelink.com/docs/language/microblocks"> MicroBlocks</a> page for more details.</li>
      </ol>
      <div v-if="state === 'idle'" class="grid grid-cols-6 gap-2">      
        <div class="col-span-4">
          <hr>
          <label for="dfu">Firmware</label>
          <select v-model="dfu" id="dfu" class="mt-2">
            <option value="" disabled>Select</option>
            <option
              v-for="(option, key) in availableDfu"
              
              :key="key"
              :selected="key === dfu"
              :value="key"
            >            
              {{ option.name }} ({{
                option.boards.map((board) => board.name).join(", ")
              }})              
            </option>
          </select>
        </div>
        <div class="col-span-2">
          <label for="version">Version</label>
          <select
            v-model="version"
            :disabled="!dfu"
            id="version"
            class="mt-2"
          >
            <option
              v-for="(option, key) in availableVersions"
              :key="key"
              :selected="key === version"
              :value="key"
            >
              {{ option.name }}
            </option>
          </select>
        </div>
      </div>
      <div v-else-if="state === 'erasing'" class="firmware-progress-box">
        <div class="w-full">
          <div class="mb-2 text-sky-600 dark:text-lime-400">
            Erasing... {{ percent }}%
          </div>
          <div class="w-full h-2 bg-slate-300 dark:bg-zinc-700">
            <div
              class="h-2 bg-sky-500 dark:bg-lime-500"
              :style="`width:${percent}%`"
            ></div>
          </div>
        </div>
      </div>
      <div v-else-if="state === 'writing'" class="firmware-progress-box">
        <div class="w-full">
          <div class="mb-2 text-sky-600 dark:text-lime-400">
            Writing... {{ percent }}%
          </div>
          <div class="w-full h-2 bg-slate-300 dark:bg-zinc-700">
            <div
              class="h-2 bg-sky-500 dark:bg-lime-500"
              :style="`width:${percent}%`"
            ></div>
          </div>
        </div>
      </div>
      <div v-else-if="state === 'complete'" class="firmware-progress-box">
        <div class="w-full">
          <div class="mb-2 text-sky-600 dark:text-lime-400">
            Updated... 100%
          </div>
          <div class="w-full h-2 bg-sky-500 dark:bg-lime-500"></div>
        </div>
      </div>
      
      <div v-else-if="state === 'erase_complete'" class="firmware-progress-box">
        <div class="w-full">
          <div class="mb-2 text-sky-600 dark:text-lime-400">
            Erased all... 100%
          </div>
          <div class="w-full h-2 bg-sky-500 dark:bg-lime-500"></div>
        </div>
      </div>

      
    </div>

    <template #buttons>
      <div class="flex space-x-2">
        <template v-if="isConnected">
          <template v-if="state === 'idle'">
            <Button
              :disabled="!dfu"
              @click.native="writeFirmware"
            >
              Load
            </Button>
            <Button type="secondary" @click.native="disconnect">
              Disconnect
            </Button>
            
            <Button type="secondary" @click.native="performEraseAll">
              Clear Memory
            </Button>
            
          </template>
          <template v-if="state === 'erasing' || state === 'writing'">
            <Button disabled> Load </Button>
            <Button disabled type="secondary"> Disconnect </Button>
          </template>
          <template v-else-if="state === 'complete'">                   
            <Button @click.native="done"> Close </Button>            
          </template>
          
          <template v-else-if="state === 'erase_complete'">  
            <Button @click.native="doback"> Back </Button>                  
            <Button @click.native="done"> Close </Button>
          </template>
          
        </template>
        <template v-else>
          <Button @click.native="connect"> Connect </Button>
          <Button type="secondary" @click.prevent="$emit('eraseall_dms_dfumodal')"> Erase All </Button>
          <Button type="secondary" @click.native="$emit('close')">
            Close
          </Button>
        </template>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";

// Components

import Modal from "./Modal.vue";
import Button from "./Button.vue";

// Emits

const $emit = defineEmits(["close"]);

// Props

const props = defineProps({
  availableDfu: {
    type: Object,
    required: true,
  },
  open: Boolean,
});

// Data

const dfu = ref("");
const version = ref("");
const isConnected = ref(false);
const error = ref(null);
const state = ref("idle");
const operation = ref(null);
const percent = ref(0);

let port = undefined;

// Computed

const availableVersions = computed(
  () =>
    props.availableDfu?.[dfu.value]?.versions.sort(
      (a, b) => b.id - a.id
    ) || []
);

// Watch

watch([dfu, version],
async () => {
  const url = availableVersions.value[version.value].url;
      console.log("DFU selected", url);
      const hashedKey = await sha256(url);
      const saveAs = `download_${hashedKey}`;
      let blob = null;
      const response = await fetch(url);
      if (response.ok) {
        blob = await response.blob();
        const data = await blob.arrayBuffer();
        await saveFirmwareImage(saveAs, blob);
        props.availableDfu[dfu.value].image = data;
        console.log("Firmware ready");
      } else {
        error.value = `Unable to download the firmware (${response.status}).`;
        props.availableDfu[dfu.value].image = null;
        console.log("Firmware error");
      }
  }
);

// Methods

function catchError(error) {
  // Ignore showing an error when a user cancels the prompt.
  if (
    typeof error === "string" &&
    error.indexOf("No port selected by the user.") > -1
  ) {
    return;
  }
  error.value = error;
  isConnected.value = false;
  port = undefined;
}

async function connect() {
  if (isConnected.value) {
    return;
  }
  error.value = null;
  try {    
    await connectDevice();
  } catch (error) {
    catchError(error);
  }
  const keys = Object.keys(props.availableDfu);
  const index = keys.findIndex((key) => key === "DUELink");
  if (index > -1) {
    dfu.value = keys[index];
    version.value = 0;
  }
}

async function disconnect() {
  if (!isConnected.value) {
    return;
  }
  error.value = null;
  try {
    //await ghiLoader.close();
    isConnected.value = false;
    port = undefined;
    state.value = "idle";
  } catch (error) {
    catchError(error);
  }
}

async function done() {
  restart();
  await disconnect();
  $emit("close");
}

async function doback() {
  state.value = "idle";
}

async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message);
  // hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // convert bytes to hex string
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function progress(current, total) {
  operation.value = current < 3 ? "Erasing" : "Loading";
  percent.value = Math.round((current / total) * 100);
  if (percent.value >= 100) {
    state.value = "complete";
  }
}

function restart() {
  state.value = "idle";
  dfu.value = "DUELink";
  version.value = "";
}

async function saveFirmwareImage(saveAs, resp) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    try {
      localStorage.setItem(saveAs, event.target.result);
    } catch (error) {
      error.value = "Failed to store firmware image.";
    }
  };
  fileReader.readAsDataURL(resp);
}

async function writeFirmware() {
  error.value = null;
  percent.value = 0;
  if (!props.availableDfu[dfu.value].image) {
    error.value =
      "Failed to load firmware from the server &mdash; cannot program the device.";
  }
  performDfuFirmwareUpgrade(props.availableDfu[dfu.value].image);
}

 // ----- Configuration -----
  const STM32_VID = 0x0483;           // STMicroelectronics
  const STM32_PID = 0xDF11;           // STMicroelectronics
  const DFU_INTERFACE_NUMBER = 0;        
  const DFU_TRANSFER_SIZE = 1024;
  const DFU_PAGE_ERASE_SIZE = 2048;
  const BASE_ADDRESS = 0x08000000;

  // ----- UI Logging Helper -----
  function log(msg) {
    console.log(msg);  
  }

  // ----- Connect to the Device -----
  let device;
  async function connectDevice() {
      try {
          isConnected.value = false;
          device = await navigator.usb.requestDevice({
              filters: [
              { 
                vendorId: STM32_VID,      // STMicroelectronics
                productId: STM32_PID      // STM32 DFU bootloader
              }
            ]
          });
          await device.open();
          if (!device.configuration) {
              await device.selectConfiguration(1);
          }
          await device.claimInterface(DFU_INTERFACE_NUMBER);
          log("Device connected; DFU interface claimed.");
          //document.getElementById("startUpdate").disabled = false;
          isConnected.value = true;
      } catch (error) {
          error.value = "Connection error: " + error;      
          log("Connection error: " + error);
          isConnected.value = false; 
      }
  }

  // ----- DFU Request Helpers -----
  const DFU_DNLOAD = 1;       // DFU_DNLOAD request code
  const DFU_GETSTATUS = 3;    // DFU_GETSTATUS request code
  const DFU_CLRSTATUS = 4;    // DFU_CLRSTATUS request code

  // Send a DFU_DNLOAD request with the given block number and data.
  async function dfuDownloadBlock(blockNumber, dataBuffer) {
      const result = await device.controlTransferOut({
          requestType: 'class',
          recipient: 'interface',
          request: DFU_DNLOAD,
          value: blockNumber,
          index: DFU_INTERFACE_NUMBER
      }, dataBuffer);
      if (result.status !== "ok") {
          throw new Error("DNLOAD transfer failed at block " + blockNumber);
      }
      return result;
  }

  // Get DFU status (6-byte response)
  async function dfuGetStatus() {
      const result = await device.controlTransferIn({
          requestType: 'class',
          recipient: 'interface',
          request: DFU_GETSTATUS,
          value: 0,
          index: DFU_INTERFACE_NUMBER
      }, 6);
      if (result.status === 'ok' && result.data && result.data.byteLength === 6) {
          const view = new DataView(result.data.buffer);
          return {
              status: view.getUint8(0),
              pollTimeout: view.getUint8(1) | (view.getUint8(2) << 8) | (view.getUint8(3) << 16),
              state: view.getUint8(4),
              iString: view.getUint8(5)
          };
      } else {
          throw new Error("Failed to read DFU status.");
      }
  }

  // Simple sleep helper.
  function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Wait for DFU idle states 5 - dfuDNLOAD-IDLE or 2 - dfuIDLE
  async function waitForDfuIdle() {
      while (true) {
          const status = await dfuGetStatus();
          log(`DFU state: ${status.state} - pollTimeout: ${status.pollTimeout}ms`);
          if (status.state === 5 || status.state === 2) break;
          await sleep(status.pollTimeout);
      }
  }

  // ----- Flash Erase Routine -----
  // Erases the flash pages that will be programmed.
  async function eraseTargetArea(totalSize) {
      // Calculate number of pages to erase.
      state.value = 'erasing';
      const pages = Math.ceil(totalSize / DFU_PAGE_ERASE_SIZE);
      log(`Erasing ${pages} flash page(s) starting at 0x${BASE_ADDRESS.toString(16)}...`);
      for (let i = 0; i < pages; i++) {
          const pageAddress = BASE_ADDRESS + i * DFU_PAGE_ERASE_SIZE;
          const eraseBlock = new Uint8Array(5);
          // Set up the erase command:
          // 0x41 Erase command.
          eraseBlock[0] = 0x41;
          // Next 4 bytes: flash page address (little-endian)
          eraseBlock[1] = pageAddress & 0xff;
          eraseBlock[2] = (pageAddress >> 8) & 0xff;
          eraseBlock[3] = (pageAddress >> 16) & 0xff;
          eraseBlock[4] = (pageAddress >> 24) & 0xff;
          log(`Erasing flash page at address 0x${pageAddress.toString(16)}`);
          await dfuDownloadBlock(0, eraseBlock);
          await waitForDfuIdle();
          progress(i, pages);
          //await sleep(200); // Allow time for erase to complete.
      }
      log("Erase complete.");
  }
  
  // ----- DFU Go command (Single‑Session, DFU 1.1) -----
  async function Go() {
        log(`Sending final zero-length packet  to complete DFU transfer...`);
        let cmdBlock = new Uint8Array(5);
        try {              
          cmdBlock[0] = 0x21; // "Download Memory" command
          cmdBlock[1] = BASE_ADDRESS & 0xff;
          cmdBlock[2] = (BASE_ADDRESS >> 8) & 0xff;
          cmdBlock[3] = (BASE_ADDRESS >> 16) & 0xff;
          cmdBlock[4] = (BASE_ADDRESS >> 24) & 0xff;
          log(`Sending address command block (block 0): write pointer set to 0x${BASE_ADDRESS.toString(16)}`);
          await dfuDownloadBlock(0, cmdBlock);
          await waitForDfuIdle();

          
          await dfuDownloadBlock(0, new ArrayBuffer(0));
          
          await waitForDfuIdle();
          
          return 1;
        } catch (e) {
          // STM32 DFU bootloader can return an error (e.g. status error 10)
          // when the final packet triggers the manifest phase (reset).
          log(`Finalization error (expected during manifest/reset): ${e.message}`);
        }
        
        return 0;
  }
  
  
  // ----- DFU Erase all Process (Single‑Session, DFU 1.1) -----
  async function performEraseAll() {
      try {
          let status = await dfuGetStatus();
          
          if (status.status !== 0) {
              log("Clearing DFU error status...");
              await device.controlTransferOut({
                  requestType: 'class',
                  recipient: 'interface',
                  request: DFU_CLRSTATUS,
                  value: 0,
                  index: DFU_INTERFACE_NUMBER
              });
              await sleep(100);
          }
          
          const totalSize = 128*1024; // max size is 128k
          await eraseTargetArea(totalSize);
          
          // await this.Go();
          
          state.value = "erase_complete";
      }
      catch (err) {
          log("Erase all failed: " + err.message);
          state.value = "erase_complete";
      }
  }

  // ----- DFU Firmware Upgrade Process (Single‑Session, DFU 1.1) -----
  async function performDfuFirmwareUpgrade(firmwareBuffer) {
      try {
          // Clear any previous DFU error status.
          let status = await dfuGetStatus();
          if (status.status !== 0) {
              log("Clearing DFU error status...");
              await device.controlTransferOut({
                  requestType: 'class',
                  recipient: 'interface',
                  request: DFU_CLRSTATUS,
                  value: 0,
                  index: DFU_INTERFACE_NUMBER
              });
              await sleep(100);
          }

          const totalSize = firmwareBuffer.byteLength;
          log(`Firmware size: ${totalSize} bytes`);

          // -------- Step 0: Erase flash pages --------
          await eraseTargetArea(totalSize);

          state.value = 'writing';
          // -------- Step 1: Set the flash write pointer --------
          // Send block 0 with the "Download Memory" command (0x21)
          // Using the intended flash base address.
          let cmdBlock = new Uint8Array(5);
          cmdBlock[0] = 0x21; // "Download Memory" command
          cmdBlock[1] = BASE_ADDRESS & 0xff;
          cmdBlock[2] = (BASE_ADDRESS >> 8) & 0xff;
          cmdBlock[3] = (BASE_ADDRESS >> 16) & 0xff;
          cmdBlock[4] = (BASE_ADDRESS >> 24) & 0xff;
          log(`Sending address command block (block 0): write pointer set to 0x${BASE_ADDRESS.toString(16)}`);
          await dfuDownloadBlock(0, cmdBlock);
          await waitForDfuIdle();

          // -------- Step 2: Send firmware data blocks --------
          // The fix: start the firmware data at block number 2 (skip block 1).
          // This ensures that the first 1024 bytes of the file are written starting at BASE_ADDRESS.
          let offset = 0;
          let blockNumber = 2;
          while (offset < totalSize) {
              const chunk = firmwareBuffer.slice(offset, offset + DFU_TRANSFER_SIZE);
              log(`Transferring block ${blockNumber} (size: ${chunk.byteLength} bytes)...`);
              await dfuDownloadBlock(blockNumber, chunk);
              await waitForDfuIdle();
              offset += chunk.byteLength;
              blockNumber++;
              progress(offset, totalSize);
          }

          // -------- Step 3: Finalize DFU download --------
          log(`Sending final zero-length packet (block ${blockNumber}) to complete DFU transfer...`);
          await Go();
          log("Firmware update complete. The device should now program the firmware and reset.");
          state.value = "complete";
      } catch (err) {
          log("Firmware upgrade failed: " + err.message);
          state.value = "complete";
      }
  }
</script>


