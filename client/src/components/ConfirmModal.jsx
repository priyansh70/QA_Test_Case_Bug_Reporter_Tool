import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, LoaderCircle } from 'lucide-react';

/** Themed confirmation dialog. `t` is the theme class map used by the sessions modal. */
export default function ConfirmModal({ t, open, title, message, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={busy ? undefined : onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 ${t.panel}`}
          >
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-xl bg-red-500/15 text-red-500 border border-red-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <div className="space-y-1">
                <h3 className={`font-bold text-base ${t.text}`}>{title}</h3>
                <p className={`text-xs leading-relaxed ${t.muted}`}>{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onCancel} disabled={busy} className={`px-4 py-2 text-xs font-semibold rounded-xl border disabled:opacity-50 ${t.ghostBtn}`}>
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-extrabold rounded-xl"
              >
                {busy && <LoaderCircle className="w-4 h-4 animate-spin" />} {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
