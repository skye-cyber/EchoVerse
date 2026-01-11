import React from 'react';
import ReactDOM from 'react-dom/client';
import './css/styles.css';
import App from './App';

// Hide the loading screen when React mounts
const hideLoadingScreen = () => {
  const loadingWrapper = document.getElementById('loading-wrapper');
  if (loadingWrapper) {
    loadingWrapper.style.opacity = '0';
    setTimeout(() => {
      loadingWrapper.style.display = 'none';
    }, 500);
  }
};
try{
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
}catch(err){
    console.log(err)
}
// Hide loading screen after React is rendered
setTimeout(hideLoadingScreen, 1000);
