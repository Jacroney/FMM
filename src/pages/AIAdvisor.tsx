import React, { useState, useEffect } from 'react';
import { AIChat } from '../components/AIChat';
import { AIService, AIConversation } from '../services/aiService';
import { useChapter } from '../context/ChapterContext';
import { MessageSquarePlus, Trash2, Sparkles, RefreshCw, Database } from 'lucide-react';
import toast from 'react-hot-toast';

export const AIAdvisor: React.FC = () => {
  const { currentChapter } = useChapter();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<any>(null);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const [showKBStats, setShowKBStats] = useState(false);

  useEffect(() => {
    if (currentChapter?.id) {
      loadConversations();
      loadKnowledgeBaseStats();
    }
  }, [currentChapter?.id]);

  const loadKnowledgeBaseStats = async () => {
    if (!currentChapter?.id) return;

    try {
      const stats = await AIService.getKnowledgeBaseStats(currentChapter.id);
      setKnowledgeBaseStats(stats);
    } catch (error) {
      console.error('Error loading knowledge base stats:', error);
    }
  };

  const handleGenerateEmbeddings = async (forceRefresh: boolean = false) => {
    if (!currentChapter?.id) return;

    setGeneratingEmbeddings(true);
    const loadingToast = toast.loading(
      forceRefresh ? 'Refreshing AI knowledge base...' : 'Initializing AI knowledge base...'
    );

    try {
      const result = await AIService.generateEmbeddings(currentChapter.id, forceRefresh);
      toast.success(
        `Knowledge base updated! ${result.embeddings_created} embeddings created.`,
        { id: loadingToast }
      );
      await loadKnowledgeBaseStats();
    } catch (error: any) {
      console.error('Error generating embeddings:', error);
      toast.error(error.message || 'Failed to update knowledge base', { id: loadingToast });
    } finally {
      setGeneratingEmbeddings(false);
    }
  };

  const loadConversations = async () => {
    if (!currentChapter?.id) return;

    try {
      setLoading(true);
      const data = await AIService.getConversations(currentChapter.id);
      setConversations(data);

      // Auto-select first conversation if none selected
      if (!selectedConversation && data.length > 0) {
        setSelectedConversation(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setSelectedConversation(undefined);
  };

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversation(conversationId);
    loadConversations();
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await AIService.deleteConversation(conversationId);
      toast.success('Conversation deleted');

      // If deleted conversation was selected, clear selection
      if (selectedConversation === conversationId) {
        setSelectedConversation(undefined);
      }

      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!currentChapter?.id) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Please select a chapter to use the AI advisor
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Advisor
              </h2>
            </div>
            <button
              onClick={() => setShowKBStats(!showKBStats)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Knowledge Base Info"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>

          {/* Knowledge Base Stats */}
          {showKBStats && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  Knowledge Base
                </span>
                <button
                  onClick={() => handleGenerateEmbeddings(true)}
                  disabled={generatingEmbeddings}
                  className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title="Refresh knowledge base"
                >
                  <RefreshCw className={`w-3 h-3 ${generatingEmbeddings ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {knowledgeBaseStats ? (
                <>
                  <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Items:</span>
                      <span className="font-semibold">{knowledgeBaseStats.total}</span>
                    </div>
                    {Object.entries(knowledgeBaseStats.by_type).map(([type, count]) => (
                      <div key={type} className="flex justify-between pl-2">
                        <span className="capitalize">{type}:</span>
                        <span>{count as number}</span>
                      </div>
                    ))}
                    {knowledgeBaseStats.last_updated && (
                      <div className="text-xs text-blue-600 dark:text-blue-300 pt-1 mt-1 border-t border-blue-200 dark:border-blue-700">
                        Updated: {new Date(knowledgeBaseStats.last_updated).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                    No knowledge base found
                  </p>
                  <button
                    onClick={() => handleGenerateEmbeddings(false)}
                    disabled={generatingEmbeddings}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {generatingEmbeddings ? 'Initializing...' : 'Initialize Now'}
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p>No conversations yet.</p>
              <p className="text-sm mt-2">Start a new conversation to begin!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                    selectedConversation === conv.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                      : ''
                  }`}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedConversation(conv.id);
                    }
                  }}
                  onClick={() => setSelectedConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conv.title || 'New conversation'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(conv.last_message_at)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {conv.message_count} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        <AIChat
          key={selectedConversation}
          conversationId={selectedConversation}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
};

export default AIAdvisor;
