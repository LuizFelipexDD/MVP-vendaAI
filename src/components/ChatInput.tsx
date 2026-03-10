import { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, placeholder = "Digite sua mensagem...", disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative flex items-end gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-300 transition-all">
      <button 
        type="button"
        className="p-2 text-gray-400 hover:text-purple-600 transition-colors rounded-xl hover:bg-purple-50"
        aria-label="Anexar imagem"
      >
        <ImageIcon size={20} />
      </button>
      
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 max-h-[120px] bg-transparent border-none resize-none focus:ring-0 py-2.5 px-1 text-[15px] text-gray-800 placeholder-gray-400"
        style={{ minHeight: '44px' }}
      />
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className={`p-2.5 rounded-xl flex items-center justify-center transition-all shadow-sm ${
          message.trim() && !disabled
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-md'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        aria-label="Enviar mensagem"
      >
        <Send size={18} className={message.trim() && !disabled ? 'translate-x-0.5 -translate-y-0.5' : ''} />
      </motion.button>
    </div>
  );
}
