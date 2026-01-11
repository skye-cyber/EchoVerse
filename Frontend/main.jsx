import React from 'react'
import ReactDOM from 'react-dom/client'
import './src/css/styles.css'
import App from './src/App'

// Hide the loading screen when React mounts
const hideLoadingScreen = () => {
  const loadingWrapper = document.getElementById('loading-wrapper')
  if (loadingWrapper) {
    loadingWrapper.style.opacity = '0'
    setTimeout(() => {
      loadingWrapper.style.display = 'none'
    }, 500)
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Hide loading screen after React is rendered
setTimeout(hideLoadingScreen, 1000)