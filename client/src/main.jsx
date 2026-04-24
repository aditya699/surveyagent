import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatbotPageProvider } from './context/ChatbotPageContext';
import App from './App';
import FloatingChatbot from './components/shared/FloatingChatbot';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChatbotPageProvider>
          <App />
          <FloatingChatbot />
        </ChatbotPageProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
