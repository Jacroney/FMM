import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIService, AIInsight } from '../services/aiService';
import { useChapter } from '../context/ChapterContext';
import { AlertTriangle, TrendingUp, Lightbulb, AlertCircle, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const InsightsCard: React.FC = () => {
  const { currentChapter } = useChapter();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (currentChapter?.id) {
      loadInsights();
    }
  }, [currentChapter?.id]);

  const loadInsights = async () => {
    if (!currentChapter?.id) return;

    try {
      setLoading(true);
      const data = await AIService.getUnreadInsights(currentChapter.id);
      setInsights(data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!currentChapter?.id) return;

    setGenerating(true);
    const loadingToast = toast.loading('Analyzing your financial data...');

    try {
      const result = await AIService.generateInsights(currentChapter.id, true);
      toast.success(
        `Analysis complete! Generated ${result.insights_generated} insight${result.insights_generated !== 1 ? 's' : ''}.`,
        { id: loadingToast }
      );
      await loadInsights();
    } catch (error: any) {
      console.error('Error generating insights:', error);
      toast.error(error.message || 'Failed to generate insights', { id: loadingToast });
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (insightId: string) => {
    try {
      await AIService.dismissInsight(insightId);
      toast.success('Insight dismissed');
      await loadInsights();
    } catch (error) {
      console.error('Error dismissing insight:', error);
      toast.error('Failed to dismiss insight');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  const getPriorityIcon = (type: string, priority: string) => {
    if (priority === 'urgent' || type === 'alert') {
      return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    if (type === 'budget_warning' || type === 'anomaly') {
      return <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
    }
    if (type === 'forecast') {
      return <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
    return <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
  };

  const topInsights = insights.slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Lightbulb className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Insights
          </h2>
          {insights.length > 0 && (
            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
              {insights.length}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={generating}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Generate insights"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            No insights yet
          </p>
          <button
            onClick={handleGenerateInsights}
            disabled={generating}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {generating ? 'Analyzing...' : 'Analyze My Finances'}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {topInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getPriorityColor(insight.priority)} relative group`}
              >
                <button
                  onClick={() => handleDismiss(insight.id)}
                  className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getPriorityIcon(insight.insight_type, insight.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {insight.title}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                        insight.priority === 'urgent'
                          ? 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-100'
                          : insight.priority === 'high'
                          ? 'bg-orange-200 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100'
                          : insight.priority === 'medium'
                          ? 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100'
                          : 'bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100'
                      }`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {insight.description}
                    </p>
                    {insight.suggested_actions && insight.suggested_actions.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Suggested: </span>
                        {insight.suggested_actions[0].text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {insights.length > 3 && (
            <button
              onClick={() => navigate('/insights')}
              className="w-full mt-4 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              View All {insights.length} Insights →
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default InsightsCard;
