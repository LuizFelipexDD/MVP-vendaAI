import { motion } from 'motion/react';
import { Bot, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import confetti from 'canvas-confetti';

interface MessageBubbleProps {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: number;
}

export function MessageBubble({ text, sender, timestamp }: MessageBubbleProps) {
  const isUser = sender === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleThumbsUp = (e: React.MouseEvent) => {
    setFeedback('up');
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    confetti({
      particleCount: 30,
      spread: 60,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ['#8B5CF6', '#3B82F6', '#10B981'],
      disableForReducedMotion: true,
      zIndex: 100
    });
  };

  const handleThumbsDown = () => {
    setFeedback('down');
  };

  const sanitizedText = DOMPurify.sanitize(text);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
          isUser ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col gap-1">
          <div className={`relative group px-4 py-3 rounded-2xl shadow-sm leading-relaxed text-[15px] ${
            isUser 
              ? 'bg-blue-500 text-white rounded-br-sm' 
              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
          }`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{text}</p>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:text-gray-800">
                <ReactMarkdown>{sanitizedText}</ReactMarkdown>
              </div>
            )}
            
            {/* Actions (Hover) */}
            {!isUser && (
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm" title="Copiar">
                  <Copy size={14} />
                </button>
              </div>
            )}
          </div>
          
          {/* Timestamp & Feedback */}
          <div className={`flex items-center gap-3 text-[11px] text-gray-400 px-1 ${
            isUser ? 'justify-end' : 'justify-start'
          }`}>
            <span>{format(timestamp, "HH:mm", { locale: ptBR })}</span>
            {!isUser && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleThumbsUp}
                  className={`transition-colors ${feedback === 'up' ? 'text-green-500' : 'hover:text-green-500'}`}
                >
                  <ThumbsUp size={12} className={feedback === 'up' ? 'fill-current' : ''} />
                </button>
                <button 
                  onClick={handleThumbsDown}
                  className={`transition-colors ${feedback === 'down' ? 'text-red-500' : 'hover:text-red-500'}`}
                >
                  <ThumbsDown size={12} className={feedback === 'down' ? 'fill-current' : ''} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
