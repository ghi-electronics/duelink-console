<template>
    <Modal :open="open" max-width-class="sm:max-w-2xl">
        <template #title> List All </template>
        <template #default>
            <div id="list-all-editor" class="mt-4">
                <VAceEditor
                    :lang="language"
                    :theme="theme === 'dark' ? 'tomorrow_night_bright' : 'crimson_editor'"
                    v-model:value="code"
                    style="height: 300px"
                    @init="onEditorInit"
                />
            </div>
        </template>
        <template #buttons>
            <div class="flex space-x-2">
                <Button type="secondary" @click.native="$emit('close')">
                    Close
                </Button>
            </div>
        </template>
    </Modal>
</template>

<script setup>
import { VAceEditor } from "vue3-ace-editor";

// Components

import Modal from "./Modal.vue";
import Button from "./Button.vue";

// Emits

const $emit = defineEmits(["close"]);

// Props

const props = defineProps({
    code: String,
    language: String,
    open: Boolean,
    textSize: Number,
    theme: String,
});

// Methods

function onEditorInit(instance) {
    instance.setShowPrintMargin(false);
    instance.setOptions({ fontSize: props.textSize + 'px' });
    instance.setReadOnly(true);
    instance.setHighlightActiveLine(false);
}
</script>
