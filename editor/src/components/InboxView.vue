<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Package } from 'lucide-vue-next';
import InboxFileSection from './InboxFileSection.vue';

const inboxFiles = ref<any[]>([]);
const loading = ref(true);
const selectedTypes = ref<Set<string>>(new Set());

const fetchInbox = async () => {
    loading.value = true;
    try {
        const res = await fetch('/api/inbox');
        inboxFiles.value = await res.json();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const allTypes = computed(() => {
    return inboxFiles.value.map(f => f.filename.replace(/\.(yaml|yml)$/, '')).sort();
});

const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes.value);
    if (newSet.has(type)) newSet.delete(type);
    else newSet.add(type);
    selectedTypes.value = newSet;
};

const visibleFiles = computed(() => {
    if (selectedTypes.value.size === 0) return inboxFiles.value;
    return inboxFiles.value.filter(f => selectedTypes.value.has(f.filename.replace(/\.(yaml|yml)$/, '')));
});

onMounted(fetchInbox);

const noItemsLabel = inboxFiles.value.length === 0 ? 'Inbox is empty.' : 'No lists match your selection.';
</script>
<template>
    <div class="space-y-6">
        <!-- Header & Filters -->
        <div class="flex flex-col gap-4">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-bold flex items-center gap-2">
                        <Package class="w-6 h-6" /> Inbox
                    </h2>
                    <div class="flex flex-wrap gap-2" v-if="allTypes.length > 0">
                        <button v-for="t in allTypes" :key="t" @click="toggleType(t)"
                            :class="['px-4 py-2 rounded text-sm font-medium border transition capitalize',
                                selectedTypes.has(t) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300']">
                            {{ t }} </button>
                    </div>
                </div>
                <button @click="fetchInbox"
                    class="text-sm text-gray-400 hover:text-white whitespace-nowrap">Refresh</button>
            </div>
        </div>
        <div v-if="loading" class="text-gray-400">Loading inbox...</div>
        <div v-else-if="visibleFiles.length === 0" class="text-gray-500 italic"> {{ noItemsLabel }} </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            <InboxFileSection v-for="file in visibleFiles" :key="file.filename" :filename="file.filename"
                :data="file.data" />
        </div>
    </div>
</template>
