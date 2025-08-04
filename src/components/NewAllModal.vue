<template>
    <Modal :open="open" max-width-class="sm:max-w-xl">
        <template #title> Erase All </template>
        <p>Please confirm you want to erase all regions and code.</p>
        <template #buttons>
            <div class="flex space-x-2">
                <Button type="primary" @click.native="$emit('confirm')">
                    Confirm
                </Button>
                <Button type="secondary" @click.native="$emit('close')">
                    Cancel
                </Button>
            </div>
        </template>
    </Modal>
</template>

<script setup>
// Components

import Modal from "./Modal.vue";
import Button from "./Button.vue";

// Props

const props = defineProps({
    open: Boolean,
});
</script>
