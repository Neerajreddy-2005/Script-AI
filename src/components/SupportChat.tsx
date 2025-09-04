
import { useState, useEffect } from "react";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  time: string;
}

const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: "Hello! How can I help you with ScriptAI today?", 
      isUser: false, 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [agentsOnline, setAgentsOnline] = useState(true);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    // Add user message
    const userMsg = {
      id: messages.length + 1,
      text: newMessage,
      isUser: true,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages([...messages, userMsg]);
    setNewMessage("");
    
    // Simulate agent response after 1 second
    setTimeout(() => {
      const agentMsg = {
        id: messages.length + 2,
        text: "Thank you for your message. Our team will get back to you shortly. Is there anything else you'd like to know about ScriptAI?",
        isUser: false,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      setMessages(prevMessages => [...prevMessages, agentMsg]);
    }, 1000);
  };

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    const chatContainer = document.getElementById("chat-messages");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      {/* Chat Button */}
      <button
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full z-50 shadow-lg
          flex items-center justify-center transition-all duration-300
          ${isOpen ? 'bg-gray-100 rotate-90' : 'bg-scriptai-blue text-white'}`}
        onClick={toggleChat}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-[350px] z-50 overflow-hidden
          bg-white rounded-lg shadow-xl border border-gray-200
          flex flex-col transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0 pointer-events-none'}`}
        style={{ height: "450px" }}
      >
        {/* Chat Header */}
        <div className="bg-white p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-scriptai-black">Support Chat</h3>
            <button
              onClick={toggleChat}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex items-center mt-2">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${agentsOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span className="text-sm text-gray-600">
              {agentsOnline ? 'Agents Online' : 'Agents Offline'}
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          id="chat-messages" 
          className="flex-1 p-4 overflow-y-auto"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] mb-3 ${
                message.isUser ? "ml-auto" : ""
              }`}
            >
              <div
                className={`p-3 rounded-lg shadow-sm ${
                  message.isUser
                    ? "bg-scriptai-blue text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                {message.text}
              </div>
              <div
                className={`text-xs mt-1 text-gray-500 ${
                  message.isUser ? "text-right" : ""
                }`}
              >
                {message.time}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="relative">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full p-2 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-scriptai-blue/30 focus:border-scriptai-blue text-sm"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 text-scriptai-blue"
              disabled={!newMessage.trim()}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              The subscription determines chat availability:
              <br />
              Basic (9-5 weekdays), Pro (8-8 daily), Premium (24/7)
            </span>
          </div>
        </form>
      </div>
    </>
  );
};

export default SupportChat;
