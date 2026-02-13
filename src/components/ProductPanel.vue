<template>
    <!-- Hide panel completely if no product link -->
    <div v-if="productLink" class="bg-white dark:bg-gray-800 
         border border-gray-200 dark:border-gray-700
         shadow-sm rounded p-3 text-center
         text-gray-800 dark:text-gray-200">
        <div class="flex justify-center mt-2">
            <img :src="productLink" alt="Product Image" class="max-w-full max-h-64 object-contain rounded"
                @error="onImageError" />
        </div>
        <div v-if="productDetailLink" class="text-center">
            <a :href="productDetailLink" target="_blank" class="text-blue-600 hover:underline font-medium">
                View Product Details →
            </a>
        </div>

    </div>
    <div class="flex justify-end px-4">
        <a class="mt-4 inline-block w-full sm:w-auto text-center sm:text-left px-4 py-2 font-medium rounded transition bg-slate-300 hover:bg-slate-500 text-slate-600 hover:text-slate-50 dark:bg-zinc-600 dark:hover:bg-zinc-300 dark:text-zinc-100 dark:hover:text-zinc-950"
            href="https://github.com/ghi-electronics/due-console/issues/" target="_blank">
            <i class="fas fa-fw fa-arrow-up-right-from-square mr-1"></i> Report Issue
        </a>
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
