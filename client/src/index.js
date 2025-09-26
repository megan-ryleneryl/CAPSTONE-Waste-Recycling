import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Get the Google Client ID from environment variable
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.error('REACT_APP_GOOGLE_CLIENT_ID is not defined in environment variables');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);