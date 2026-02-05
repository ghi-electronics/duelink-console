<template>
    <div id="progress-bar">
        <div
            :ref="(el) => $refs.progress = el"
            class="h-1 bg-sky-500 dark:bg-lime-500 transition duration-1000 ease-linear opacity-0"
        ></div>
    </div>
    <div class="min-h-screen flex flex-col space-y-0.5">
        <MenuBar
            v-model:theme="theme"
            @demo="demo"
            @firmware="firmwareModal.start()"
            @dfu="dfuModal.start()"
            @update:theme="updateTippyTheme"
            @updateTippy="updateTippy"
            @update_driver_menubar="do_update_driver_menubar"            
            @clone_fw="do_clone_fw"
        />
        <ToolBar
            :can-download="canDownload"
            :can-list="true"
            :can-load="true"
            :can-play="canPlay"
            :can-record="canRecord"
            :can-stop="canStop"
            :can-text-size-plus="textSize < 40"
            :can-text-size-minus="textSize > 12"
            :is-busy="webSerial.isBusy.value"
            :is-connected="webSerial.isConnected.value"
            :is-talking="webSerial.isTalking.value"
            :devAdd="sel_devaddr"
            @connect="do_connect"
            @disconnect="webSerial.disconnect()"
            @download="downloadModal.start()"
            @play="webSerial.play()"
            @stop="webSerial.stop()"
            @record="sendRecordMode"
            @list="sendList"
            @load="onLoad"
            @text-size-plus="textSizePlus"
            @text-size-minus="textSizeMinus"
            @sel_cmd="sel_cmd_msgbox_show"
            
        />
        <div class="flex-1 flex flex-col space-y-0.5 sm:space-y-0 sm:flex-row sm:space-x-0.5">
            <div id="editor" class="flex-1 p-2 flex flex-col">
                <VAceEditor
                    v-model:value="recordModeCode"
                    :lang="language"
                    :ref="(el) => $refs.editor = el"
                    :theme="theme === 'dark' ? 'tomorrow_night_bright' : 'crimson_editor'"
                    class="flex-1"
                    @init="onEditorInit"
                />
                <div id="direct-bar" class="p-2 sm:pl-[42px] flex space-x-2">
                    <div class="flex-1">
                        <div class="relative">
                            <div
                                class="absolute right-0 inset-y-0 p-1 flex items-center justify-center rounded-r-md"
                                @click="directModeCode = ''; $refs.input.focus();"
                            >
                                <div
                                    :class="[directModeCode.length
                                        ? 'text-slate-400 hover:text-slate-900 dark:text-zinc-600 dark:hover:text-zinc-100'
                                        : 'hidden'
                                    ]"
                                    class="flex items-center justify-center w-8 h-full rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900"
                                >
                                    <i class="fas fa-fw fa-xmark"></i>
                                </div>
                            </div>
                            <input
                                v-model="directModeCode"
                                :ref="(el) => $refs.input = el"
                                placeholder="Code to run immediately..."
                                type="text"
                                @keyup.enter="sendDirectMode"
                            />
                        </div>
                    </div>
                    <Button
                        :disabled="disabled"
                        data-tippy-content="Execute"
                        @click.native="sendDirectMode"
                    >
                        <i class="fas fa-fw fa-arrow-right"></i>
                    </Button>
                    <Button
                        :disabled="disabled"
                        data-tippy-content="Stop"
                        @click.native="sendEscape"
                    >
                        <i class="fas fa-fw fa-stop"></i>
                    </Button>
                </div>
            </div>
            <div id="side-bar" class="sm:w-1/2 lg:w-1/3 p-2 space-y-0.5">
                <RegionsPanel
                    :regions="webSerial.regions.value"
                    @list-all="webSerial.listAll()"
                    @new-all="newAllModal.open = true"
                    @region="webSerial.region($event)"
                />
                <LogPanel v-model:log="webSerial.log.value" />
                <HistoryPanel v-model:history="webSerial.history.value" closed />
                <AboutPanel 
                :available-dfu="availableDfu" 
                :version="webSerial.version.value" 
                :devAdd="webSerial.update_devaddr.value"
                @firmware-matches="onFirmwareMatches" 
                @call-update-firmware-box="dfuModal.start()"/>
            </div>
        </div>

        <div v-if="eraseall_dms_msgbox_confirm_pre" class="overlay">
            <div class="dialog">
                <div class="dialog-title">
                    <i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>
                    Warning
                </div>
                <div class="dialog-body">
                    <p v-if="sel_devaddr === 1">
                        This feature only works on modules loaded with either DUELink official firmware or MicroBlocks firmware. It will completely erase the device and put it in DFU (Device Firmware Update) mode.<br><br>Note: The following <strong>Connect</strong> window will be empty if the device is already in DFU mode or it has an uncompatible firmware, see <a target="_blank" href="https://www.duelink.com/docs/loader">Loader page</a>.
                    </p>
                    <p v-else>
                        This feature is only allowed on <strong>Sel(1)</strong>,
                        you have <strong>Sel({{ sel_devaddr }})</strong>.
                    </p>
                </div>
                
                <div class="dialog-buttons">
                    <button
                        v-if="sel_devaddr === 1"
                        class="yes"
                        @click="do_eraseall_dms_pre_yes"
                    >
                        Continue
                    </button>
                    <button
                        :class="sel_devaddr === 1 ? 'no' : 'yes'"
                        @click="do_eraseall_dms_pre_no"
                    >
                        Abort
                    </button>
                    
                </div>               
            </div>
        </div>

        <div v-if="update_driver_msgbox_confirm_pre" class="overlay">
            <div class="dialog">
                <div class="dialog-title">
                    <i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>
                    Warning
                </div>
                <div class="dialog-body">
                    <p>This feature will load/replace the <a target="_blank" href="https://www.duelink.com/docs/engine/drivers">drivers</a> on a module running DUELink official firmware.</p>
   
                    <label for="device-number" style="display: block; margin-top: 10px;">
                        Module Address:                   
                        <input
                            id="device-number"
                            type="number"
                            min="1"
                            max="254"
                            v-model.number="webSerial.update_devaddr.value"
                            placeholder="Enter device number"
                            style="width: 70px; height: 26px;margin-top: 1px;"
                            @blur="onDeviceNumberBlur"
                        />
                     </label>
                </div>
                
                <div class="dialog-buttons">
                    <button class="yes" @click="do_update_driver_pre_yes">Continue</button>
                    <button class="no" @click="do_update_driver_pre_no">Abort</button>
                </div>               
            </div>
        </div>

        <div v-if="sel_cmd_msgbox" class="overlay">
            <div class="dialog">
                
                <div class="dialog-title-success">                   
                    Select Module Address
                </div>

                <div class="dialog-body">
                    <div class="tip-box">
                        <span class="tip-icon">💡</span>
                        <span class="tip-text">
                            <strong>Tip:</strong> All Daisylinked modules must have the DUELink official firmware.
                        </span>
                    </div>
                    <label for="device-number" style="display: block; margin-top: 10px;">
                        Module Address:                   
                        <input
                            id="device-number"
                            type="number"
                            min="1"
                            max="254"
                            v-model.number="sel_devaddr"
                            placeholder="Enter device number"
                            style="width: 70px; height: 26px;margin-top: 1px;"
                            @blur="onDeviceNumberBlur"
                        />
                    </label>
                </div>
                
                <div class="dialog-buttons">
                    <button class="yes" @click="do_sel_cmd_msgbox_yes">Select</button>      
                    <button class="no" @click="do_sel_cmd_msgbox_no">Cancel</button>                   
                </div>               
            </div>
        </div>

        <div v-if="eraseall_dms_msgbox_confirm_final" class="overlay">
            <div class="dialog">
                <div class="dialog-title">
                    <i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>
                    Warning
                </div>
                <div class="dialog-body">
                    <p>{{dms_confirm_final_text}}<br><br></p>
                </div>
                
                <div class="dialog-buttons">
                    <button class="yes" @click="do_eraseall_dms_final_yes">Yes</button>
                    <button class="no" @click="do_eraseall_dms_final_no">No</button>
                </div>                   
            </div>
        </div>

        <div v-if="update_driver_msgbox_confirm_final" class="overlay">
            <div class="dialog">
                <div class="dialog-title">
                    <i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>
                    Warning
                </div>
                <div class="dialog-body">
                    <p>{{do_update_driver_confirm_final_text1}}<br></p>
                    <p>{{do_update_driver_confirm_final_text2}}<br></p>
                    <p :style="{ color: firmwareMatches ? '#000000' : '#d9534f' }">
                    {{ do_update_driver_confirm_final_text3 }}<br>
                    </p>
                    <p v-if="firmwareMatches === false" class="firmware-warning">
                        (Recommend: 
                        <button
                            class="link-button underline"
                            @click="
                                update_driver_msgbox_confirm_final = false;
                                dfuModal.start();
                            "
                        >
                            Update
                        </button>
                        to the latest firmware.) 
                    </p>
                    <br>
                    <p>Do you want to erase all scripts and load <a 
                        target="_blank" 
                        :href="webSerial.update_driver_path.value"
                    >this driver</a>?<br><br></p>       
     
                </div>

                
                <div class="dialog-buttons">
                    <button class="yes" @click="do_update_driver_final_yes">Yes</button>
                    <button class="no" @click="do_update_driver_final_no">No</button>
                </div>                   
            </div>
        </div>

        <div v-if="update_driver_msgbox_progress" class="overlay">
            <div class="dialog" style="width: 25vw;">
                <div 
                class="dialog-title"
                :class="{ 'dialog-title-success': percent_tmp === 100 }"
                >
                <!--<i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>-->
                 <!-- Show icon only while writing -->
                <i
                    v-if="percent_tmp < 100"
                    class="fas fa-exclamation-triangle"
                    style="margin-right: 8px;"
                ></i>
                {{ percent_tmp < 100 ? "Writting..." : "Updated successful" }}
                </div>

                <div class="dialog-body">
                <!-- Progress bar -->
                <br>
                <div class="update-driver-progress-container">
                    <div
                    class="update-driver-progress-bar"
                    :style="{ 
                        width: percent_tmp + '%'
                        
                        }"
                    ></div>
                </div>

                <!-- Percent text -->
                <div class="progress-text">
                    {{ percent_tmp }}%
                </div>
                </div>

                <div class="dialog-buttons">
                    <button 
                        class="no" 
                        @click="update_driver_msgbox_progress = false" 
                        :disabled="percent_tmp < 100"
                    >
                        {{ percent_tmp < 100 ? "Please wait..." : "Close" }}
                    </button>

                    <!-- Blink LED button, only visible when progress is 100% -->
                    <!--<button 
                        v-if="percent_tmp === 100"
                        class="no"
                        @click="blinkLED()"
                    >
                        Blink StatLed
                    </button>
                    -->
                </div>
            </div>
        </div>

        <div v-if="connect_msgbox_progress" class="overlay">
            <div class="dialog" style="width: 25vw;">
                <div 
                class="dialog-title"
                :class="{ 'dialog-title-success': percent_tmp === 100 }"
                >
                <!--<i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>-->
                 <!-- Show icon only while writing -->
                <i
                    v-if="percent_tmp < 100"
                    class="fas fa-exclamation-triangle"
                    style="margin-right: 8px;"
                ></i>
                {{ percent_tmp < 100 ? "Please wait..." : "Connected" }}
                </div>

                <div class="dialog-body">
                <!-- Progress bar -->
                <br>
                <div class="update-driver-progress-container">
                    <div
                    class="update-driver-progress-bar"
                    :style="{ 
                        width: percent_tmp + '%'
                        
                        }"
                    ></div>
                </div>

                <!-- Percent text -->
                <div class="progress-text">
                    {{ percent_tmp }}%
                </div>
                </div>

            </div>
        </div>
        
        <div v-if="eraseall_dms_msgbox_finished" class="overlay">
            <div class="dialog">
                <div class="dialog-title-success">
                    <i class="fas fa-check-circle" style="color: green; margin-right: 8px;"></i>
                    Success
                </div>
                <div class="dialog-body">
                     <p>"Erase All" operation completed. You are in DFU Mode now!<br><br>Click the Connect button on the next window.</p>        
                </div>

                <div class="dialog-buttons">
                    <button class="no" @click="
                        eraseall_dms_msgbox_finished = false;
                        dfuModal.start();
                        webSerial.isBusy = false;
                        ">Close</button>
                </div>       
            </div>
        </div>

        <div v-if="do_clone_fw_pre" class="overlay">
            <div class="dialog">
                <div class="dialog-title">
                    <i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>
                    Warning  
                </div>
                <div class="dialog-body">
                    <p>All selected devices will be erased and the firmware will be cloned from the starting device address.</p>
   
                    <label for="device-number-start" style="display: block; margin-top: 10px;">
                        Clone firmware from device address:                   
                        <input
                            id="device-number-start"
                            type="number"
                            min="1"
                            max="254"
                            v-model.number="clone_dev_addr_start"
                            placeholder="Enter device number"
                            style="width: 70px; height: 26px;margin-top: 1px;"
                            @blur="onDeviceNumberBlur"
                        />
                        <span style="margin-left: 12px;">
                            to device address:
                        </span>
                        
                        <input
                            id="device-number-end"
                            type="number"
                            min="1"
                            max="254"
                            v-model.number="clone_dev_addr_end"
                            placeholder="Enter device number"
                            style="width: 70px; height: 26px;margin-top: 1px;"
                            @blur="onDeviceNumberBlur"
                        />
                     </label>
                    
                </div>
                
                <div class="dialog-buttons">
                    <button class="yes" @click="do_clone_fw_pre_yes">Continue</button>
                    <button class="no" @click="do_clone_fw_pre_no">Abort</button>
                </div>               
            </div>
        </div>

        <div v-if="clone_msg_box_progress" class="overlay">
            <div class="dialog" style="width: 25vw;">
                <div 
                class="dialog-title"
                :class="{ 'dialog-title-success': webSerial.clone_fw_status.value == clone_dev_addr_end }"
                >
                <!--<i class="fas fa-exclamation-triangle" style="color: yellow; margin-right: 8px;"></i>-->
                 <!-- Show icon only while writing -->
                <i
                    v-if="webSerial.clone_fw_status.value != clone_dev_addr_end"
                    class="fas fa-exclamation-triangle"
                    style="margin-right: 8px;"
                ></i>
                {{ webSerial.clone_fw_status.value != clone_dev_addr_end ? "Please wait..." : "Finishing..." }}
                </div>

                <div class="dialog-body">
                <!-- Progress bar -->
                
                <div class="progress-text">
                    Cloning firmware from device {{ webSerial.clone_fw_dev.value-1 }} to device {{ webSerial.clone_fw_dev.value }}
                </div>
                <br>
                <div class="update-driver-progress-container">
                    <div
                    class="update-driver-progress-bar"
                    :style="{ 
                        width: webSerial.clone_fw_progress.value + '%'
                        
                        }"
                    ></div>
                </div>

                <!-- Percent text -->
                <div class="progress-text">
                    {{ webSerial.clone_fw_progress.value }}%
                </div>
                </div>

            </div>
        </div>

        <div v-if="clone_msg_box_ask_connect" class="overlay">
            <div class="dialog">
                <div class="dialog-title-question">
                    <i class="fas fa-question-circle" style="color: white; margin-right: 8px;"></i>
                    Clone Firmware
                </div>
                <div class="dialog-body">
                     <p>This feature requires the devices to be connected to the console. Do you want to connect?</p>        
                </div>

                <div class="dialog-buttons">
                     <button class="yes" @click="                        
                        clone_msg_box_ask_connect_result = 1;
                        clone_msg_box_ask_connect = false;
                        ">Connect
                    </button>
                    <button class="no" @click="                        
                        clone_msg_box_ask_connect_result = 0;                
                        clone_msg_box_ask_connect = false; 
                        ">Abort
                    </button>
                </div>       
            </div>
        </div>

        <div v-if="clone_msg_box_result" class="overlay">
            <div class="dialog" style="width: 50vw;">
                <div 
                    class="dialog-title"
                    :class="{ 'dialog-title-success': webSerial.clone_fw_status.value == clone_dev_addr_end }"
                    >
                    Clone Firmware
                </div> 
                <div class="dialog-body">                    
                    <template v-if="webSerial.clone_fw_status.value === clone_dev_addr_end">
                        Cloned from device {{ webSerial.clone_fw_dev.value - 1 }} to device {{ webSerial.clone_fw_dev.value }} successfully.
                    </template>

                    <template v-else>
                        Cloning failed at device {{ webSerial.clone_fw_dev.value }}.
                    </template>
                </div>
                <div class="dialog-buttons">
                    <button class="yes" @click="                                                
                        clone_msg_box_result = false;
                        ">OK
                    </button>
                
                </div>                     
            </div>
        </div>

        <div id="spacer"></div>
        <Footer />
    </div>
    
    <Modal :open="alreadyHasCodeModal.open">
        <template #title>
            Heads up!
        </template>
        <div>You already have code in the editor.</div>
        <div>Do you want to replace it?</div>
        <template #buttons>
            <div class="flex space-x-2">
                <Button class="w-full" @click.native="alreadyHasCodeModal.yes()">
                    Yes
                </Button>
                <Button class="w-full" type="secondary" @click.native="alreadyHasCodeModal.no()">
                    No
                </Button>
            </div>
        </template>
    </Modal>
              
    <Modal :open="downloadModal.open">
        <template #title>
            Download
        </template>
        <div>
            <div class="mb-2">What would you like to name the file?</div>
            <label for="filename">File name</label>
            <input
                v-model="filename"
                :ref="(el) => $refs.filename = el"
                class="mt-2"
                id="filename"
                type="text"
            />
        </div>
        <template #buttons>
            <div class="flex space-x-2">
                <Button :disabled="filename.length === 0" class="w-full" @click.native="downloadModal.download()">
                    Download
                </Button>
                <Button class="w-full" type="secondary" @click.native="downloadModal.cancel()">
                    Cancel
                </Button>
            </div>
        </template>
    </Modal>
    
    <FirmwareModal
        :available-firmware="availableFirmware"
        :open="firmwareModal.open"
        @close="firmwareModal.open = false"
    />

    <DFUModal
        :available-dfu="availableDfu"
        :open="dfuModal.open"
        @close="dfuModal.open = false"
        @eraseall_dms_dfumodal="eraseall_dms_show_confirm_pre"
    />
    
    <ListAllModal
        :code="listAllModal.code"
        :language="language"
        :open="listAllModal.open"
        :text-size="textSize"
        :theme="theme"
        @close="listAllModal.open = false"
    />
    
    <NewAllModal
        :open="newAllModal.open"
        @close="newAllModal.open = false"
        @confirm="webSerial.newAll(); newAllModal.open = false"
    />
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import tippy from 'tippy.js';
import { VAceEditor } from 'vue3-ace-editor';
import useWebSerial from './js/useWebSerial.js';
import mitt from "mitt";

// Components

import MenuBar from './components/MenuBar.vue';
import ToolBar from './components/ToolBar.vue';
import Footer from './components/Footer.vue';
import Button from './components/Button.vue';
import Modal from './components/Modal.vue';
import FirmwareModal from './components/FirmwareModal.vue';
import DFUModal from './components/DFUModal.vue';
import LogPanel from './components/LogPanel.vue';
import RegionsPanel from "./components/RegionsPanel.vue";
import HistoryPanel from './components/HistoryPanel.vue';
import AboutPanel from './components/AboutPanel.vue';
import ListAllModal from "./components/ListAllModal.vue";
import NewAllModal from "./components/NewAllModal.vue";

// Const
const GHI_VID = 0x1B9F;
const DL_PID = 0xF300;
const MB_PID = 0xF301;
// Refs

const $refs = { editor: null, filename: null, input: null, progress: null };

// Data

const availableFirmware = reactive({});
const availableDfu = reactive({});
const recordModeCode = ref('');
const directModeCode = ref('');
const lastRecordModeCode = ref('');
const editorLine = ref(1);
const editorColumn = ref(1);
const filename = ref('');
const language = ref('duelink');
const theme = ref('light');
const textSize = ref(16);

const percent_tmp = ref(0);
const sel_devaddr = ref(1);

const eraseall_dms_msgbox_confirm_final = ref(false);
const eraseall_dms_msgbox_confirm_pre = ref(false);
const eraseall_dms_msgbox_finished = ref(false);

const update_driver_msgbox_confirm_pre = ref(false);
const update_driver_msgbox_confirm_final = ref(false);
const update_driver_msgbox_progress = ref(false);
const connect_msgbox_progress = ref(false);

const sel_cmd_msgbox = ref(false);

const do_clone_fw_pre = ref(false);
const clone_dev_addr_start = ref(1);
const clone_dev_addr_end = ref(2);
const clone_dev_addr_num = ref(1);
const clone_msg_box_progress = ref(false);
const clone_msg_box_ask_connect= ref(false);
const clone_msg_box_ask_connect_result = ref(0);
const clone_msg_box_result = ref(0);






const ERASE_ALL_DMS_CONFIRM_FINAL_TEXT = "Firmware detected.\nAre you sure you want to erase all and enter DFU mode?";
const dms_confirm_final_text = ref(ERASE_ALL_DMS_CONFIRM_FINAL_TEXT);

const do_update_driver_confirm_final_text1 = ref("");
const do_update_driver_confirm_final_text2 = ref("");
const do_update_driver_confirm_final_text3 = ref("");

const firmwareMatches = ref(false);

function onFirmwareMatches(value) {
  firmwareMatches.value = value;
}

// Emitter

const emitter = mitt();

emitter.on('erased', () => {
    recordModeCode.value = '';
});

emitter.on('listAllResult', (data) => {
    if (data.result.length === 1 && data.result[0] === '>') {
        data.result = [];
    }
    listAllModal.code = data.result.join("\n");
    listAllModal.open = true;
});

emitter.on('regionSelected', () => sendList(null));

// Setup

const webSerial = useWebSerial($refs, emitter);

const tippyConfig = {
    animation: 'fade',
    appendTo: document.body,
    interactive: true,
    placement: 'bottom',
    theme: 'light',
};

const alreadyHasCodeModal = reactive({
    lines: [],
    list: false,
    open: false,
    target: null,
    async yes() {
        if (this.list) {
            this.list = false;
            webSerial.list((lines) => {
                if (lines.length) {
                    recordModeCode.value = lines.join('\n');
                } else{
                    recordModeCode.value = ''
                }
            });
        }
        if (this.lines.length) {
            recordModeCode.value = this.lines.join('\n');
            this.lines = [];
        }
        this.open = false;
        this.fixTippy();
    },
    async no() {
        if (this.list) {
            this.list = false;
            // This call will create output.
            // TQD: don't do anything since select no
            // webSerial.list();
        }
        this.open = false;
        this.fixTippy();
    },
    fixTippy() {
        if (this?.target?._tippy) {
            this.target._tippy.destroy();
            setTimeout(() => {
                tippyConfig.theme = theme.value;
                tippy(this.target, tippyConfig)
            }, 200);
        }
    },
});


