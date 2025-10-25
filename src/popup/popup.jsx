import React from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

function App() {
  return (
    <div className="container">
      <h1>TabTime</h1>
      <p>Welcome to TabTime!</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

