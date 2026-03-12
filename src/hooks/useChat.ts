import { useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import toast from 'react-hot-toast';

const MAX_MESSAGE_LENGTH = 4000;
const MIN_INTERVAL_MS = 1000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60_000;

const toastStyle = {
  borderRadius: '10px',
  background: '#333',
  color: '#fff',
};

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Erro do servidor: ${response.status}`);
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err; // Don't retry timeouts
      }
    }

    if (attempt < retries - 1) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Falha na requisição');
}

interface WebhookResponse {
  output?: unknown;
  text?: unknown;
  response?: unknown;
  content?: unknown;
  message?: unknown;
}

function extractResponseText(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return null;

  const record = data as WebhookResponse;
  const candidates: (keyof WebhookResponse)[] = [
    'output',
    'text',
    'response',
    'content',
    'message',
  ];

  for (const key of candidates) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
  }

  return null;
}

export function useChat() {
  const { currentSessionId, addMessage, setIsTyping } = useChatStore();
  const lastSentRef = useRef<number>(0);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!currentSessionId || !message.trim()) return;

      // --- Input validation ---
      const trimmed = message.trim();
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        toast.error(`Mensagem muito longa (máx. ${MAX_MESSAGE_LENGTH} caracteres).`, {
          style: toastStyle,
        });
        return;
      }

      // --- Rate limiting ---
      const now = Date.now();
      if (now - lastSentRef.current < MIN_INTERVAL_MS) {
        toast.error('Aguarde um momento antes de enviar outra mensagem.', {
          style: toastStyle,
        });
        return;
      }
      lastSentRef.current = now;

      // --- Add user message locally ---
      await addMessage({
        sessionId: currentSessionId,
        role: 'user',
        content: trimmed,
      });

      // --- Auto-generate conversation title from first message ---
      const store = useChatStore.getState();
      const session = store.sessions.find((s) => s.id === currentSessionId);
      if (session && session.preview === 'Nova conversa iniciada') {
        const title =
          trimmed.length > 40 ? trimmed.substring(0, 37) + '...' : trimmed;
        await store.updateSessionTitle(currentSessionId, title);
      }

      setIsTyping(true);

      try {
        const proxyBaseUrl = import.meta.env.VITE_PROXY_API_URL?.trim();
        const apiUrl = proxyBaseUrl ? `${proxyBaseUrl}/api/chat` : '/api/chat';

        // --- Build request for n8n Chat Trigger ---
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS
        );

        try {
          const response = await fetchWithRetry(
            apiUrl,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: trimmed,
                sessionId: currentSessionId,
              }),
              signal: controller.signal,
            }
          );

          const data = await response.json();

          // --- Parse n8n Chat Trigger response ---
          // The n8n Chat Trigger returns { output: "response text" }
          const assistantContent = extractResponseText(data);
          if (!assistantContent) {
            throw new Error('Resposta inválida do servidor');
          }

          await addMessage({
            sessionId: currentSessionId,
            role: 'assistant',
            content: assistantContent,
          });
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        console.error('Error sending message to n8n:', error);

        const errorMessage = 'Falha ao enviar mensagem. Tente novamente.';

        toast.error(errorMessage, { style: toastStyle, duration: 5000 });

        await addMessage({
          sessionId: currentSessionId,
          role: 'assistant',
          content: `⚠️ ${errorMessage}`,
        });
      } finally {
        setIsTyping(false);
      }
    },
    [currentSessionId, addMessage, setIsTyping]
  );

  return { sendMessage };
}