const firmwareModal = reactive({
    open: false,
    toggleCounter: 0,
    start() {
        if (webSerial.isConnected) {
            webSerial.disconnect();
        }
        //this.open = true;
        this.toggleCounter++;
    },
});

const dfuModal = reactive({
    open: false,
    toggleCounter: 0,
    start() {
        if (webSerial.isConnected) {
            webSerial.disconnect();
        }
        //this.open = true;
        this.toggleCounter++;

        //console.log("Increased dfuModal.toggleCounter: " + this.toggleCounter)

    }
});

const downloadModal = reactive({
    open: false,
    start() {
        this.open = true;
        nextTick(() => $refs.filename.focus());
    },
    download() {
        download(filename.value);
        this.cancel();
    },
    cancel() {
        filename.value = '';
        this.open = false;
    },
});

const listAllModal = reactive({
    open: false,
    code: null,
});

const newAllModal = reactive({
    open: false,
});

let editor = null;
let tippyInstances = [];

// Computed

const canDownload = computed(() => recordModeCode.value.length > 0);
const canPlay = computed(() => recordModeCode.value !== '' && recordModeCode.value === lastRecordModeCode.value && !webSerial.isPlaying.value);
const canRecord = computed(() => recordModeCode.value.length > 0 && recordModeCode.value !== lastRecordModeCode.value);
const canStop = computed(() => !webSerial.isStopped.value);
const disabled = computed(() => !webSerial.isConnected.value || webSerial.isBusy.value || webSerial.isTalking.value);

// Watch

watch(() => webSerial.isConnected, (value) => {
    const el = document.getElementById('plugBtn');
    if (el) {
        updateTippy(el);
    }
    // When disconnected, re-enable record button.
    if (!value) {
        lastRecordModeCode.value = '';
    }
});

// Created

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    theme.value = 'dark';
    tippyConfig.theme = 'dark';
}

loadDfu()

// Mounted
function ClickAnyWhereCallback(event) {  
    if (dfuModal.toggleCounter === 1) {
        dfuModal.open = true
        dfuModal.toggleCounter = 0
        // console.log("Reset dfuModal.toggleCounter: " + dfuModal.toggleCounter )
    }
    else {
        dfuModal.open = false
    }   
}

onMounted(() => {
    tippyInstances = tippy('[data-tippy-content]', tippyConfig);
    
    window.onbeforeunload = function() {
        if (recordModeCode.value) {
            return false;
        }
    }

    document.addEventListener('click', ClickAnyWhereCallback);
});

