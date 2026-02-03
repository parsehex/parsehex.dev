<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const isDashboard = () => route.path === '/' || route.path === '/dashboard'

const goInbox = () => router.push('/inbox')
const goProjects = () => router.push('/content')
const goDashboard = () => router.push('/')

</script>
<template>
  <div class="min-h-screen bg-gray-900 text-white font-sans">
    <header
      class="border-b border-gray-800 p-4 flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur z-50">
      <h1 class="text-xl font-bold flex items-center gap-2 cursor-pointer" @click="goDashboard">
        <span class="text-blue-500">◆</span>
        <pre>parsehex.dev</pre> (editor)
      </h1>
      <nav class="flex gap-2">
        <button @click="goDashboard"
          :class="['px-3 py-1 rounded text-sm', isDashboard() ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white']">
          Dashboard </button>
        <button @click="goInbox"
          :class="['px-3 py-1 rounded text-sm', route.path.startsWith('/inbox') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white']">
          Inbox </button>
      </nav>
    </header>
    <main class="p-6">
      <!-- Dashboard View (Inline) -->
      <div v-if="isDashboard()" class="max-w-4xl mx-auto animate-fade-in">
        <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div @click="goInbox"
            class="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition group">
            <h3 class="text-xl font-semibold mb-2 group-hover:text-blue-400 transition">Inbox</h3>
            <p class="text-gray-400">Manage incoming items, notes, and ideas.</p>
          </div>
          <div @click="goProjects"
            class="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition group">
            <h3 class="text-xl font-semibold mb-2 group-hover:text-blue-400 transition">Content</h3>
            <p class="text-gray-400">Browse and manage projects, shows, and other content.</p>
          </div>
        </div>
      </div>
      <!-- Router View -->
      <router-view v-else></router-view>
    </main>
  </div>
</template>
<style>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1f2937;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
