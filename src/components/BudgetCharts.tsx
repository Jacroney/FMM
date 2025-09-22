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
import { BudgetSummary } from '../services/budgetService';

interface BudgetChartsProps {
  budgetSummary: BudgetSummary[];
}

const BudgetCharts: React.FC<BudgetChartsProps> = ({ budgetSummary }) => {
  // Prepare data for charts
  const categoryTypeData = ['Fixed Costs', 'Operational Costs', 'Event Costs'].map(type => {
    const items = budgetSummary.filter(b => b.category_type === type);
    return {
      name: type,
      allocated: items.reduce((sum, b) => sum + b.allocated, 0),
      spent: items.reduce((sum, b) => sum + b.spent, 0),
      remaining: items.reduce((sum, b) => sum + b.remaining, 0)
    };
  });

  const topSpendingCategories = [...budgetSummary]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 10)
    .map(item => ({
      name: item.category,
      spent: item.spent,
      allocated: item.allocated,
      utilization: item.percent_used
    }));

  const overBudgetItems = budgetSummary
    .filter(item => item.percent_used > 100)
    .sort((a, b) => b.percent_used - a.percent_used)
    .slice(0, 5)
    .map(item => ({
      name: item.category,
      overAmount: item.spent - item.allocated,
      percentOver: item.percent_used - 100
    }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Budget by Category Type */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Budget by Category Type
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryTypeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="allocated" fill="#3B82F6" name="Allocated" />
            <Bar dataKey="spent" fill="#EF4444" name="Spent" />
            <Bar dataKey="remaining" fill="#10B981" name="Remaining" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending Distribution Pie Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Spending Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${formatCurrency(entry.spent)}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="spent"
            >
              {categoryTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Spending Categories */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Spending Categories
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topSpendingCategories} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="spent" fill="#EF4444" />
            <Bar dataKey="allocated" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Utilization Rate */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Budget Utilization
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={topSpendingCategories}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Line
              type="monotone"
              dataKey="utilization"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ fill: '#8B5CF6', r: 6 }}
            />
            <Line
              y={100}
              stroke="#EF4444"
              strokeDasharray="5 5"
              strokeWidth={1}
              name="Budget Limit"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Over Budget Alert */}
      {overBudgetItems.length > 0 && (
        <div className="lg:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4">
            ⚠️ Over Budget Categories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overBudgetItems.map((item, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                <p className="text-2xl font-bold text-red-600">
                  +{formatCurrency(item.overAmount)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.percentOver.toFixed(1)}% over budget
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetCharts;