import React, { useState, useEffect, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { ForecastBalance } from '../services/types';
import { RecurringService } from '../services/recurringService';
import { useChapter } from '../context/ChapterContext';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore } from '../demo/demoStore';
import { DEMO_EVENT } from '../demo/demoMode';

interface CashFlowForecastCardProps {
  className?: string;
}

const CashFlowForecastCard: React.FC<CashFlowForecastCardProps> = ({ className = '' }) => {
  const { currentChapter } = useChapter();
  const computeDemoFlag = useCallback(() => (
    (currentChapter?.id === '00000000-0000-0000-0000-000000000001') || isDemoModeEnabled()
  ), [currentChapter?.id]);
  const [forecastData, setForecastData] = useState<ForecastBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState<30 | 60 | 90>(90);
  const [demoMode, setDemoMode] = useState<boolean>(() => computeDemoFlag());
  const isDemo = demoMode;

  const generateDemoForecast = (chapterId: string, horizon: number): ForecastBalance[] => {
    const state = demoStore.getState();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + horizon);

    const baseBalance = state.transactions
      .filter(tx => tx.chapter_id === chapterId)
      .reduce((sum, tx) => sum + tx.amount, 0);

    type Adjustment = {
      amount: number;
      hasRecurring: boolean;
    };

    const adjustments = new Map<string, Adjustment>();

    const addAdjustment = (date: Date, amount: number) => {
      const key = date.toISOString().split('T')[0];
      const entry = adjustments.get(key) || { amount: 0, hasRecurring: false };
      entry.amount += amount;
      entry.hasRecurring = true;
      adjustments.set(key, entry);
    };

    const advanceDate = (date: Date, frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly') => {
      const next = new Date(date);
      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'biweekly':
          next.setDate(next.getDate() + 14);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'quarterly':
          next.setMonth(next.getMonth() + 3);
          break;
        case 'yearly':
          next.setFullYear(next.getFullYear() + 1);
          break;
        default:
          next.setMonth(next.getMonth() + 1);
      }
      return next;
    };

    state.recurring
      .filter(item => item.chapter_id === chapterId && item.is_active)
      .forEach(item => {
        let occurrence = new Date(item.next_due_date);
        occurrence.setHours(0, 0, 0, 0);

        while (occurrence <= endDate) {
          if (occurrence >= startDate) {
            addAdjustment(occurrence, item.amount);
          }
          occurrence = advanceDate(occurrence, item.frequency);
        }
      });

    const results: ForecastBalance[] = [];
    let runningBalance = baseBalance;

    for (let day = 0; day < horizon; day++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + day);
      const key = date.toISOString().split('T')[0];
      const adjustment = adjustments.get(key);

      let projected = runningBalance;
      const sources: string[] = [];
      const dailyAmount = adjustment?.amount ?? 0;

      if (day === 0) {
        sources.push('actual');
      }

      if (adjustment) {
        projected += adjustment.amount;
        runningBalance = projected;
        if (adjustment.hasRecurring) {
          sources.push('recurring');
        }
      }

      results.push({
        date: key,
        chapter_id: chapterId,
        daily_amount: dailyAmount,
        sources,
        projected_balance: projected
      });
    }

    return results;
  };

  useEffect(() => {
    const handler = () => setDemoMode(computeDemoFlag());
    if (typeof window !== 'undefined') {
      handler();
      window.addEventListener(DEMO_EVENT, handler);
      return () => window.removeEventListener(DEMO_EVENT, handler);
    }
    return undefined;
  }, [computeDemoFlag]);

  useEffect(() => {
    loadForecast();
  }, [currentChapter?.id, daysAhead, isDemo]);

  const loadForecast = async () => {
    if (!currentChapter?.id) {
      setForecastData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (isDemo) {
        const data = generateDemoForecast(currentChapter.id, daysAhead);
        setForecastData(data);
      } else {
        const data = await RecurringService.getForecastBalance(currentChapter.id, daysAhead);
        setForecastData(data);
      }
    } catch (error) {
      console.error('Error loading forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = forecastData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    balance: item.projected_balance,
    isActual: item.sources.includes('actual'),
    isRecurring: item.sources.includes('recurring'),
  }));

  // Calculate metrics
  const currentBalance = chartData.length > 0 ? chartData[0].balance : 0;
  const futureBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : 0;
  const changeAmount = futureBalance - currentBalance;
  const minBalance = Math.min(...chartData.map(d => d.balance));
  const willGoNegative = minBalance < 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{data.date}</p>
          <p className={`text-sm ${data.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            Balance: {formatCurrency(data.balance)}
          </p>
          <div className="flex gap-2 mt-1">
            {data.isActual && (
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                Actual
              </span>
            )}
            {data.isRecurring && (
              <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                Recurring
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Cash Flow Forecast
            {willGoNegative && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Projected balance based on actual and recurring transactions
          </p>
        </div>
        <button
          onClick={loadForecast}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-4">
        {[30, 60, 90].map((days) => (
          <button
            key={days}
            onClick={() => setDaysAhead(days as 30 | 60 | 90)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              daysAhead === days
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {days} Days
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</p>
          <p className={`text-lg font-bold ${currentBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(currentBalance)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Projected ({daysAhead}d)</p>
          <p className={`text-lg font-bold ${futureBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(futureBalance)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Change</p>
          <div className="flex items-center justify-center gap-1">
            {changeAmount >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <p className={`text-lg font-bold ${changeAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {changeAmount >= 0 ? '+' : ''}{formatCurrency(changeAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      {willGoNegative && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-200">
                Negative Balance Warning
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Your projected balance will go negative (lowest: {formatCurrency(minBalance)}) in the next {daysAhead} days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No forecast data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBalanceNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#colorBalance)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Actual Data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Recurring Projection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-red-500" style={{ borderTop: '2px dashed' }} />
          <span>Zero Line</span>
        </div>
      </div>
    </div>
  );
};

export default CashFlowForecastCard;
