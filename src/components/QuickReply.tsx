import { motion } from 'motion/react';

interface QuickReplyProps {
  label: string;
  onClick: () => void;
}

export function QuickReply({ label, onClick }: QuickReplyProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 hover:border-purple-300 transition-colors duration-200 shadow-sm whitespace-nowrap"
    >
      {label}
    </motion.button>
  );
}
