import React, { useEffect, useMemo, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useFinancial } from '../context/FinancialContext';

const formatterCurrency = (value) => `$${value.toLocaleString()}`;

const Reports = () => {
  const { transactions, budgets, members, isLoading } = useFinancial();
  const [dateRange, setDateRange] = useState('month');
  const [reportView, setReportView] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

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

    const filtered = transactions.filter((tx) => new Date(tx.date) >= startDate);

    const totalIncome = filtered
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpenses = filtered
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const netIncome = totalIncome - totalExpenses;

    const expenseByCategory = filtered
      .filter((tx) => tx.amount < 0)
      .reduce((acc, tx) => {
        const key = tx.category || 'Uncategorized';
        acc[key] = (acc[key] || 0) + Math.abs(tx.amount);
        return acc;
      }, {});

    const monthlyBuckets = new Map();
    filtered.forEach((tx) => {
      const date = new Date(tx.date);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyBuckets.has(label)) {
        monthlyBuckets.set(label, { income: 0, expenses: 0 });
      }
      const entry = monthlyBuckets.get(label);
      if (tx.amount > 0) {
        entry.income += tx.amount;
      } else {
        entry.expenses += Math.abs(tx.amount);
      }
    });

    const monthlySpending = Array.from(monthlyBuckets.entries())
      .map(([month, data]) => ({ month, income: data.income, expenses: data.expenses, net: data.income - data.expenses }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));

    const topCategories = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([category, value]) => ({ category, value }));

    const totalMembers = members.length;
    const paidMembers = members.filter((m) => m.duesPaid).length;
    const unpaidMembers = Math.max(totalMembers - paidMembers, 0);
    const duesCollectionRate = totalMembers ? (paidMembers / totalMembers) * 100 : 0;

    const budgetProgress = budgets.slice(0, 5).map((budget) => ({
      name: budget.name,
      allocated: budget.amount,
      spent: budget.spent,
      remaining: Math.max(budget.amount - budget.spent, 0),
      progress: budget.amount ? Math.min((budget.spent / budget.amount) * 100, 100) : 0
    }));

    return {
      filtered,
      totalIncome,
      totalExpenses,
      netIncome,
      topCategories,
      monthlySpending,
      duesCollectionRate,
      paidMembers,
      unpaidMembers,
      totalMembers,
      budgetProgress
    };
  }, [transactions, budgets, members, dateRange]);

  const pieChartData = metrics.topCategories.map((item) => ({ name: item.category, value: item.value }));
  const duesChartData = [
    { name: 'Paid', value: metrics.paidMembers, fill: '#10b981' },
    { name: 'Unpaid', value: metrics.unpaidMembers, fill: '#f97316' }
  ];

  const exportToCSV = () => {
    if (!metrics.filtered.length) {
      toast.error('No transactions in the selected range.');
      return;
    }

    const csvRows = metrics.filtered.map((tx) => ({
      Date: new Date(tx.date).toLocaleDateString(),
      Description: tx.description,
      Category: tx.category,
      Amount: tx.amount,
      Source: tx.source,
      Status: tx.status
    }));

    const headers = Object.keys(csvRows[0]).join(',');
    const rows = csvRows.map((row) => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `financial-report-${dateRange}-${Date.now()}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  const exportToPDF = async () => {
    const target = document.getElementById('report-content');
    if (!target) {
      toast.error('Nothing to export yet.');
      return;
    }

    setIsExporting(true);
    try {
      const canvas = await html2canvas(target, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const imgX = (pdfWidth - canvas.width * ratio) / 2;
      const imgY = 24;

      pdf.setFontSize(18);
      pdf.text('Greek Pay Financial Report', pdfWidth / 2, 18, { align: 'center' });
      pdf.addImage(imgData, 'PNG', imgX, imgY, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`financial-report-${dateRange}-${Date.now()}.pdf`);
      toast.success('Report exported as PDF');
    } catch (error) {
      console.error(error);
      toast.error('Unable to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handler = () => {
      if (!isExporting) {
        exportToPDF();
      }
    };

    window.addEventListener('export-reports-pdf', handler);
    return () => window.removeEventListener('export-reports-pdf', handler);
  }, [isExporting]);

  if (isLoading) {
    return (
      <div className="surface-card flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
          Loading insights…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="surface-pill">Insights</span>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Financial reports
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Adjust the range to compare spend, income, and dues metrics across your chapter.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex overflow-hidden rounded-xl border border-[var(--brand-border)] bg-white text-sm font-medium text-slate-600 dark:bg-gray-800">
            {['overview', 'spending', 'dues'].map((option) => (
              <button
                key={option}
                onClick={() => setReportView(option)}
                className={`px-6 py-3 capitalize transition-colors ${
                  reportView === option
                    ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                    : 'hover:bg-slate-100 dark:hover:bg-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="focus-ring rounded-xl border border-[var(--brand-border)] bg-white px-4 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-slate-200"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 3 months</option>
            <option value="year">Last 12 months</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-gray-800 dark:text-emerald-300 dark:hover:bg-gray-700"
            >
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-700/40 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-gray-700"
            >
              {isExporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total income</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
            {formatterCurrency(Math.round(metrics.totalIncome))}
          </p>
          <p className="mt-1 text-xs text-slate-500">From {metrics.filtered.length} transactions</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total expenses</p>
          <p className="mt-2 text-3xl font-semibold text-rose-600 dark:text-rose-400">
            {formatterCurrency(Math.round(metrics.totalExpenses))}
          </p>
          <p className="mt-1 text-xs text-slate-500">All outgoing spend</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Net income</p>
          <p
            className={`mt-2 text-3xl font-semibold ${
              metrics.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatterCurrency(Math.round(metrics.netIncome))}
          </p>
          <p className="mt-1 text-xs text-slate-500">Difference of income minus expenses</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Dues collection</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
            {metrics.duesCollectionRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.paidMembers} of {metrics.totalMembers} members paid
          </p>
        </div>
      </div>

      <div id="report-content" className="space-y-6">
        {reportView === 'overview' && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="surface-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Monthly performance</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Compare income and expenses side by side.
                    </p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlySpending}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(value) => `$${value / 1000}k`} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value) => formatterCurrency(value)} contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.35)' }} />
                      <Legend iconType="circle" />
                      <Bar dataKey="income" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expenses" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="surface-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top expense categories</h2>
                  <span className="text-xs text-slate-500">Share of total spend</span>
                </div>
                <div className="space-y-4">
                  {metrics.topCategories.map(({ category, value }) => (
                    <div key={category} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{category}</p>
                        <p className="text-xs text-slate-500">{((value / metrics.totalExpenses) * 100).toFixed(1)}% of spend</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {formatterCurrency(Math.round(value))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="surface-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Dues collection snapshot</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value) => `${value} members`} />
                      <Pie data={duesChartData} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={4}>
                        {duesChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-panel)] px-4 py-3 text-sm">
                    <p className="font-medium text-slate-800 dark:text-slate-200">Paid members</p>
                    <p className="text-slate-500">{metrics.paidMembers} members current on dues</p>
                  </div>
                  <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-panel)] px-4 py-3 text-sm">
                    <p className="font-medium text-slate-800 dark:text-slate-200">Outstanding</p>
                    <p className="text-slate-500">{metrics.unpaidMembers} members awaiting payment</p>
                  </div>
                  <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-panel)] px-4 py-3 text-sm">
                    <p className="font-medium text-slate-800 dark:text-slate-200">Collection rate</p>
                    <p className="text-slate-500">Up to {metrics.duesCollectionRate.toFixed(1)}% for this period</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {reportView === 'spending' && (
          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Budget utilisation</h2>
              <span className="text-xs text-slate-500">Top 5 budgets</span>
            </div>
            <div className="space-y-4">
              {metrics.budgetProgress.length === 0 && (
                <p className="text-sm text-slate-500">No budgets tracked yet. Head to the Budgets page to set allocations.</p>
              )}
              {metrics.budgetProgress.map((budget) => (
                <div key={budget.name} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>{budget.name}</span>
                    <span>
                      {formatterCurrency(budget.spent)} / {formatterCurrency(budget.allocated)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-2 rounded-full ${budget.progress > 90 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${budget.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportView === 'dues' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="surface-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Member breakdown</h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Members current on dues</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{metrics.paidMembers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Members owing</span>
                  <span className="font-medium text-rose-500">{metrics.unpaidMembers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Collection rate</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {metrics.duesCollectionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="surface-card p-6">
              <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Calls to action</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Target communications to close out the remaining balances.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
                <li>Send reminders to members with outstanding balances.</li>
                <li>Highlight upcoming due dates in your chapter announcements.</li>
                <li>Promote preferred payment methods for faster reconciliation.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
