import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import Draggable from 'vuedraggable'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createId } from './utils'

import App from './App.vue'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $createId: () => string
  }
}

const app = createApp(App)

app.use(createPinia()).use(ElementPlus)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.component('Draggable', Draggable)

app.config.globalProperties.$createId = createId

app.mount('#app')
