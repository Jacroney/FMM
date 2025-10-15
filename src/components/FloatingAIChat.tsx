import React, { useState } from 'react';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { AIChat } from './AIChat';

export const FloatingAIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const restoreChat = () => {
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          aria-label="Open AI Chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-all ${
            isMinimized ? 'h-14 w-80' : 'h-[600px] w-96'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-white" />
              <h3 className="text-sm font-semibold text-white">AI Financial Advisor</h3>
            </div>
            <div className="flex items-center gap-2">
              {!isMinimized && (
                <button
                  onClick={minimizeChat}
                  className="rounded p-1 text-white hover:bg-blue-700 focus:outline-none"
                  aria-label="Minimize chat"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={toggleChat}
                className="rounded p-1 text-white hover:bg-blue-700 focus:outline-none"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              <AIChat />
            </div>
          )}

          {/* Minimized State */}
          {isMinimized && (
            <button
              onClick={restoreChat}
              className="flex-1 flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Click to restore
            </button>
          )}
        </div>
      )}
    </>
  );
};
