import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export default function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 bg-emerald-500 text-black font-extrabold text-xs rounded-full shadow-2xl shadow-emerald-500/40 font-sans"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toast}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
