import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DollarSign,
  Settings,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Edit2,
  MailPlus,
  Trash2,
  Calendar
} from 'lucide-react';
import { DuesService } from '../services/duesService';
import { formatCurrency } from '../utils/currency';
import { AuthService } from '../services/authService';
import {
  DuesConfiguration,
  MemberDuesSummary,
  ChapterDuesStats,
  Member
} from '../services/types';
import DuesConfigurationModal from './DuesConfigurationModal';
import PayDuesButton from './PayDuesButton';
import StripeConnectSetup from './StripeConnectSetup';
import AssignDuesModal from './AssignDuesModal';
import InstallmentEligibilityModal from './InstallmentEligibilityModal';
import toast from 'react-hot-toast';
import { getYearLabel } from '../utils/yearUtils';

const computeStatsFromSummaries = (
  summaries: MemberDuesSummary[],
  config: DuesConfiguration
): ChapterDuesStats => {
  const base: ChapterDuesStats = {
    chapter_id: config.chapter_id,
    period_name: config.period_name,
    fiscal_year: config.fiscal_year,
    total_members: summaries.length,
    members_paid: 0,
    members_pending: 0,
    members_overdue: 0,
    members_partial: 0,
    total_expected: 0,
    total_collected: 0,
    total_outstanding: 0,
    total_late_fees: 0,
    payment_rate: 0
  };

  const aggregated = summaries.reduce((acc, summary) => {
    acc.total_expected += summary.total_amount;
    acc.total_collected += summary.amount_paid;
    acc.total_outstanding += summary.balance;
    acc.total_late_fees += summary.late_fee;

    switch (summary.status) {
      case 'paid':
        acc.members_paid += 1;
        break;
      case 'overdue':
        acc.members_overdue += 1;
        break;
      case 'partial':
        acc.members_partial += 1;
        break;
      case 'pending':
      default:
        acc.members_pending += 1;
        break;
    }

    return acc;
  }, { ...base });

  if (aggregated.total_expected > 0) {
    aggregated.payment_rate = Number(
      ((aggregated.total_collected / aggregated.total_expected) * 100).toFixed(1)
    );
  }

  return aggregated;
};

interface DemoDuesData {
  configurations: DuesConfiguration[];
  current: DuesConfiguration;
  memberSummaries: MemberDuesSummary[];
  stats: ChapterDuesStats;
  members: Member[];
}

interface DuesManagementSectionProps {
  chapterId: string;
  demoData?: DemoDuesData;
}

