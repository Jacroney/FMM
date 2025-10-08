import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Settings,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Plus,
  Download,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { DuesService } from '../services/duesService';
import { MemberService } from '../services/memberService';
import {
  DuesConfiguration,
  MemberDuesSummary,
  ChapterDuesStats,
  Member
} from '../services/types';
import DuesConfigurationModal from './DuesConfigurationModal';
import toast from 'react-hot-toast';

interface DuesManagementSectionProps {
  chapterId: string;
}

const DuesManagementSection: React.FC<DuesManagementSectionProps> = ({ chapterId }) => {
  const [configurations, setConfigurations] = useState<DuesConfiguration[]>([]);
  const [currentConfig, setCurrentConfig] = useState<DuesConfiguration | null>(null);
  const [memberDues, setMemberDues] = useState<MemberDuesSummary[]>([]);
  const [stats, setStats] = useState<ChapterDuesStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DuesConfiguration | undefined>();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMemberDues, setSelectedMemberDues] = useState<MemberDuesSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  }, [chapterId]);

  const loadData = async () => {
    try {
      const [configs, current, membersData] = await Promise.all([
        DuesService.getConfigurations(chapterId),
        DuesService.getCurrentConfiguration(chapterId),
        MemberService.getMembers(chapterId)
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

    setIsProcessing(true);
    try {
      const result = await DuesService.recordPayment(
        selectedMemberDues.id,
        parseFloat(paymentAmount),
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
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
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
                  ${stats.total_collected.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  of ${stats.total_expected.toLocaleString()}
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
                  ${stats.total_outstanding.toLocaleString()}
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
                    {dues.member_year || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${dues.base_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {dues.late_fee > 0 ? (
                      <span className="text-red-600 font-medium">${dues.late_fee.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    ${dues.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    ${dues.amount_paid.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {dues.balance > 0 ? (
                      <span className="text-red-600">${dues.balance.toFixed(2)}</span>
                    ) : (
                      <span className="text-green-600">$0.00</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(dues.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openPaymentModal(dues)}
                      disabled={dues.balance <= 0}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Record Payment
                    </button>
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
              <p className="text-lg font-bold text-red-600">${selectedMemberDues.balance.toFixed(2)}</p>
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
    </div>
  );
};

export default DuesManagementSection;
