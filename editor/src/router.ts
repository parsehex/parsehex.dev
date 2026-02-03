import { createRouter, createWebHistory } from 'vue-router'
import InboxView from './components/InboxView.vue'
import ContentListView from './components/ContentListView.vue'
import EditorView from './components/EditorView.vue'

// Temporary "Pick Type" view for Inbox -> Create flow
// We can just reuse ContentListView but we need to signal it's for picking
// Or we can use a wrapper component.
// For now, let's just route to /content?picker=true or similar?
// Actually simpler: /inbox/create/:filename/:category/:title -> Pick Type -> /content/create/...

const routes = [
	{ path: '/', redirect: '/dashboard' },
	{ path: '/dashboard', component: { template: '<div><!-- Handled in App --></div>' } }, // Dummy for dashboard view in App
	{ path: '/inbox', component: InboxView },
	{ path: '/content', component: ContentListView }, // Select type
	{ path: '/content/:type', component: ContentListView, props: true }, // List files
	{ path: '/content/:type/new', component: EditorView, props: true },
	{ path: '/content/:type/:slug(.*)', component: EditorView, props: true },
]

const router = createRouter({
	history: createWebHistory(),
	routes,
})

export default router
