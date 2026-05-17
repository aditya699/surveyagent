import { createContext, useState, useContext } from 'react';

const ChatbotPageContext = createContext(null);

export function ChatbotPageProvider({ children }) {
  const [pageContext, setPageContext] = useState('');
  return (
    <ChatbotPageContext.Provider value={{ pageContext, setPageContext }}>
      {children}
    </ChatbotPageContext.Provider>
  );
}

export function useChatbotPageContext() {
  return useContext(ChatbotPageContext);
}
