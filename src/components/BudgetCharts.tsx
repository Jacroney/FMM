import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BudgetSummary } from '../services/types';

interface BudgetChartsProps {
  budgetSummary: BudgetSummary[];
}

const BudgetCharts: React.FC<BudgetChartsProps> = ({ budgetSummary }) => {
  // Check if we have data
  if (!budgetSummary || budgetSummary.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Budget Data</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start by setting budget allocations for your categories to see detailed analytics and charts.
          </p>
        </div>
      </div>
    );
  }

  // Prepare data by category type
  const fixedCostsData = budgetSummary
    .filter(b => b.category_type === 'Fixed Costs')
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  const operationalCostsData = budgetSummary
    .filter(b => b.category_type === 'Operational Costs')
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  const eventCostsData = budgetSummary
    .filter(b => b.category_type === 'Event Costs')
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Overall summary
  const categoryTypeData = ['Fixed Costs', 'Operational Costs', 'Event Costs'].map(type => {
    const items = budgetSummary.filter(b => b.category_type === type);
    const allocated = items.reduce((sum, b) => sum + b.allocated, 0);
    const spent = items.reduce((sum, b) => sum + b.spent, 0);
    return {
      name: type.split(' ')[0], // Shorter names
      allocated,
      spent,
      remaining: allocated - spent,
      utilizationPercent: allocated > 0 ? (spent / allocated) * 100 : 0
    };
  }).filter(item => item.allocated > 0 || item.spent > 0);

  const overBudgetItems = budgetSummary
    .filter(item => item.percent_used > 100)
    .sort((a, b) => b.percent_used - a.percent_used)
    .slice(0, 6)
    .map(item => ({
      name: item.category,
      categoryType: item.category_type,
      overAmount: item.spent - item.allocated,
      percentOver: item.percent_used - 100
    }));

  const FIXED_COLOR = '#3B82F6';
  const OPERATIONAL_COLOR = '#10B981';
  const EVENT_COLOR = '#F59E0B';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border-2 border-gray-200 dark:border-gray-600">
          <p className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{entry.name}:</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: entry.color }}>
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Overall Summary Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Budget Overview by Type
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Comparison of allocated vs spent across all categories
            </p>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            Summary
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={categoryTypeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 14, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              iconSize={10}
            />
            <Bar dataKey="allocated" fill="#3B82F6" name="Allocated" radius={[8, 8, 0, 0]} barSize={60} />
            <Bar dataKey="spent" fill="#EF4444" name="Spent" radius={[8, 8, 0, 0]} barSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Type Breakdown - 3 separate charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fixed Costs */}
        {fixedCostsData.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Fixed Costs
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Top {Math.min(fixedCostsData.length, 5)} categories
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fixedCostsData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#93c5fd" opacity={0.3} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#1e40af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={100}
                  tick={{ fill: '#1e40af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="spent" fill={FIXED_COLOR} radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Operational Costs */}
        {operationalCostsData.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl shadow-sm border border-green-200 dark:border-green-700">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Operational Costs
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Top {Math.min(operationalCostsData.length, 5)} categories
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={operationalCostsData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#86efac" opacity={0.3} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#15803d', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={100}
                  tick={{ fill: '#15803d', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="spent" fill={OPERATIONAL_COLOR} radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Event Costs */}
        {eventCostsData.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-6 rounded-xl shadow-sm border border-amber-200 dark:border-amber-700">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Event Costs
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Top {Math.min(eventCostsData.length, 5)} categories
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventCostsData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fcd34d" opacity={0.3} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#92400e', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={100}
                  tick={{ fill: '#92400e', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="spent" fill={EVENT_COLOR} radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Budget Utilization by Type */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Budget Utilization
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              How much of each budget has been spent
            </p>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
            % Used
          </span>
        </div>
        {categoryTypeData.length > 0 ? (
          <div className="space-y-6">
            {categoryTypeData.map((cat, index) => {
              const colors = [
                { bg: 'bg-blue-100 dark:bg-blue-900/20', bar: 'bg-blue-600 dark:bg-blue-500', text: 'text-blue-900 dark:text-blue-100' },
                { bg: 'bg-green-100 dark:bg-green-900/20', bar: 'bg-green-600 dark:bg-green-500', text: 'text-green-900 dark:text-green-100' },
                { bg: 'bg-amber-100 dark:bg-amber-900/20', bar: 'bg-amber-600 dark:bg-amber-500', text: 'text-amber-900 dark:text-amber-100' }
              ];
              const color = colors[index];
              const isOverBudget = cat.utilizationPercent > 100;

              return (
                <div key={cat.name} className={`p-4 rounded-lg ${color.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${color.text}`}>{cat.name} Costs</span>
                    <span className={`text-sm font-bold ${isOverBudget ? 'text-red-600 dark:text-red-400' : color.text}`}>
                      {Math.round(cat.utilizationPercent)}%
                    </span>
                  </div>
                  <div className="relative w-full bg-white dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        isOverBudget ? 'bg-red-600 dark:bg-red-500' : color.bar
                      }`}
                      style={{ width: `${Math.min(cat.utilizationPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      Spent: {formatCurrency(cat.spent)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      of {formatCurrency(cat.allocated)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No utilization data available
          </div>
        )}
      </div>

      {/* Over Budget Alert */}
      {overBudgetItems.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-300 dark:border-red-700 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-500 dark:bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-red-900 dark:text-red-200">
                Over Budget Alert
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {overBudgetItems.length} {overBudgetItems.length === 1 ? 'category is' : 'categories are'} exceeding their budget
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {overBudgetItems.map((item, index) => {
              const typeColor =
                item.categoryType === 'Fixed Costs' ? 'border-blue-300 dark:border-blue-700' :
                item.categoryType === 'Operational Costs' ? 'border-green-300 dark:border-green-700' :
                'border-amber-300 dark:border-amber-700';

              return (
                <div key={index} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 ${typeColor} hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.categoryType}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                    +{formatCurrency(item.overAmount)}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-red-200 dark:bg-red-900/50 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-red-600 dark:bg-red-500 h-2.5 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <span className="text-xs font-bold text-red-700 dark:text-red-300 whitespace-nowrap">
                      {item.percentOver.toFixed(0)}% over
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetCharts;