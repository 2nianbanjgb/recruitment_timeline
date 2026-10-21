import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ToastProvider } from './components/Toast'
import { EventsProvider } from './store/useEvents'
import { TodosProvider } from './store/useTodos'
import { SettingsProvider } from './store/useSettings'
import { hydrateFromServer } from './lib/sync'

const container = document.getElementById('root')
if (!container) throw new Error('缺少 #root 挂载点')

async function boot() {
  // 本地文件比浏览器新时，先把文件内容灌回来再渲染，避免首屏闪一下旧数据。
  await hydrateFromServer()

  createRoot(container!).render(
    <StrictMode>
      <ToastProvider>
        <EventsProvider>
          <TodosProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </TodosProvider>
        </EventsProvider>
      </ToastProvider>
    </StrictMode>,
  )
}

void boot()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA 注册失败不影响主功能
    })
  })
}
