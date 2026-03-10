import Dexie, { type EntityTable } from 'dexie';

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  quickReplies?: string[];
}

export interface Session {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}

const db = new Dexie('VendaiDB') as Dexie & {
  messages: EntityTable<Message, 'id'>;
  sessions: EntityTable<Session, 'id'>;
};

db.version(1).stores({
  messages: 'id, sessionId, timestamp',
  sessions: 'id, updatedAt'
});

export { db };
