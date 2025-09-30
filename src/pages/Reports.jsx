import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

const Reports = () => {
  const { transactions, budgets, members, isLoading } = useFinancial();
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const filteredTransactions = transactions.filter(t => new Date(t.date) >= startDate);
    
    const totalIncome = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Category breakdown for expenses
    const expenseByCategory = filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

    // Monthly spending trend
    const monthlySpending = {};
    filteredTransactions.forEach(t => {
      const monthKey = new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlySpending[monthKey]) {
        monthlySpending[monthKey] = { income: 0, expenses: 0 };
      }
      if (t.amount > 0) {
        monthlySpending[monthKey].income += t.amount;
      } else {
        monthlySpending[monthKey].expenses += Math.abs(t.amount);
      }
    });

    // Dues analysis
    const totalMembers = members.length;
    const paidMembers = members.filter(m => m.duesPaid).length;
    const unpaidMembers = totalMembers - paidMembers;
    const duesCollectionRate = totalMembers > 0 ? (paidMembers / totalMembers) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      expenseByCategory,
      monthlySpending,
      transactionCount: filteredTransactions.length,
      duesCollectionRate,
      paidMembers,
      unpaidMembers,
      totalMembers
    };
  }, [transactions, members, dateRange]);

  // Chart data preparation
  const pieChartData = Object.entries(metrics.expenseByCategory).map(([category, amount]) => ({
    name: category,
    value: amount,
    percentage: ((amount / metrics.totalExpenses) * 100).toFixed(1)
  }));

  const barChartData = Object.entries(metrics.monthlySpending).map(([month, data]) => ({
    month,
    income: data.income,
    expenses: data.expenses,
    net: data.income - data.expenses
  }));

  const duesChartData = [
    { name: 'Paid', value: metrics.paidMembers, color: '#22c55e' },
    { name: 'Unpaid', value: metrics.unpaidMembers, color: '#ef4444' }
  ];

  // Colors for charts
  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  // Export functions
  const exportToCSV = () => {
    const csvData = transactions.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Description: t.description,
      Category: t.category,
      Amount: t.amount,
      Source: t.source,
      Status: t.status
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV report exported successfully');
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const reportElement = document.getElementById('report-content');
      if (!reportElement) {
        toast.error('Report content not found');
        return;
      }

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.setFontSize(20);
      pdf.text('KSIG Treasurer Financial Report', pdfWidth / 2, 20, { align: 'center' });
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      pdf.save(`financial-report-${dateRange}-${Date.now()}.pdf`);
      toast.success('PDF report exported successfully');
    } catch (error) {
      toast.error('Error exporting PDF report');
      console.error('PDF export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Financial Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Comprehensive analysis of your financial data</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last 12 Months</option>
          </select>

          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="overview">Overview</option>
            <option value="charts">Charts & Analytics</option>
            <option value="budget">Budget Analysis</option>
            <option value="dues">Dues Management</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center"
            >
              📊 CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors flex items-center disabled:opacity-50"
            >
              {isExporting ? '⏳' : '📄'} PDF
            </button>
          </div>
        </div>
      </div>

      <div id="report-content" className="space-y-6">
        {reportType === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Total Income</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">${metrics.totalIncome.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Income this period</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Total Expenses</h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">${metrics.totalExpenses.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Expenses this period</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Net Income</h3>
                <p className={`text-3xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${metrics.netIncome.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Net this period</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Dues Collection</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{metrics.duesCollectionRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{metrics.paidMembers} of {metrics.totalMembers} paid</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Expenses by Category</h3>
              <div className="space-y-4">
                {Object.entries(metrics.expenseByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300 capitalize">{category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <div
                            className="h-2 bg-blue-600 dark:bg-blue-400 rounded-full"
                            style={{ width: `${(amount / metrics.totalExpenses) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white min-w-16">${amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {reportType === 'charts' && (
          <>
            {/* Pie Chart - Expense Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Expense Breakdown by Category</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart - Monthly Trends */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Income vs Expenses Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="income" fill="#22c55e" name="Income" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dues Collection Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Dues Collection Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={duesChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value, percentage }) => `${name}: ${value} (${(percentage * 100).toFixed(1)}%)`}
                    >
                      {duesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {reportType === 'budget' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Budget Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${budgets.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Budgeted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">${budgets.reduce((sum, b) => sum + b.spent, 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">${budgets.reduce((sum, b) => sum + (b.amount - b.spent), 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                </div>
              </div>
            </div>

            {budgets.map(budget => {
              const progress = (budget.spent / budget.amount) * 100;
              const isOverBudget = budget.spent > budget.amount;

              return (
                <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{budget.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{budget.period}</span>
                      {isOverBudget && (
                        <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs font-medium">
                          Over Budget
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span>Progress: {Math.min(progress, 100).toFixed(1)}%</span>
                        <span>${budget.spent.toLocaleString()} / ${budget.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            isOverBudget ? 'bg-red-600 dark:bg-red-500' :
                            progress >= 80 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-green-600 dark:bg-green-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Category:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">{budget.category}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                        <p className={`font-medium ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          ${(budget.amount - budget.spent).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Period:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reportType === 'dues' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">Dues Collection Overview</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{metrics.totalMembers}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Members</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{metrics.paidMembers}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Paid Dues</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{metrics.unpaidMembers}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unpaid Dues</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{metrics.duesCollectionRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Collection Rate</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
                <div
                  className="bg-green-600 dark:bg-green-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.duesCollectionRate}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                {metrics.paidMembers} of {metrics.totalMembers} members have paid their dues
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Member Dues Status</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dues Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.status === 'Active'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : member.status === 'Inactive'
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.duesPaid
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {member.duesPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {member.paymentDate ? new Date(member.paymentDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;