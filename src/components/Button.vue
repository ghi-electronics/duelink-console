<template>
    <button :class="['btn', type]" type="button">
        <slot />
    </button>
</template>

<script setup>
// Props

defineProps({
    type: {
        type: String,
        default: 'primary',
    },
});
</script>