const DuesManagementSection: React.FC<DuesManagementSectionProps> = ({ chapterId, demoData }) => {
  const isDemo = Boolean(demoData);
  const demoSeedKeyRef = useRef<string | null>(null);

  const [configurations, setConfigurations] = useState<DuesConfiguration[]>(demoData?.configurations ?? []);
  const [currentConfig, setCurrentConfig] = useState<DuesConfiguration | null>(demoData?.current ?? null);
  const [memberDues, setMemberDues] = useState<MemberDuesSummary[]>(demoData?.memberSummaries ?? []);
  const [stats, setStats] = useState<ChapterDuesStats | null>(demoData?.stats ?? null);
  const [, setMembers] = useState<Member[]>(demoData?.members ?? []);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DuesConfiguration | undefined>();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailAssignModal, setShowEmailAssignModal] = useState(false);
  const [selectedMemberDues, setSelectedMemberDues] = useState<MemberDuesSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Installment eligibility modal
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentMemberDues, setInstallmentMemberDues] = useState<MemberDuesSummary | null>(null);

  const applyDemoData = useCallback(() => {
    if (!demoData) return;
    setConfigurations(demoData.configurations);
    setCurrentConfig(demoData.current);
    setMemberDues(demoData.memberSummaries);
    setStats(demoData.stats);
    setMembers(demoData.members);
  }, [demoData]);

  // Load data
  useEffect(() => {
    if (isDemo) {
      if (demoData) {
        const key = `${demoData.current?.id ?? 'unknown'}-${demoData.memberSummaries.length}`;
        if (demoSeedKeyRef.current !== key) {
          applyDemoData();
          demoSeedKeyRef.current = key;
        }
      }
      return;
    }

    demoSeedKeyRef.current = null;
    loadData();
  }, [chapterId, isDemo, applyDemoData, demoData]);

  const loadData = async () => {
    if (isDemo) return;
    try {
      const [configs, current, membersData] = await Promise.all([
        DuesService.getConfigurations(chapterId),
        DuesService.getCurrentConfiguration(chapterId),
        AuthService.getChapterMembers(chapterId)
      ]);

      setConfigurations(configs);
      setCurrentConfig(current);
      setMembers(membersData);

      if (current) {
        const [duesData, statsData] = await Promise.all([
          DuesService.getMemberDues(chapterId, current.id),
          DuesService.getChapterStats(chapterId, current.period_name)
        ]);

        setMemberDues(duesData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading dues data:', error);
      toast.error('Failed to load dues data');
    }
  };

  const handleConfigSaved = () => {
    setShowConfigModal(false);
    setEditingConfig(undefined);
    loadData();
  };

  const handleAutoAssignDues = async () => {
    if (isDemo) {
      toast.success('Demo: dues have already been assigned to each member.');
      return;
    }
    if (!currentConfig) {
      toast.error('Please create a dues configuration first');
      return;
    }

    if (!confirm('This will automatically assign dues to all active members based on their year. Continue?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await DuesService.assignDuesToChapter(chapterId, currentConfig.id);
      toast.success(`Assigned dues to ${result.assigned} members. Skipped ${result.skipped} members.`);

      if (result.errors && result.errors.length > 0) {
        console.error('Errors during assignment:', result.errors);
      }

      loadData();
    } catch (error) {
      console.error('Error auto-assigning dues:', error);
      toast.error('Failed to assign dues');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyLateFees = async () => {
    if (isDemo) {
      toast.success('Demo: late fees are already applied in this example.');
      return;
    }
    if (!currentConfig) {
      toast.error('No current configuration found');
      return;
    }

    if (!confirm('This will apply late fees to all overdue members. Continue?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await DuesService.applyLateFees(chapterId, currentConfig.id);
      toast.success(`Applied late fees to ${result.applied} members`);
      loadData();
    } catch (error) {
      console.error('Error applying late fees:', error);
      toast.error('Failed to apply late fees');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberDues) return;

    const amountNumeric = parseFloat(paymentAmount || '0');
    if (Number.isNaN(amountNumeric) || amountNumeric <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    if (isDemo) {
      const remaining = selectedMemberDues.total_amount - selectedMemberDues.amount_paid;
      const appliedAmount = Math.min(amountNumeric, remaining);

      if (appliedAmount <= 0) {
        toast.error('This member already has a zero balance.');
        return;
      }

      const updatedSummaries = memberDues.map((summary) => {
        if (summary.id !== selectedMemberDues.id) return summary;
        const newAmountPaid = summary.amount_paid + appliedAmount;
        const newBalance = Math.max(summary.total_amount - newAmountPaid, 0);
        const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : summary.status;
        return {
          ...summary,
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
          paid_date: newStatus === 'paid' ? paymentDate : summary.paid_date,
          is_overdue: newBalance > 0 ? summary.is_overdue : false,
          days_overdue: newBalance > 0 ? summary.days_overdue : 0,
          updated_at: new Date().toISOString()
        };
      });

      setMemberDues(updatedSummaries);
      if (currentConfig) {
        setStats(computeStatsFromSummaries(updatedSummaries, currentConfig));
      }

      toast.success('Payment recorded (demo)');
      setShowPaymentModal(false);
      resetPaymentForm();
      return;
    }

    setIsProcessing(true);
    try {
      const result = await DuesService.recordPayment(
        selectedMemberDues.id,
        amountNumeric,
        paymentMethod,
        paymentDate,
        paymentReference || undefined,
        paymentNotes || undefined
      );

      if (result.success) {
        toast.success('Payment recorded successfully');
        setShowPaymentModal(false);
        resetPaymentForm();
        loadData();
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    setPaymentNotes('');
    setSelectedMemberDues(null);
  };

  const openPaymentModal = (memberDue: MemberDuesSummary) => {
    setSelectedMemberDues(memberDue);
    setPaymentAmount(memberDue.balance.toString());
    setShowPaymentModal(true);
  };

  const handleDeleteDues = async (dues: MemberDuesSummary) => {
    if (isDemo) {
      toast.error('Cannot delete in demo mode');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete dues for ${dues.member_name}?\n\nAmount: ${formatCurrency(dues.total_amount)}\nStatus: ${dues.status}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await DuesService.deleteMemberDues(dues.id);
      toast.success('Dues deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting dues:', error);
      toast.error('Failed to delete dues');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    try {
      const csv = DuesService.exportToCSV(memberDues);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dues_${currentConfig?.period_name}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Dues data exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export dues data');
    }
  };

  // Filter dues
  const filteredDues = memberDues.filter(dues => {
    const matchesStatus = filterStatus === 'all' || dues.status === filterStatus;
    const matchesSearch =
      dues.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dues.member_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', icon: AlertCircle },
      overdue: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: AlertCircle },
      partial: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: TrendingUp },
      waived: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dues Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure and track member dues by year with automated late fees
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingConfig(currentConfig || undefined);
              setShowConfigModal(true);
            }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5 text-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            {currentConfig ? 'Edit' : 'Setup'} Configuration
          </button>
          <button
            onClick={handleExport}
            disabled={memberDues.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stripe Connect Setup Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          Online Payment Setup
        </h3>
        <StripeConnectSetup chapterId={chapterId} onSetupComplete={loadData} />
      </div>

      {/* Current Configuration Info */}
      {currentConfig && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Current Period: {currentConfig.period_name} {currentConfig.fiscal_year}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {currentConfig.due_date ? new Date(currentConfig.due_date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Late Fees:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {currentConfig.late_fee_enabled ?
                      `$${currentConfig.late_fee_amount}${currentConfig.late_fee_type === 'percentage' ? '%' : ''}` :
                      'Disabled'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Grace Period:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {currentConfig.late_fee_grace_days} days
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingConfig(currentConfig);
                setShowConfigModal(true);
              }}
              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_members}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Rate</p>
                <p className="text-3xl font-bold text-green-600">{stats.payment_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.members_paid} paid</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Collected</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.total_collected)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  of {formatCurrency(stats.total_expected)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(stats.total_outstanding)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.members_overdue} overdue</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {currentConfig && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAutoAssignDues}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="w-4 h-4" />
              Auto-Assign Dues to All Members
            </button>
            <button
              onClick={() => setShowEmailAssignModal(true)}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              Assign Dues
            </button>
            <button
              onClick={handleApplyLateFees}
              disabled={isProcessing || !currentConfig.late_fee_enabled}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertCircle className="w-4 h-4" />
              Apply Late Fees
            </button>
            <button
              onClick={loadData}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="waived">Waived</option>
          </select>
        </div>
      </div>

      {/* Member Dues Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Base</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Late Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDues.map((dues) => (
                <tr key={dues.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{dues.member_name}</div>
                    <div className="text-xs text-gray-500">{dues.member_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {getYearLabel(dues.member_year)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(dues.base_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {dues.late_fee > 0 ? (
                      <span className="text-red-600 font-medium">{formatCurrency(dues.late_fee)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(dues.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {formatCurrency(dues.amount_paid)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {dues.balance > 0 ? (
                      <span className="text-red-600">{formatCurrency(dues.balance)}</span>
                    ) : (
                      <span className="text-green-600">{formatCurrency(0)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(dues.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {/* Online Payment Button */}
                      <PayDuesButton
                        memberDues={dues}
                        onPaymentSuccess={loadData}
                        variant="small"
                      />
                      {/* Installment Eligibility Button */}
                      <button
                        onClick={() => {
                          setInstallmentMemberDues(dues);
                          setShowInstallmentModal(true);
                        }}
                        disabled={dues.balance <= 0 || isDemo}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Configure installment payment eligibility"
                      >
                        <Calendar className="w-3 h-3" />
                      </button>
                      {/* Admin Manual Payment Button */}
                      <button
                        onClick={() => openPaymentModal(dues)}
                        disabled={dues.balance <= 0 || isDemo}
                        className="px-3 py-1.5 bg-gray-600 dark:bg-gray-700 text-white text-xs rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Record manual payment (admin only)"
                      >
                        Record
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteDues(dues)}
                        disabled={isProcessing || isDemo}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Delete dues assignment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDues.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {currentConfig ? 'No dues assigned yet. Click "Auto-Assign Dues" to get started.' : 'Please create a dues configuration first.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      <DuesConfigurationModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setEditingConfig(undefined);
        }}
        chapterId={chapterId}
        existingConfig={editingConfig}
        onSaved={handleConfigSaved}
      />

      {/* Assign Dues Modal */}
      <AssignDuesModal
        isOpen={showEmailAssignModal}
        onClose={() => setShowEmailAssignModal(false)}
        chapterId={chapterId}
        config={currentConfig}
        onSuccess={loadData}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedMemberDues && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Record Payment
            </h3>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">Member:</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedMemberDues.member_name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Outstanding Balance:</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(selectedMemberDues.balance)}</p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="0.01"
                    step="0.01"
                    max={selectedMemberDues.balance}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="ACH">ACH</option>
                  <option value="Venmo">Venmo</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference # (optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Check #, Transaction ID, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Installment Eligibility Modal */}
      {installmentMemberDues && (
        <InstallmentEligibilityModal
          isOpen={showInstallmentModal}
          onClose={() => {
            setShowInstallmentModal(false);
            setInstallmentMemberDues(null);
          }}
          memberDues={installmentMemberDues}
          chapterId={chapterId}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};

export default DuesManagementSection;
