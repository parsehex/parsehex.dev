<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Filter } from 'lucide-vue-next';

const props = defineProps<{
	filename: string;
	data: any;
}>();

const router = useRouter();
const selectedCategories = ref<Set<string>>(new Set());

const categories = computed(() => {
	if (!props.data) return [];
	return Object.keys(props.data).filter(k => k !== '_').sort();
});

const toggleCategory = (cat: string) => {
	const newSet = new Set(selectedCategories.value);
	if (newSet.has(cat)) newSet.delete(cat);
	else newSet.add(cat);
	selectedCategories.value = newSet;
};

// Filter data keys based on selection
const filteredData = computed(() => {
	const res: Record<string, any> = {};
	const catsToShow = selectedCategories.value.size > 0
		? Array.from(selectedCategories.value)
		: categories.value;

	catsToShow.forEach(cat => {
		if (props.data[cat]) {
			res[cat] = props.data[cat];
		}
	});
	return res;
});

const createEntry = (entry: any, category: string) => {
	router.push({
		path: '/content',
		state: {
			inboxData: { ...entry, category, filename: props.filename }
		}
	});
};

const displayName = computed(() => props.filename.replace(/\.(yaml|yml)$/, ''));

</script>
<template>
	<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 h-fit">
		<div class="flex flex-wrap items-center gap-2 mb-4">
			<h3 class="text-xl font-bold text-blue-400 capitalize mr-4">{{ displayName }}</h3>
			<!-- Category Filters -->
			<button v-for="cat in categories" :key="cat" @click="toggleCategory(cat)"
				:class="['px-2 py-1 rounded text-xs border transition capitalize flex items-center gap-1',
					selectedCategories.has(cat) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500']"> {{ cat }} </button>
		</div>
		<div class="space-y-6">
			<div v-for="(items, category) in filteredData" :key="category">
				<h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 sticky top-14 bg-gray-800 py-1 z-10">
					{{ category }} </h4>
				<ul class="space-y-2">
					<li v-for="(item, index) in (Array.isArray(items) ? items : Object.entries(items))" :key="index"
						class="flex items-center justify-between bg-gray-900/50 p-3 rounded hover:bg-gray-700/50 group transition">
						<div class="flex-1 min-w-0 pr-4">
							<template v-if="Array.isArray(items)">
								<div v-if="typeof item === 'string'" class="truncate" :title="item">
									<span class="font-medium">{{ item }}</span>
								</div>
								<div v-else>
									<span class="font-medium block truncate">{{ Object.keys(item)[0] }}</span>
									<span class="text-xs text-gray-400 block truncate">{{ Object.values(item)[0] }}</span>
								</div>
							</template>
							<template v-else>
								<span class="font-medium block truncate">{{ item[0] }}</span>
								<span class="text-xs text-gray-400 block truncate">{{ item[1] }}</span>
							</template>
						</div>
						<button @click="createEntry(
							Array.isArray(items)
								? (typeof item === 'string' ? { title: item } : { title: Object.keys(item)[0], notes: Object.values(item)[0] })
								: { title: item[0], notes: item[1] },
							String(category)
						)" class="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition whitespace-nowrap">
							<Plus class="w-3 h-3" /> Create
						</button>
					</li>
				</ul>
			</div>
			<div v-if="Object.keys(filteredData).length === 0" class="text-center text-gray-500 py-4 text-sm"> No items match
				filter. </div>
		</div>
	</div>
</template>
