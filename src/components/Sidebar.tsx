import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MessageSquare, X, Trash2 } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Sidebar() {
  const {
    sessions,
    currentSessionId,
    loadSessions,
    createNewSession,
    loadSession,
    deleteSession,
    isSidebarOpen,
    toggleSidebar
  } = useChatStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSessionClick = async (sessionId: string) => {
    await loadSession(sessionId);
    // Also trigger n8n loadPreviousSession here if needed
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Conversas</h2>
          <button onClick={toggleSidebar} className="md:hidden p-2 text-gray-500 hover:bg-gray-200 rounded-md">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-2.5 px-4 rounded-xl shadow-sm transition-all duration-200 font-medium"
          >
            <Plus size={18} />
            <span>Nova Conversa</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSessionClick(session.id)}
              className={`w-full text-left p-3 rounded-xl transition-colors duration-200 flex flex-col gap-1 ${
                currentSessionId === session.id
                  ? 'bg-purple-100 text-purple-900'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate pr-2">{session.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {format(session.updatedAt, 'dd/MM', { locale: ptBR })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Excluir conversa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 truncate">{session.preview}</p>
            </button>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-10">
              <MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
              <p>Nenhuma conversa salva.</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
