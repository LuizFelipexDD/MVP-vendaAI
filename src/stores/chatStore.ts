import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db, Message, Session } from '../db/database';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: string | null): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

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
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
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
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const newSession: Session = {
      id: newSessionId,
      title: `Conversa ${dateStr}`,
      preview: 'Nova conversa iniciada',
      updatedAt: Date.now(),
    };

    await db.sessions.add(newSession);
    await get().loadSessions();

    set({ currentSessionId: newSessionId, messages: [], isSidebarOpen: false });
  },

  loadSession: async (sessionId: string) => {
    if (!isValidUuid(sessionId)) return;
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
    if (!isValidUuid(msgData.sessionId)) return;
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
    if (!isValidUuid(sessionId)) return;
    const truncatedPreview = preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
    await db.sessions.update(sessionId, {
      preview: truncatedPreview,
      updatedAt: Date.now(),
    });
    await get().loadSessions();
  },

  updateSessionTitle: async (sessionId, title) => {
    if (!isValidUuid(sessionId)) return;
    await db.sessions.update(sessionId, { title });
    await get().loadSessions();
  },
}));
