<template>
    <div id="menu-bar" class="p-2 flex items-center space-x-8">
        <div class="flex items-center space-x-2">
            <svg id="logo" class="h-6 w-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 266" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="display: block; transform: scale(1,-1)" >
                <g transform="translate(0, 400) scale(1, -1) rotate(0 0 0)" fill="currentColor" stroke="none">
                    <path d="M1132.1,156.6H643.8c0,0,0-0.1,0-0.1H137c-28.8,59.1-38.2,119.4-23.4,181.1l103.8,0
				c71.1,0,87.3-132.9-0.2-118.4l-16.7,81.5l-39.4,0.2l21-109.1l2.3-0.6c195-39.1,160.1,179.8,29.1,179.4l-89.5,0.3
				c3.7,9.8,8,19.6,13,29.4h506.7c0-0.1,0.1-0.2,0.1-0.3h486.7c19.4-37,30.4-78.9,30.4-123.2C1161,233.7,1150.6,192.9,1132.1,156.6z
				 M477.3,313.7c-15.6,82.2-149.3,72.5-137.2-0.5l20.6-124h40.5l-19.3,103.4c-11.2,60.1,50.4,60.4,59.6,11.8l21.9-115.2H501
				L477.3,313.7z M617.9,334.3l-7.5,34.7H501l21.1-109.4h102.3l-6.8,32.9h-62.9l-8.4,41.8H617.9z M672,223.5H528.4l6.8-34.3
				l143.2-0.2L672,223.5z M779.5,371.3h-98.9L712,189.1h35.3l-25.5,148.1h63.6L779.5,371.3z M833.9,371.3h-35.3l22.8-132.2h35.3
				L833.9,371.3z M843.5,222.7h-0.2c-9.6,0-16.9-7.3-16.9-18.9c0.2-13.2,9.6-22.2,20.4-22.2c10.3,0,17.7,7.6,17.7,19.2
				C864.4,214.5,854.8,222.7,843.5,222.7z M985.6,294.6l-13.3,76.8H937l12.5-73.3c0.7-4.6,1.2-10,1.2-14.9c0-9.2-2.9-15.7-11.8-15.7
				c-11.5,0-25,15.9-29.9,45.1L899,371.3h-35.3l15.2-89.2c2.9-16.8,4.9-31.4,6.4-43h31.4l-2.5,21.9h0.5
				c11.3-17.3,26.3-24.9,42.2-24.9c19.6,0,30.7,13.2,30.7,36C987.6,278.1,986.6,288.1,985.6,294.6z M1117.9,371.3h-39.3l-21.1-56.5
				l-13.3,14.1l-7.4,42.4h-35.1l32.9-191.9h35.1l-19.6,114.9h0.5c3.7-5.1,7.4-10.3,10.8-15.1l30.7-40h43.4l-51,54.3L1117.9,371.3z"/>
                </g>
            </svg>
            
        </div>
        <div class="flex items-center space-x-4">
            <a href="https://duelink.com" target="_blank">Docs</a>
            <Menu :options="demoOptions" id="demo">Demos</Menu>
            <Menu :options="firmwareOptions" id="firmware">
                Firmware
            </Menu>
            <a @click.prevent="$emit('update_driver_menubar')">Driver</a>                      
            <a
                class="text-sm"
                :data-tippy-content="theme === 'dark' ? 'Light' : 'Dark'"
                @click.prevent="toggleDarkMode"
            >
                <i :class="theme === 'dark' ? 'fa-sun' : 'fa-moon'" class="fas fa-fw pointer-events-none"></i>
            </a>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { computed } from 'vue';
// Components

import Menu from './Menu.vue';
import Button from './Button.vue';

// Emits

const $emit = defineEmits(['demo', 'dfu', 'update:theme', 'updateTippy','update_driver_menubar','clone_fw']);

// Props

const props = defineProps({
    theme: String,
});

// Data

const demoOptions = ref([]);

const firmwareOptions = [
    {
        label: 'Update Firmware',
        click: () => {
            $emit('dfu')
        }
    },
    {
        label: 'Clone Firmware',
        click: () => {
            $emit('clone_fw')
        }
    }
]

// Created

loadDemos();

// Methods

async function loadDemos() {
    try {
        const response = await fetch('/demos.json');
        const jsonData = await response.json();
    
        demoOptions.value = jsonData.map((demo) => {
            if (demo?.url) {
                return {
                    label: demo.label,
                    click: () => window.open(demo.url, '_blank'),
                    href: demo.url,
                };
            } else {
                return {
                    label: demo.label,
                    click: () => $emit('demo', demo.code),
                };
            }
        });
    } catch (error) {
        console.log(error);
    }
}


function toggleDarkMode(event) {
    if (props.theme === 'dark') {
        $emit('update:theme', 'light');
        localStorage.theme = 'light';
        document.documentElement.style.colorScheme = 'light';
        document.documentElement.classList.remove('dark');
    } else {
        $emit('update:theme', 'dark');
        localStorage.theme = 'dark';
        document.documentElement.style.colorScheme = 'dark';
        document.documentElement.classList.add('dark');
    }
    $emit('updateTippy', event.target, true);
}

</script>
