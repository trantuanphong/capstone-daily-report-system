import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  type = 'danger',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  // Determine color theme based on selection type
  const themeColors = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-100 dark:border-rose-900',
      text: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-950/40',
      btnBg: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
      icon: ShieldAlert,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-100 dark:border-amber-900',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-950/40',
      btnBg: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500',
      icon: AlertTriangle,
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-950/20',
      border: 'border-sky-100 dark:border-sky-900',
      text: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-100 dark:bg-sky-950/40',
      btnBg: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500',
      icon: Info,
    },
  }[type];

  const IconComponent = themeColors.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-[28px] border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden z-10"
          >
            {/* Header / Dismiss */}
            <div className="p-5 pb-0 flex items-start justify-between">
              <div className={`p-2.5 rounded-2xl ${themeColors.iconBg}`}>
                <IconComponent className={`h-5 w-5 ${themeColors.text}`} />
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all cursor-pointer outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 pt-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-gray-350 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>

            {/* Action Bar */}
            <div className="p-5 pt-0 flex items-center justify-end gap-2.5">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-2xl text-[11px] font-bold text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all cursor-pointer select-none outline-none"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`px-4 py-2 text-white rounded-2xl text-[11px] font-bold transition-all shadow-sm focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer select-none outline-none ${themeColors.btnBg}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
