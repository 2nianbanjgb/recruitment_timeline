import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ToastProvider } from './components/Toast'
import { EventsProvider } from './store/useEvents'
import { SettingsProvider } from './store/useSettings'

const container = document.getElementById('root')
if (!container) throw new Error('缺少 #root 挂载点')

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <EventsProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </EventsProvider>
    </ToastProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA 注册失败不影响主功能
    })
  })
}
