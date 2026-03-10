import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db, Message, Session } from '../db/database';

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  isSidebarOpen: boolean;
  
  // Actions
  setSessions: (sessions: Session[]) => void;
  setCurrentSessionId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  toggleSidebar: () => void;
  
  // Thunks
  loadSessions: () => Promise<void>;
  createNewSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  updateSessionPreview: (sessionId: string, preview: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  isSidebarOpen: false,

  setSessions: (sessions) => set({ sessions }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setMessages: (messages) => set({ messages }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  loadSessions: async () => {
    const sessions = await db.sessions.orderBy('updatedAt').reverse().toArray();
    set({ sessions });
  },

  createNewSession: async () => {
    const newSessionId = uuidv4();
    const newSession: Session = {
      id: newSessionId,
      title: `Conversa em ${new Date().toLocaleDateString()}`,
      preview: 'Nova conversa iniciada',
      updatedAt: Date.now(),
    };
    
    await db.sessions.add(newSession);
    await get().loadSessions();
    
    set({ currentSessionId: newSessionId, messages: [], isSidebarOpen: false });

    // Notify n8n of new session
    try {
      const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: newSessionId,
            action: 'loadPreviousSession',
            loadPreviousSession: false
          }),
        }).catch(console.error);
      }
    } catch (e) {
      console.error(e);
    }
  },

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, currentSessionId: sessionId, isSidebarOpen: false });
    try {
      const messages = await db.messages
        .where('sessionId')
        .equals(sessionId)
        .sortBy('timestamp');
      set({ messages });
    } finally {
      set({ isLoading: false });
    }
  },

  addMessage: async (msgData) => {
    const newMessage: Message = {
      ...msgData,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    
    await db.messages.add(newMessage);
    set((state) => ({ messages: [...state.messages, newMessage] }));
    
    // Update session preview
    await get().updateSessionPreview(msgData.sessionId, msgData.content);
  },

  updateSessionPreview: async (sessionId, preview) => {
    const truncatedPreview = preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
    await db.sessions.update(sessionId, {
      preview: truncatedPreview,
      updatedAt: Date.now(),
    });
    await get().loadSessions();
  }
}));