// Methods

async function demo(lines) {
    console.log('demo');
    if (recordModeCode.value) {
        alreadyHasCodeModal.lines = lines.slice(0);
        alreadyHasCodeModal.open = true;
    } else {
        recordModeCode.value = lines.join('\n');
    }
}

function download(filename) {
    if (!recordModeCode.value.length || !filename.length) {
        return;
    }
    const blob = new Blob([recordModeCode.value], { type: 'text/csv' });
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = `${filename}.txt`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

async function loadDfu() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/ghi-electronics/duelink-website/refs/heads/dev/static/duelink-fw.json');
        const jsonData = await response.json();
        
        Object.keys(jsonData).forEach((key) => {
            availableDfu[key] = jsonData[key];
            availableDfu[key].isGlb = false;
            availableDfu[key].image = null;
        });
    } catch (error) {
        console.log(error);
    }
}


function onEditorInit(instance) {
    instance.setShowPrintMargin(false);
    instance.setOptions({
        fontSize: textSize.value + 'px'
    });
    instance.session.selection.on('changeCursor', () => {
        const pos = instance.getCursorPosition();
        editorLine.value = pos.row + 1;
        editorColumn.value = pos.column + 1;
    });
    editor = instance;
}

function onLoad(lines) {
    if (recordModeCode.value) {
        alreadyHasCodeModal.lines = lines.slice(0);
        alreadyHasCodeModal.open = true;
    } else {
        recordModeCode.value = lines.join('\n');
    }
}

async function sendRecordMode() {
    console.log('sendRecordMode');
    lastRecordModeCode.value = recordModeCode.value;
    webSerial.record(recordModeCode.value);
}

async function sendDirectMode() {
    console.log('sendDirectMode');
    webSerial.execute(directModeCode.value.replace(/\t/gm, ' '));
}

async function sendEscape() {
    console.log('sendEscape');
    webSerial.sendescape();
}

async function sendList(target) {
    if (webSerial.update_driver_status.value == 0) {
        console.log('[App.vue] sendList');
        if (recordModeCode.value) {
            alreadyHasCodeModal.target = target;
            alreadyHasCodeModal.list = true;
            alreadyHasCodeModal.open = true;
        } else {
            webSerial.list((result) => {
                const code = result.join('\n');
                if (recordModeCode.value !== code) {
                    recordModeCode.value = code;
                    lastRecordModeCode.value = code;
                }
            });
        }
    }
}

async function do_connect() {
    webSerial.connect_status.value = 0;
    webSerial.connection_mode.value = 0; // regular mode
    webSerial.update_driver_status.value = 0; // reset update list
    percent_tmp.value = 0;
    webSerial.progress_percent.value = 0;
    const ret = await webSerial.connect();

    if (ret) {
        connect_msgbox_progress.value = true;
        let start = Date.now();
        percent_tmp.value = 0;
        while (webSerial.connect_status.value == 0) {
            await sleep(100); 

            percent_tmp.value = webSerial.progress_percent.value;

            // when percent_tmp.value is 65, get version() then 100
            // if 71 then failed
            if (percent_tmp.value == 71) { // make sure it is stop
                break;
            }
        }

        if (webSerial.connect_status.value > 0) {
            percent_tmp.value = 100;
            await sleep(100); 
        }
        
        connect_msgbox_progress.value = false;
        percent_tmp.value = 0;
        await sleep(100); // make sure connect_msgbox_progress is off
    }

}

async function eraseall_dms_show_confirm_pre() {
    if (webSerial.update_devaddr.value != 1 || sel_devaddr.value != 1) {
        let v = webSerial.update_devaddr.value;
        if (sel_devaddr.value != 1){
            v = sel_devaddr.value;
        }
        //alert(`The selected device {${v}} is not the first in the chain. Firmware updates are supported only for the first device. Please select the first device and continue.`);
        //dfuModal.open = false
          
    }
   

    dfuModal.open = false
    eraseall_dms_msgbox_confirm_pre.value = true  
}

