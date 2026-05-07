import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { DesignItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: DesignItem[]) => void;
}

export default function AIGeneratorModal({ isOpen, onClose, onApply }: Props) {
  const [prompt, setPrompt] = useState('A simple studio apartment with 1 bathroom and a kitchen area');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate');
      }
      onApply(data.items);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            className="w-full max-w-lg bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-indigo-600">
                 <Icons.Sparkles className="w-5 h-5" />
                 <h2 className="text-lg font-bold text-gray-900 tracking-tight">AI Floor Plan Generator</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Describe the space you want to build. Our AI will automatically generate the 2D room layout and populate it with structural items.
              </p>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Prompt
                </label>
                <textarea
                  autoFocus
                  className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm resize-none text-gray-800 placeholder:text-gray-400"
                  placeholder="E.g., A cozy 2-bedroom house with an open-plan living and dining area, a small kitchen, and a master bathroom..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                   <Icons.AlertCircle className="w-4 h-4 mt-0.5" />
                   <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 bg-gray-50">
              <button 
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
              >
                {loading ? (
                    <>
                      <Icons.Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                ) : (
                    <>
                      <Icons.Wand2 className="w-4 h-4" />
                      Generate Layout
                    </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
