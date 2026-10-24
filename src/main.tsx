import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
// Import i18n trước App để chuỗi đã sẵn sàng ở lần render đầu.
import '@/lib/i18n'
import '@/styles/index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Không tìm thấy phần tử #root trong index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)