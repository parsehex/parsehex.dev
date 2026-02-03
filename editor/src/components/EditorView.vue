<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const type = computed(() => route.params.type as string);
const slug = computed(() => route.params.slug as string | undefined);

// Inbox data passed via query params or history state?
// Let's check history state first, then query.
const initialData = computed(() => {
    if (history.state && history.state.inboxData) {
        return history.state.inboxData;
    }
    return null;
});

const frontmatter = ref<any>({});
const body = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const notification = ref('');

// Dynamic fields management
const knownFields = ref(new Set(['title', 'created', 'tags', 'thoughts', 'references'])); // Added references
const newFieldKey = ref('');

const customFields = computed(() => {
    return Object.keys(frontmatter.value).filter(k => !knownFields.value.has(k));
});

// References management
const newRefId = ref('');
const newRefDesc = ref('');
const addRef = () => {
    if (!newRefId.value.trim()) return;
    if (!frontmatter.value.references) frontmatter.value.references = [];
    frontmatter.value.references.push({
        full_id: newRefId.value.trim(),
        desc: newRefDesc.value.trim() || undefined
    });
    newRefId.value = '';
    newRefDesc.value = '';
};
const removeRef = (index: number | string) => {
    if (typeof index === 'string') {
        const orig = index;
        index = +index;
        if (Number.isNaN(index)) throw new Error('invalid index value passed: ' + orig);
    }
    if (frontmatter.value.references) {
        frontmatter.value.references.splice(index, 1);
    }
};

const loadFile = async () => {
    if (!slug.value) {
        // New file mode
        frontmatter.value = {
            title: initialData.value?.title || '',
            created: Math.floor(Date.now() / 1000),
            tags: [],
            ...initialData.value?.extra
        };
        // Process initial notes if any
        if (initialData.value?.notes) {
            body.value = initialData.value.notes;
        }
        return;
    }

    loading.value = true;
    try {
        const res = await fetch(`/api/content/${type.value}/${slug.value}`);
        if (!res.ok) throw new Error('Failed to load file');
        const data = await res.json();
        frontmatter.value = data.frontmatter || {};
        body.value = data.body || '';
    } catch (e: any) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
};

const saveFile = async () => {
    saving.value = true;
    error.value = '';
    notification.value = '';

    try {
        if (!slug.value) {
            // Create New
            const res = await fetch('/api/content/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type.value,
                    title: frontmatter.value.title,
                    slug: undefined,
                    tags: Array.isArray(frontmatter.value.tags) ? frontmatter.value.tags.join(',') : frontmatter.value.tags,
                    ...frontmatter.value
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // If created from inbox, delete original
            if (initialData.value?.filename) {
                await fetch('/api/inbox/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: initialData.value.filename,
                        category: initialData.value.category,
                        title: initialData.value.title
                    })
                });
            }

            notification.value = 'Created successfully!';
            // Redirect to edit mode
            router.replace(`/content/${type.value}/${data.slug}`);
        } else {
            // Update Existing
            const res = await fetch(`/api/content/${type.value}/${slug.value}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frontmatter: frontmatter.value,
                    body: body.value
                })
            });
            if (!res.ok) throw new Error('Failed to save');
            notification.value = 'Saved successfully!';
        }

        setTimeout(() => notification.value = '', 3000);
    } catch (e: any) {
        error.value = e.message;
    } finally {
        saving.value = false;
    }
};

const addField = () => {
    if (newFieldKey.value && !frontmatter.value[newFieldKey.value]) {
        frontmatter.value[newFieldKey.value] = '';
        newFieldKey.value = '';
    }
};

const removeField = (key: string) => {
    delete frontmatter.value[key];
};

// Thoughts helpers
const newThought = ref('');
const addThought = () => {
    if (!newThought.value.trim()) return;
    if (!frontmatter.value.thoughts) frontmatter.value.thoughts = [];

    const timestamp = Math.floor(Date.now() / 1000);
    frontmatter.value.thoughts.push({ [timestamp]: newThought.value });
    newThought.value = '';
};

onMounted(loadFile);

// If tags is string (legacy), split it
watch(() => frontmatter.value.tags, (val) => {
    if (typeof val === 'string' && val.includes(',')) {
        frontmatter.value.tags = val.split(',').map(s => s.trim());
    }
});
</script>
<template>
    <div class="max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
                <router-link :to="`/content/${type}`" class="text-gray-400 hover:text-white">&larr; Back</router-link>
                <h2 class="text-xl font-bold"> {{ slug ? `Editing: ${frontmatter.title || slug}` : 'New Entry' }} </h2>
                <span v-if="notification" class="text-green-400 text-sm animate-pulse">{{ notification }}</span>
                <span v-if="error" class="text-red-400 text-sm">{{ error }}</span>
            </div>
            <button @click="saveFile" :disabled="saving"
                class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded flex items-center gap-2 disabled:opacity-50">
                <Save class="w-4 h-4" /> {{ saving ? 'Saving...' : 'Save' }}
            </button>
        </div>
        <div v-if="loading" class="text-center py-10 text-gray-500">Loading...</div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                    <input v-model="frontmatter.title"
                        class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="Entry Title" />
                </div>
                <div class="bg-gray-800 rounded-lg p-1 border border-gray-700 h-[600px] flex flex-col">
                    <textarea v-model="body"
                        class="w-full h-full bg-gray-900 resize-none p-4 text-gray-300 font-mono focus:outline-none"
                        placeholder="Write content here..."></textarea>
                </div>
            </div>
            <!-- Sidebar / Metadata -->
            <div class="space-y-6">
                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
                    <h3 class="font-bold text-gray-400 uppercase text-xs tracking-wider">Metadata</h3>
                    <!-- Created Date -->
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Created</label>
                        <input type="text" :value="new Date((frontmatter.created || 0) * 1000).toLocaleString()"
                            disabled
                            class="w-full bg-gray-900/50 border border-gray-700 rounded px-2 py-1 text-sm text-gray-500" />
                    </div>
                    <!-- Tags -->
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Tags</label>
                        <input :value="Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : frontmatter.tags"
                            @input="e => frontmatter.tags = (e.target as HTMLInputElement).value.split(',').map(s => s.trim())"
                            class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                            placeholder="comma, separated" />
                    </div>
                    <!-- Dynamic Fields -->
                    <div v-for="key in customFields" :key="key" class="relative group">
                        <label class="block text-xs text-gray-500 mb-1 capitalize">{{ key }}</label>
                        <div class="flex gap-2">
                            <input v-model="frontmatter[key]"
                                class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white" />
                            <button @click="removeField(key)"
                                class="text-red-500 opacity-0 group-hover:opacity-100 transition">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <!-- Add Field -->
                    <div class="pt-2 border-t border-gray-700 flex gap-2">
                        <input v-model="newFieldKey" placeholder="New field name"
                            class="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
                            @keyup.enter="addField" />
                        <button @click="addField" class="bg-gray-700 hover:bg-gray-600 px-2 rounded">
                            <Plus class="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <!-- References -->
                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
                    <h3 class="font-bold text-gray-400 uppercase text-xs tracking-wider">References</h3>
                    <div class="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                        <div v-for="(ref, idx) in frontmatter.references" :key="idx"
                            class="bg-gray-900/50 p-2 rounded flex justify-between items-start group">
                            <div class="text-sm">
                                <div class="text-blue-400 font-medium break-all">{{ ref.full_id }}</div>
                                <div class="text-xs text-gray-500 italic" v-if="ref.desc">{{ ref.desc }}</div>
                            </div>
                            <button @click="removeRef(idx)"
                                class="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                <Trash2 class="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <input v-model="newRefId" placeholder="full_id (e.g. movies:matrix)"
                            class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300" />
                        <div class="flex gap-2">
                            <input v-model="newRefDesc" placeholder="desc (optional)"
                                class="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300"
                                @keyup.enter="addRef" />
                            <button @click="addRef" class="bg-blue-600 hover:bg-blue-500 px-2 rounded text-white">
                                <Plus class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Thoughts -->
                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
                    <h3 class="font-bold text-gray-400 uppercase text-xs tracking-wider">Thoughts</h3>
                    <div class="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                        <div v-for="(thought, idx) in frontmatter.thoughts" :key="idx"
                            class="text-sm bg-gray-900/50 p-2 rounded">
                            <div class="text-gray-300">{{ Object.values(thought)[0] }}</div>
                            <div class="text-xs text-gray-600 mt-1">{{ new Date(parseInt(Object.keys(thought)[0]) *
                                1000).toLocaleString() }}</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <input v-model="newThought" placeholder="Add a thought..."
                            class="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                            @keyup.enter="addThought" />
                        <button @click="addThought" class="bg-blue-600 hover:bg-blue-500 px-2 rounded text-white">
                            <Plus class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
