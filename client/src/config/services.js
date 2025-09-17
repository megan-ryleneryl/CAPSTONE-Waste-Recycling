// client/src/config/services.js
import ChatService from '../services/chatService';
import MockChatService from '../services/mockChatService';

// Set this to true to use mock services during development
const USE_MOCK_SERVICES = process.env.REACT_APP_USE_MOCK === 'true' || false;

// You can also check if backend is available
const isBackendAvailable = () => {
  // Check if backend is running by looking for a token or API URL
  const apiUrl = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem('token');
  
  // If no API URL is configured or no token, use mock
  return apiUrl && token;
};

// Export the appropriate service
export const chatService = USE_MOCK_SERVICES || !isBackendAvailable() 
  ? MockChatService 
  : ChatService;

// Log which service is being used (helpful for debugging)
if (process.env.NODE_ENV === 'development') {
  console.log(`Using ${USE_MOCK_SERVICES || !isBackendAvailable() ? 'Mock' : 'Real'} Chat Service`);
}