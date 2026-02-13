<template>
    <!-- Hide panel completely if no product link -->
    <div v-if="productLink" class="bg-white shadow rounded p-3">
        <div class="flex justify-center mt-2">
            <img :src="productLink" alt="Product Image" class="max-w-full max-h-64 object-contain rounded"
                @error="onImageError" />
        </div>
<div v-if="productDetailLink" class="text-center">
    <a
        :href="productDetailLink"
        target="_blank"
        class="text-blue-600 hover:underline font-medium"
    >
        View Product Details →
    </a>
</div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    productLink: {
        type: String,
        default: ''
    }
})

const imageError = ref(false)

function onImageError() {
    imageError.value = true
}

/*
    Example conversion:
    https://www.duelink.com/img/catalog/mcduestem-b-1.webp
    →
    https://www.duelink.com/docs/products/mcduestem-b
*/
const productDetailLink = computed(() => {
    if (!props.productLink) return ''

    const baseImgPath = 'https://www.duelink.com/img/catalog/'
    const baseDocPath = 'https://www.duelink.com/docs/products/'

    if (!props.productLink.startsWith(baseImgPath)) return ''

    // Extract filename
    let fileName = props.productLink.replace(baseImgPath, '')

    // Remove "-1.webp"
    fileName = fileName.replace(/-1\.webp$/, '')

    return baseDocPath + fileName
})
</script>
