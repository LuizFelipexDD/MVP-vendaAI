import { useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export function useChat() {
  const { currentSessionId, addMessage, setIsTyping, messages, setMessages } = useChatStore();

  const sendMessage = useCallback(async (message: string) => {
    if (!currentSessionId || !message.trim()) return;

    // Add user message locally
    await addMessage({
      sessionId: currentSessionId,
      role: 'user',
      content: message,
    });

    setIsTyping(true);

    try {
      const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
      
      if (!webhookUrl) {
        // Simulate response if no webhook is configured
        setTimeout(async () => {
          await addMessage({
            sessionId: currentSessionId,
            role: 'assistant',
            content: 'Esta é uma resposta simulada. Configure a variável `VITE_WEBHOOK_URL` no arquivo `.env` para conectar ao seu n8n.',
            quickReplies: ['Entendi', 'Como configurar?']
          });
          setIsTyping(false);
        }, 1500);
        return;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json',
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message,
          action: 'send',
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('text/event-stream')) {
        // Handle SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessageId = uuidv4();
        let currentContent = '';
        let quickReplies: string[] = [];
        
        // Add an empty assistant message to update
        useChatStore.setState((state) => ({
          messages: [
            ...state.messages,
            {
              id: assistantMessageId,
              sessionId: currentSessionId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            }
          ]
        }));
        
        setIsTyping(false);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    currentContent += data.content;
                  }
                  if (data.quickReplies) {
                    quickReplies = data.quickReplies;
                  }
                  
                  // Update the message in the store
                  useChatStore.setState((state) => ({
                    messages: state.messages.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: currentContent, quickReplies } 
                        : msg
                    )
                  }));
                } catch (e) {
                  // If it's not JSON, maybe it's just text chunks
                  currentContent += line.slice(6);
                  useChatStore.setState((state) => ({
                    messages: state.messages.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: currentContent } 
                        : msg
                    )
                  }));
                }
              }
            }
          }
          
          // Save the final message to DB
          const finalMessages = useChatStore.getState().messages;
          const finalMessage = finalMessages.find(m => m.id === assistantMessageId);
          if (finalMessage) {
            const { db } = await import('../db/database');
            await db.messages.add(finalMessage);
            await useChatStore.getState().updateSessionPreview(currentSessionId, finalMessage.content);
          }
        }
      } else {
        // Handle normal JSON response
        const data = await response.json();
        setIsTyping(false);
        
        if (data.messages && Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            await addMessage({
              sessionId: currentSessionId,
              role: msg.role || 'assistant',
              content: msg.content,
              quickReplies: msg.quickReplies,
            });
          }
        } else if (data.content) {
          await addMessage({
            sessionId: currentSessionId,
            role: 'assistant',
            content: data.content,
            quickReplies: data.quickReplies,
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Ops, tente novamente. Falha na conexão.', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      // Mock response for testing if webhook is not available
      setTimeout(async () => {
        await addMessage({
          sessionId: currentSessionId,
          role: 'assistant',
          content: 'Desculpe, estou com problemas para conectar ao servidor. Tente novamente mais tarde.',
        });
        setIsTyping(false);
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  }, [currentSessionId, addMessage, setIsTyping]);

  const loadPreviousSession = useCallback(async (sessionId: string) => {
    try {
      const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
      
      if (!webhookUrl) return;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          action: 'loadPreviousSession',
          loadPreviousSession: true
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          // Sync messages from n8n if needed
          // For now, we rely on local DB, but we could merge them
        }
      }
    } catch (error) {
      console.error('Error notifying n8n of session load:', error);
      toast.error('Erro ao carregar histórico do servidor.');
    }
  }, []);

  return { sendMessage, loadPreviousSession };
}
