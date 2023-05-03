import './css/main.css';
import 'tippy.js/dist/tippy.css';
import './css/tippy.css';
import { createApp } from 'vue';
import App from './App.vue';
import vClickOutside from 'click-outside-vue3';

import * as ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-crimson_editor';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';

window.ace = ace;

const app = createApp(App);
app.use(vClickOutside);
app.mount('#app');
