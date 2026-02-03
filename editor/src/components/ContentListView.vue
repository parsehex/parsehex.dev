<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Folder, FileText, Plus } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const contentTypes = ref<string[]>([]);
const files = ref<any[]>([]);
const loading = ref(false);

const type = ref(route.params.type as string | undefined);

const fetchTypes = async () => {
    const res = await fetch('/api/content');
    contentTypes.value = await res.json();
};

const fetchFiles = async (t: string) => {
    loading.value = true;
    files.value = [];
    try {
        const res = await fetch(`/api/content/${t}`);
        files.value = await res.json();
    } finally {
        loading.value = false;
    }
};

const updateFromRoute = () => {
    type.value = route.params.type as string | undefined;
    if (type.value) {
        fetchFiles(type.value);
    } else {
        fetchTypes();
    }
};

onMounted(updateFromRoute);

watch(() => route.params.type, updateFromRoute);

const selectType = (t: string) => {
    // Pass along any state (like inboxData)
    if (history.state && history.state.inboxData) {
        router.push({
            path: `/content/${t}/new`,
            state: { inboxData: history.state.inboxData }
        });
    } else {
        router.push(`/content/${t}`);
    }
};

const selectFile = (file: any) => {
    router.push(`/content/${type.value}/${file.slug}`);
};

const createNew = () => {
    router.push(`/content/${type.value}/new`);
};
</script>

<template>
    <div class="space-y-6">
        <div v-if="!type">
             <h2 class="text-2xl font-bold flex items-center gap-2 mb-6">
                <Folder class="w-6 h-6" /> Content Types
            </h2>
             <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="t in contentTypes" :key="t"
                     @click="selectType(t)"
                     class="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-750 cursor-pointer transition flex items-center gap-3">
                    <Folder class="w-8 h-8 text-blue-400" />
                    <span class="text-lg font-medium capitalize">{{ t }}</span>
                </div>
            </div>
        </div>

        <div v-else>
            <div class="flex items-center gap-4 mb-6">
                <router-link to="/content" class="text-gray-400 hover:text-white">&larr; Back</router-link>
                <h2 class="text-2xl font-bold flex items-center gap-2 capitalize">
                    <Folder class="w-6 h-6 text-gray-500" /> {{ type }}
                </h2>
                <div class="flex-1"></div>
                <button class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2" @click="createNew">
                    <Plus class="w-4 h-4" /> New Entry
                </button>
            </div>

            <div v-if="loading">Loading files...</div>
            <div v-else-if="files.length === 0" class="text-gray-500">No files found.</div>

            <div v-else class="grid grid-cols-1 gap-2">
                 <div v-for="file in files" :key="file.slug"
                     @click="selectFile(file)"
                     class="bg-gray-800 p-4 rounded border border-gray-700 hover:border-blue-500 hover:bg-gray-750 cursor-pointer transition flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <FileText class="w-5 h-5 text-gray-400" />
                        <div>
                            <div class="font-medium">{{ file.title || file.slug }}</div>
                            <div class="text-xs text-gray-500">{{ file.slug }}</div>
                        </div>
                    </div>
                    <div class="text-sm text-gray-500">
                        {{ new Date(file.created * 1000).toLocaleDateString() }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