async function eraseall_dms_show_connect() {
   
    webSerial.eraseall_status_dms.value = 0;
    
    
    if (webSerial.isConnected.value == false) {
        webSerial.eraseall_vid_dms.value = 0;

        webSerial.connection_mode.value = 2; // erase all
        await webSerial.eraseall_dms_connect();
        
        while (webSerial.eraseall_status_dms.value == 0) {
            await sleep(100);
        }

        await sleep(100);
    }

    if ( webSerial.eraseall_vid_dms.value != 0){
        let pid = webSerial.eraseall_vid_dms.value & 0xFFFF
        if (pid == DL_PID) {
            dms_confirm_final_text.value = "DUELink "  + ERASE_ALL_DMS_CONFIRM_FINAL_TEXT;
        }
        else {
            dms_confirm_final_text.value = "MicroBlocks "  + ERASE_ALL_DMS_CONFIRM_FINAL_TEXT;
        }

        eraseall_dms_msgbox_confirm_final.value = true;
    }
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Erase all
async function do_eraseall_dms_pre_no() {
    eraseall_dms_msgbox_confirm_pre.value = false;
    dfuModal.start();
}

async function do_eraseall_dms_pre_yes() {
    eraseall_dms_msgbox_confirm_pre.value = false;

    eraseall_dms_show_connect();
    
}

async function do_eraseall_dms_final_no() {
    eraseall_dms_msgbox_confirm_final.value = false;

    if (webSerial.eraseall_status_dms.value > 0) {
        await webSerial.disconnect();
    }

    await sleep(250);
     
    dfuModal.start();

}

async function do_eraseall_dms_final_yes() {
    eraseall_dms_msgbox_confirm_final.value = false;
    
    await webSerial.eraseall_dms_execute();
    
    while (webSerial.eraseall_status_dms.value < 2) {
        await sleep(250);
    }

    await sleep(250);
    eraseall_dms_msgbox_finished.value = true;


}

async function sel_cmd_msgbox_show() {
    sel_cmd_msgbox.value = true;
}

async function do_sel_cmd_msgbox_yes() {
    if (sel_devaddr.value != webSerial.update_devaddr.value) {
        webSerial.update_devaddr.value = sel_devaddr.value;

        if (webSerial.isConnected) {
            await webSerial.disconnect();
        }
    }

    sel_cmd_msgbox.value = false;
}

async function do_sel_cmd_msgbox_no() {
    sel_devaddr.value = webSerial.update_devaddr.value;
    sel_cmd_msgbox.value = false;
}

// Driver update
async function do_update_driver_menubar(params) {
    if (webSerial.isConnected.value) {
        // Disconnect, we need to reconnect again because need get driver ver, pid....
        webSerial.disconnect();

        await sleep(100); 
    }

    update_driver_msgbox_confirm_pre.value = true;
    
}

async function do_update_driver_pre_yes() {

    update_driver_msgbox_confirm_pre.value = false;

    if (!webSerial.isConnected.value) {
        webSerial.device_name.value = "";
        webSerial.driver_ver.value = "";
        webSerial.progress_percent.value = 0;
        percent_tmp.value = 0;
        webSerial.update_driver_status.value = 0;
        //let tmp = webSerial.isBusy.value;
        //webSerial.isBusy.value = true;
       
        webSerial.connection_mode.value = 1; // driver mode
        sel_devaddr.value = webSerial.update_devaddr.value;
        const ret = await webSerial.driver_connect();

        if (ret) {

            connect_msgbox_progress.value = true;
            let start = Date.now();
            percent_tmp.value = 0;

            while (webSerial.update_driver_status.value == 0) {
                await sleep(100);

                //percent_tmp.value = Math.floor((((Date.now() - start) / 4000) * 100));

                //if (percent_tmp.value > 95)
                //    percent_tmp.value = 95;
                percent_tmp.value = webSerial.progress_percent.value;
            }

            await sleep(100);

            if (webSerial.update_driver_status.value == 1) { // user select connected
                
                let connected = false;
                const expire = Date.now() + 4000;
                while (!webSerial.isConnected.value || webSerial.device_name.value == "" || webSerial.driver_ver.value=="") {
                    await sleep(100);
                    if (Date.now() > expire) {
                        break;
                    }
                    //percent_tmp.value = Math.floor((((Date.now() - start) / 4000) * 100));

                    //if (percent_tmp.value > 95)
                    //    percent_tmp.value = 95;
                    percent_tmp.value = webSerial.progress_percent.value;
                }

                if (webSerial.isConnected.value && Date.now() < expire ){
                    connected = true;
                }

                if (connected) {
                    //do_update_driver_confirm_final_text1.value = webSerial.device_name.value + " detected. FW version: " + webSerial.version.value + ". Driver script version: " + webSerial.driver_ver.value
                    do_update_driver_confirm_final_text1.value = "Device Name: " + webSerial.device_name.value
                    
                    if (webSerial.driver_ver.value == "" || webSerial.driver_ver.value == "N/A")
                        do_update_driver_confirm_final_text2.value = "Driver Script Version: " + webSerial.driver_ver.value
                    else
                        do_update_driver_confirm_final_text2.value = "Driver Script Version: " + Number(webSerial.driver_ver.value).toFixed(1) 
                    do_update_driver_confirm_final_text3.value = "Firmware Version: " + webSerial.version.value;// + "-" +  (firmwareMatches.value)


                    update_driver_msgbox_confirm_final.value = true;

                    percent_tmp.value = 100;
                }
            }

            connect_msgbox_progress.value = false;
            percent_tmp.value = 0;

            //webSerial.isBusy.value = tmp;
        }
        
         
    }
    
}

async function do_update_driver_final_yes() {

    update_driver_msgbox_confirm_final.value = false; 
   
    update_driver_msgbox_progress.value = true;
    webSerial.progress_percent.value = 0;
    percent_tmp.value = 0;

    webSerial.driver_update(); // no await because just send message

    while (webSerial.progress_percent.value !=100) {
        await sleep(1);
        percent_tmp.value = webSerial.progress_percent.value;
    }

    // reset every thing
    
    webSerial.update_driver_status.value = 0;

    // return to normal state: Disconnect
    await webSerial.disconnect();
    await sleep(10);

}

async function do_update_driver_pre_no() {   
     if (webSerial.isConnected.value) {
        // Disconnect, we need to reconnect again because need get driver ver, pid....
        webSerial.disconnect();

         await sleep(100); 
    } 
    update_driver_msgbox_confirm_pre.value = false;
    
}

async function do_update_driver_final_no() {    
    if (webSerial.isConnected.value) {
        // Disconnect, we need to reconnect again because need get driver ver, pid....
        webSerial.disconnect();

        await sleep(100); 
    }

    update_driver_msgbox_confirm_final.value = false;
    
}

async function do_clone_fw() {    
    if (webSerial.isConnected.value == false) {
        
        clone_msg_box_ask_connect_result.value = -1            
        clone_msg_box_ask_connect.value = true

        while (true) {
            if (clone_msg_box_ask_connect_result.value  == 1) {
                await do_connect();

                break
            }
            else if (clone_msg_box_ask_connect_result.value  == 0) {
                 break
            }
            await sleep(100); 
        }
    }

    if (webSerial.isConnected.value == false) 
        return

    webSerial.clone_fw_status.value = 0
    do_clone_fw_pre.value = true

    await sleep(100); 
}

async function do_clone_fw_pre_yes() {
    //console.log("Clone firmware - yes")
    clone_dev_addr_num.value = clone_dev_addr_start.value - clone_dev_addr_end.value    

    // do clone but no await
    webSerial.do_clone_fw(clone_dev_addr_start.value,clone_dev_addr_end.value)   

    do_clone_fw_pre.value = false

    webSerial.clone_fw_progress.value = 0
    clone_msg_box_progress.value = true;

    // wait for await
    while (webSerial.clone_fw_status.value == 0) {
        await sleep(1000); 
    }
    
    await sleep(100); 
    clone_msg_box_progress.value = false;

    //if (webSerial.clone_fw_status.value == clone_dev_addr_end.value)
    //    console.log("success")
    //else
    //    console.log("failed")
    clone_msg_box_result.value = true
}

async function do_clone_fw_pre_no() {
    //console.log("Clone firmware - no")
    do_clone_fw_pre.value = false
    
    await sleep(100); 
}

function updateTippy(target, show = false) {
    if (!target) {
        return;
    }
    nextTick(() => {
        if (target._tippy) {
            target._tippy.setContent(target.getAttribute('data-tippy-content'));
            if (show) {
                target._tippy.show();
            }
        } else {
            tippyConfig.theme = theme.value;
            tippy([target], tippyConfig);
        }
    });
}

function updateTippyTheme() {
    tippyInstances.forEach((instance) => instance.setProps({ theme: theme.value }));
}

function textSizePlus() {
    textSize.value += 4;
    if (textSize.value > 40) {
        textSize.value = 40;
    }
    editor.setOptions({ fontSize: textSize.value + 'px' });
}

function textSizeMinus() {
    textSize.value -= 4;
    if (textSize.value < 12) {
        textSize.value = 12;
    }
    editor.setOptions({ fontSize: textSize.value + 'px' });
}

function onDeviceNumberBlur() {
    if (!webSerial.update_devaddr.value || webSerial.update_devaddr.value < 1 || webSerial.update_devaddr.value > 254) {
        webSerial.update_devaddr.value = 1;
    }

    if (!sel_devaddr.value || sel_devaddr.value < 1 || sel_devaddr.value > 254) {
        sel_devaddr.value = 1;
    }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.dialog {
  width: auto;        
  max-width: 75vw;    
  min-width: 200px;
  display: inline-block;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  overflow: hidden;      
  font-family: Arial, sans-serif;
  background-color: white;  /* Add white background here */
}

.dialog-title {
  background-color: #d9534f;  /* green background */
  color: white;                /* white text */
  padding: 10px;
  font-weight: bold;
  font-size: 1.1em;
}

.dialog-title-question {
  background-color: #d9534f;  /* green background */
  color: white;                /* white text */
  padding: 10px;
  font-weight: bold;
  font-size: 1.1em;
  text-align: left;
}

.dialog-title-success {
  background-color: #4CAF50;  /* green background */
  color: white;                /* white text */
  padding: 10px;
  font-weight: bold;
  font-size: 1.1em;
}

/* Remove bottom margin on dialog-body and buttons */
.dialog-body {
  background-color: white;
  color: black;
  padding: 15px;
  margin-bottom: 0;  /* prevent extra space */
}
.dialog-buttons {
  margin-top: 0;       /* remove top margin */
  padding: 10px 0 15px 0; /* keep vertical padding */
  display: flex;
  justify-content: center;
  gap: 20px;
  background-color: white;
}

/* Base button styles */
.dialog-buttons button {
  padding: 5px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
}

/* Hover effect for all buttons */
.dialog-buttons button:hover {
  filter: brightness(0.9);
}

/* Your specific button colors */
button.yes {
  background: #d9534f;
  color: white;
}

button.no {
  background: #ccc;
  color: black;
}

button.ok {
  background: #d9534f;
  color: white;
}

.update-driver-progress-container {
  width: 100%;
  height: 20px;
  background-color: #555;   /* visible background */
  border-radius: 4px;
  overflow: hidden;
}

.update-driver-progress-bar {
  height: 100%;
  width: 0%;
  background-color: #4caf50; /* green bar */
  transition: width 0.3s ease;
}
</style>
