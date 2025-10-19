import React, { useState, useRef, useEffect } from 'react';
import { AIService, AIMessage } from '../services/aiService';
import { Send, Bot, User, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface AIChatProps {
  conversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({
  conversationId: initialConversationId,
  onConversationCreated,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation messages if conversation ID is provided
  useEffect(() => {
    if (initialConversationId) {
      loadMessages(initialConversationId);
    }
  }, [initialConversationId]);

  const loadMessages = async (convId: string) => {
    try {
      const history = await AIService.getConversationMessages(convId);
      setMessages(history);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load conversation history');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Optimistically add user message to UI
    const tempUserMessage: AIMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    setIsLoading(true);

    try {
      const response = await AIService.sendMessage(userMessage, conversationId);

      // Remove temp message and add both user and AI messages
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id);
        return [
          ...filtered,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString(),
          },
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.message,
            created_at: new Date().toISOString(),
            tokens_used: response.tokens_used,
          },
        ];
      });

      // Set conversation ID if this was the first message
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
        onConversationCreated?.(response.conversation_id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              AI Financial Advisor
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              Ask me anything about your chapter's finances, budgets, expenses, or get advice on
              financial management!
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Try asking:
              </p>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>• "How much have we spent on events this month?"</p>
                <p>• "Are we on track with our budget?"</p>
                <p>• "What are our biggest expenses?"</p>
                <p>• "How should I plan next quarter's budget?"</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.tokens_used && (
                <p className="text-xs opacity-70 mt-2">
                  Tokens: {message.tokens_used}
                </p>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
              <Loader className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your finances..."
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
