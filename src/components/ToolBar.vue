<template>
     <div id="tool-bar" class="p-2 flex items-center space-x-2 overflow-x-auto">
        <!--Group 1-->
        
        <Button
            id="plugBtn"
            :disabled="isBusy"
            :class="['tool', isConnected ? 'connected' : '']"
            :data-tippy-content="isConnected ? 'Disconnect' : 'Connect'"
            @click.native="onPlug"
        >
            <i :class="isConnected ? 'fa-plug-circle-xmark' : 'fa-plug'" class="fas fa-fw"></i> 🡆 {{ deviceAddress }}
        </Button>
        <Button
            :disabled="isBusy || isConnected"
            class="tool"
            data-tippy-content="Select module address"
            @click.native="$emit('sel_cmd')"
        >
            Sel
        </Button>
        
         <!--Group 2-->
        
        <Button
            :disabled="isBusy || !isConnected || isTalking || !canRecord"
            class="tool record"
            data-tippy-content="Record"
            @click.native="$emit('record')"
        >
            <i class="fas fa-fw fa-circle"></i>
        </Button>
        <Button
            :disabled="isBusy || !isConnected || isTalking || !canPlay"
            class="tool play"
            data-tippy-content="Play"
            @click.native="$emit('play')"
        >
            <i class="fas fa-fw fa-play"></i>
        </Button>
        <Button
            :disabled="isBusy || !isConnected || !canStop"
            class="tool stop"
            data-tippy-content="Stop"
            @click.native="$emit('stop')"
        >
            <i class="fas fa-fw fa-square"></i>
        </Button>
        

        <!--Group 3-->
        
        <Button
            :disabled="isBusy || !isConnected || isTalking || !canList"
            class="tool"
            data-tippy-content="List"
            @click.native="$emit('list', $event.target)"
        >
            <i class="fas fa-fw fa-list"></i>
        </Button>
        <Button
            :disabled="!canDownload"
            class="tool"
            data-tippy-content="Download"
            @click.native="$emit('download')"
        >
            <i class="fas fa-fw fa-download"></i>
        </Button>
        <label
            :disabled="isBusy"
            class="btn primary tool text-center cursor-pointer"
            data-tippy-content="Load"
            for="file"
        >
            <i class="fas fa-fw fa-upload"></i>
            <input id="file" type="file" class="hidden" @change="onLoad" />
        </label>
       
        <!--Group 4-->
        <Button
            :disabled="isBusy || !isConnected || isTalking || canStop"
            class="tool"
            data-tippy-content="Load driver"
            @click.native="$emit('load_driver')"
        >
            Driver
        </Button>

        <Button
            :disabled="isBusy || !isConnected || isTalking || canStop"
            class="tool"
            data-tippy-content="Load sample"
            @click.native="$emit('load_sample')"
        >
            Sample
        </Button>

        <!--Group 5-->
        
        <Button
            :disabled="!canTextSizePlus"
            class="tool"
            data-tippy-content="Increase text size"
            @click.native="$emit('text-size-plus')"
        >
            <i class="fas fa-fw fa-magnifying-glass-plus"></i>
        </Button>
        <Button
            :disabled="!canTextSizeMinus"
            class="tool"
            data-tippy-content="Decrease text size"
            @click.native="$emit('text-size-minus')"
        >
            <i class="fas fa-fw fa-magnifying-glass-minus"></i>
        </Button>
        


    </div>
</template>

<script setup>
// Components

import Button from './Button.vue';
import { computed } from 'vue';

// Emits

const $emit = defineEmits([
    'connect',
    'disconnect',
    'download',
    'play',
    'stop',
    'record',
    'list',
    'load',
    'sel_cmd',
    'load_driver',
    'load_sample',
]);

// Props

const props = defineProps({
    canDownload: Boolean,
    canList: Boolean,
    canLoad: Boolean,
    canPlay: Boolean,
    canRecord: Boolean,
    canStop: Boolean,
    canTextSizePlus: Boolean,
    canTextSizeMinus: Boolean,
    isBusy: Boolean,
    isConnected: Boolean,
    isTalking: Boolean,
    canEraseAll: Boolean,
    devAdd:Number,
});

// Methods

function onLoad(event) {
    if (!event.target.files.length) {
        return;
    }
    const fr = new FileReader();
    fr.onload = function () {
        $emit('load', fr.result.replace(/\r/gm, '').replace(/\t/gm, ' ').split('\n'));
        event.target.value = '';
    }
    fr.readAsText(event.target.files[0]);
}

function onPlug() {
    if (props.isConnected) {
        $emit('disconnect');
    } else {
        $emit('connect');
    }
}

const deviceAddress = computed(() => {
    if (props.devAdd) {
        //return props.version.substring(0, props.version.length - 1);
        return props.devAdd;
    }
    return 1;
});
</script>
