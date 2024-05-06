import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)



//Service Worker main use Case :
//1.provides features like push notifications and background sync
//2.commonly used in progressive web apps (PWAs) to provide an app-like experience, even when the user is offline or has a slow internet connection.
//3.primarily used for tasks related to network handling, such as caching resources, intercepting fetch requests, and managing push notifications.


//IndexDB main use Case :
//1.client-side storage of significant amounts of structured data, including files/blobs
//2.It provides a way for web applications to store data locally in the user's browser, allowing for offline access and improving performance by reducing the need to fetch data from a server repeatedly.
//3.commonly used for tasks like caching large datasets, storing user-generated content locally, or providing a client-side database for web applications.