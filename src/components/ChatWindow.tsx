import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Sparkles } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { QuickReply } from './QuickReply';

export function ChatWindow() {
  const { messages, isTyping, currentSessionId, toggleSidebar } = useChatStore();
  const { sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!currentSessionId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">
            Bem-vindo ao VendAI
          </h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Seu assistente inteligente de vendas. Inicie uma nova conversa na barra lateral para começar.
          </p>
          <button
            onClick={toggleSidebar}
            className="md:hidden px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            Ver Conversas
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white relative">
      {/* Header */}
      <header className="h-16 flex items-center px-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 mr-2 text-gray-500 hover:bg-gray-100 rounded-lg md:hidden transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 leading-tight">Assistente de Vendas</h2>
            <p className="text-xs text-green-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Initial Greeting */}
          {messages.length === 0 && (
            <MessageBubble
              text="Oi! Como posso ajudar nas vendas hoje?"
              sender="assistant"
              timestamp={Date.now()}
            />
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <div key={msg.id} className="flex flex-col gap-3">
                <MessageBubble
                  text={msg.content}
                  sender={msg.role}
                  timestamp={msg.timestamp}
                />
                
                {/* Quick Replies (only show for the last assistant message) */}
                {msg.role === 'assistant' && 
                 msg.quickReplies && 
                 msg.quickReplies.length > 0 && 
                 index === messages.length - 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-2 ml-12 mb-4"
                  >
                    {msg.quickReplies.map((reply, i) => (
                      <QuickReply
                        key={i}
                        label={reply}
                        onClick={() => sendMessage(reply)}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-gray-400 text-sm ml-12 mb-4"
            >
              <div className="flex items-center gap-1 bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm h-[40px]">
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-1.5 h-4 bg-purple-500 rounded-sm"
                />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={sendMessage} disabled={isTyping} />
          <p className="text-center text-[10px] text-gray-400 mt-2">
            A IA pode cometer erros. Considere verificar informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
