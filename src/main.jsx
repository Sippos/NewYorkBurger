import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ShareVideo from './pages/ShareVideo.jsx'

const params = new URLSearchParams(window.location.search)
const isVideoShareTarget = params.get('share-target') === 'videos'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => null)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    {isVideoShareTarget ? <ShareVideo /> : <App />}
  </HashRouter>
)
