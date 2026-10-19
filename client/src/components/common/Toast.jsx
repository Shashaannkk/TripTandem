import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export const Toast = () => {
  const { toastMessage } = useAuth();

  if (!toastMessage) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-brand-teal" />,
    info: <Sparkles className="w-5 h-5 text-brand-orange" />,
    warning: <AlertTriangle className="w-5 h-5 text-brand-yellow" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
      <div className="glass-panel bg-white/95 text-brand-navy px-4 py-3 rounded-2xl shadow-floating border border-brand-sand-border flex items-center gap-3 max-w-md">
        {icons[toastMessage.type] || icons.info}
        <p className="text-sm font-medium">{toastMessage.message}</p>
      </div>
    </div>
  );
};

export default Toast;
