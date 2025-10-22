import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { MemberService } from '../services/memberService';
import { useChapter } from '../context/ChapterContext';
import DuesManagementSection from '../components/DuesManagementSection';
import { demoStore } from '../demo/demoStore';
import { useLocation } from 'react-router-dom';
import {
  DuesConfiguration,
  MemberDuesSummary,
  ChapterDuesStats,
  Member
} from '../services/types';

const Dues = () => {
  const { currentChapter } = useChapter();
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Winter 2025');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' or 'dues'
  const location = useLocation();
  const isDemoRoute = location.pathname.startsWith('/demo');
  const demoDuesData = useMemo(() => {
    if (!isDemoRoute || !currentChapter?.id) return undefined;
    const state = demoStore.getState();
    const membersList: Member[] = state.members.filter(member => member.chapter_id === currentChapter.id);

    const config: DuesConfiguration = {
      id: 'demo-dues-config-1',
      chapter_id: currentChapter.id,
      period_name: 'Winter 2025',
      period_type: 'Semester',
      period_start_date: '2025-01-01',
      period_end_date: '2025-04-30',
      fiscal_year: 2025,
      is_current: true,
      freshman_dues: 850,
      sophomore_dues: 900,
      junior_dues: 950,
      senior_dues: 950,
      graduate_dues: 700,
      alumni_dues: 0,
      pledge_dues: 600,
      default_dues: 900,
      late_fee_enabled: true,
      late_fee_amount: 25,
      late_fee_type: 'flat',
      late_fee_grace_days: 5,
      due_date: '2025-02-15',
      notes: 'Demo dues configuration for Winter 2025',
      created_at: '2024-12-15T12:00:00Z',
      updated_at: '2025-01-05T12:00:00Z'
    };

    const patterns = [
      { base: 950, adjustments: 0, late: 0, paid: 950, status: 'paid', note: 'Auto ACH payment received', dueDate: '2025-02-15', paidDate: '2025-01-20', overdue: false, daysOverdue: 0 },
      { base: 900, adjustments: 0, late: 25, paid: 0, status: 'overdue', note: 'Late fee applied after grace period', dueDate: '2025-02-15', paidDate: null, overdue: true, daysOverdue: 12 },
      { base: 900, adjustments: 0, late: 0, paid: 450, status: 'partial', note: '50% collected, payment plan active', dueDate: '2025-02-15', paidDate: '2025-02-10', overdue: false, daysOverdue: 0 },
      { base: 950, adjustments: 0, late: 0, paid: 950, status: 'paid', note: 'Paid via credit card on file', dueDate: '2025-02-15', paidDate: '2025-01-25', overdue: false, daysOverdue: 0 },
      { base: 900, adjustments: -100, late: 0, paid: 0, status: 'pending', note: 'Scholarship credit applied', dueDate: '2025-03-01', paidDate: null, overdue: false, daysOverdue: 0 },
      { base: 850, adjustments: 0, late: 0, paid: 300, status: 'partial', note: 'Partial payment processed - campus job', dueDate: '2025-02-28', paidDate: '2025-02-05', overdue: false, daysOverdue: 0 },
      { base: 900, adjustments: 0, late: 0, paid: 900, status: 'paid', note: 'Exec payroll deduction', dueDate: '2025-02-15', paidDate: '2025-02-12', overdue: false, daysOverdue: 0 },
      { base: 880, adjustments: 0, late: 20, paid: 420, status: 'overdue', note: 'Reminder emails sent weekly', dueDate: '2025-02-10', paidDate: null, overdue: true, daysOverdue: 20 }
    ];

    const summaries: MemberDuesSummary[] = membersList.map((member, index) => {
      const pattern = patterns[index % patterns.length];
      const totalAmount = pattern.base + pattern.adjustments + pattern.late;
      const amountPaid = Math.min(pattern.paid, totalAmount);
      const balance = Math.max(totalAmount - amountPaid, 0);
      const status = balance <= 0 ? 'paid' : pattern.status as MemberDuesSummary['status'];

      return {
        id: `demo-member-dues-${member.id}`,
        chapter_id: currentChapter.id,
        member_id: member.id,
        config_id: config.id,
        base_amount: pattern.base,
        late_fee: pattern.late,
        adjustments: pattern.adjustments,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance,
        status,
        assigned_date: '2025-01-05',
        due_date: pattern.dueDate,
        paid_date: status === 'paid' ? (pattern.paidDate || pattern.dueDate) : pattern.paidDate,
        late_fee_applied_date: pattern.overdue ? '2025-02-21' : null,
        notes: pattern.note,
        adjustment_reason: pattern.adjustments !== 0 ? 'Scholarship credit' : null,
        created_at: '2025-01-05T12:00:00Z',
        updated_at: new Date().toISOString(),
        member_name: member.name,
        member_email: member.email,
        member_year: member.year,
        member_status: member.status,
        chapter_name: state.chapter.name,
        period_name: config.period_name,
        period_type: config.period_type,
        fiscal_year: config.fiscal_year,
        is_overdue: pattern.overdue && balance > 0,
        days_overdue: pattern.overdue && balance > 0 ? pattern.daysOverdue : 0
      };
    });

    const stats: ChapterDuesStats = {
      chapter_id: currentChapter.id,
      period_name: config.period_name,
      fiscal_year: config.fiscal_year,
      total_members: summaries.length,
      members_paid: summaries.filter(summary => summary.balance <= 0).length,
      members_pending: summaries.filter(summary => summary.status === 'pending').length,
      members_overdue: summaries.filter(summary => summary.status === 'overdue').length,
      members_partial: summaries.filter(summary => summary.status === 'partial').length,
      total_expected: summaries.reduce((sum, summary) => sum + summary.total_amount, 0),
      total_collected: summaries.reduce((sum, summary) => sum + summary.amount_paid, 0),
      total_outstanding: summaries.reduce((sum, summary) => sum + summary.balance, 0),
      total_late_fees: summaries.reduce((sum, summary) => sum + summary.late_fee, 0),
      payment_rate: 0
    };

    if (stats.total_expected > 0) {
      stats.payment_rate = Number(((stats.total_collected / stats.total_expected) * 100).toFixed(1));
    }

    return {
      configurations: [config],
      current: config,
      memberSummaries: summaries,
      stats,
      members: membersList
    };
  }, [isDemoRoute, currentChapter?.id]);

  // Load members on component mount and when chapter changes
  useEffect(() => {
    const loadMembers = async () => {
      if (!currentChapter) return;

      if (isDemoRoute) {
        if (demoDuesData?.members) {
          setMembers(demoDuesData.members);
        } else {
          const state = demoStore.getState();
          const demoMembers = state.members.filter(member => member.chapter_id === currentChapter.id);
          setMembers(demoMembers);
        }
        return;
      }

      try {
        setIsLoading(true);
        const memberList = await MemberService.getMembers(currentChapter.id);
        setMembers(memberList);
      } catch (error) {
        console.error('Failed to load members:', error);
        showNotification('Failed to load members', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [currentChapter, isDemoRoute, demoDuesData]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Sanitize input
  const sanitizeInput = (input) => {
    return input.replace(/[<>]/g, '');
  };

  // Handle CSV file upload with validation
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      // Validate file type
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setImportError('Please upload a valid CSV file');
        setIsLoading(false);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImportError('File size should be less than 5MB');
        setIsLoading(false);
        return;
      }

      Papa.parse(file, {
        complete: async (results) => {
          if (results.data && results.data.length > 0) {
            const errors = [];
            // Check if first row is header
            const hasHeader = results.data[0] &&
              (results.data[0][0]?.toLowerCase().includes('first') ||
               results.data[0][0]?.toLowerCase().includes('name') ||
               results.data[0][1]?.toLowerCase().includes('last'));

            const dataRows = hasHeader ? results.data.slice(1) : results.data;

            const formattedMembers = dataRows
              .filter(row => row[0] && row[1]) // Filter out empty rows (first and last name)
              .map((row, index) => {
                const firstName = sanitizeInput(row[0] || '').trim();
                const lastName = sanitizeInput(row[1] || '').trim();
                const fullName = `${firstName} ${lastName}`;

                if (!firstName || !lastName) {
                  errors.push(`Row ${index + 1}: Missing first or last name`);
                  return null;
                }

                // Generate email from name (can be updated later)
                const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`;

                return {
                  id: crypto.randomUUID(),
                  chapter_id: currentChapter?.id || '11111111-1111-1111-1111-111111111111',
                  name: fullName,
                  email: email,
                  status: 'Active',
                  year: null,
                  duesPaid: false,
                  paymentDate: null,
                  semester: selectedSemester,
                  lastUpdated: new Date().toISOString()
                };
              })
              .filter(member => member !== null);

            if (errors.length > 0) {
              setImportError(errors.join('\n'));
            } else {
              try {
                const importedMembers = await MemberService.importMembers(formattedMembers);
                // Reload all members from database to get fresh data
                const allMembers = await MemberService.getMembers(currentChapter?.id);
                setMembers(allMembers);
                setShowImportModal(false);
                setImportError('');
                showNotification(`${importedMembers.length} members imported successfully!`);
              } catch (error) {
                setImportError('Failed to save members. Please try again.');
              }
            }
          }
          setIsLoading(false);
        },
        header: false,
        skipEmptyLines: true,
        error: (error) => {
          setImportError(`Error parsing CSV: ${error.message}`);
          setIsLoading(false);
        }
      });
    }
  };

  // Handle manual roster input with validation
  const handleManualImport = async () => {
    try {
      setIsLoading(true);
      const rows = importData.split('\n').filter(row => row.trim());
      const errors = [];

      const formattedMembers = rows
        .map((row, index) => {
          const parts = row.split(',').map(item => sanitizeInput(item.trim()));
          const [firstName, lastName] = parts;

          if (!firstName || !lastName) {
            errors.push(`Row ${index + 1}: Missing first or last name`);
            return null;
          }

          const fullName = `${firstName} ${lastName}`;
          // Generate email from name (can be updated later)
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`;

          return {
            id: crypto.randomUUID(),
            chapter_id: currentChapter?.id || '11111111-1111-1111-1111-111111111111',
            name: fullName,
            email: email,
            status: 'Active',
            year: null,
            duesPaid: false,
            paymentDate: null,
            semester: selectedSemester,
            lastUpdated: new Date().toISOString()
          };
        })
        .filter(member => member !== null);

      if (errors.length > 0) {
        setImportError(errors.join('\n'));
      } else {
        try {
          const importedMembers = await MemberService.importMembers(formattedMembers);
          // Reload all members from database to get fresh data
          const allMembers = await MemberService.getMembers(currentChapter?.id);
          setMembers(allMembers);
          setShowImportModal(false);
          setImportData('');
          setImportError('');
          showNotification(`${importedMembers.length} members imported successfully!`);
        } catch (error) {
          setImportError('Failed to save members. Please try again.');
        }
      }
      setIsLoading(false);
    } catch (error) {
      setImportError('Invalid format. Please use: FirstName, LastName');
      setIsLoading(false);
    }
  };

  // Toggle payment status with audit trail
  const togglePaymentStatus = async (memberId) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      await MemberService.updatePaymentStatus(memberId, !member.duesPaid);
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.id === memberId
            ? {
                ...member,
                duesPaid: !member.duesPaid,
                paymentDate: !member.duesPaid ? new Date().toISOString().split('T')[0] : null,
                lastUpdated: new Date().toISOString()
              }
            : member
        )
      );
      showNotification(`Payment status updated for ${member.name}`);
    } catch (error) {
      showNotification('Failed to update payment status', 'error');
    }
  };

  // Export members
  const handleExport = (format) => {
    try {
      const content = format === 'csv'
        ? MemberService.exportToCSV(members)
        : MemberService.exportToGCM(members);

      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members_${selectedSemester}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotification(`Members exported to ${format.toUpperCase()} successfully!`);
    } catch (error) {
      showNotification('Failed to export members', 'error');
    }
  };

  // Filter members based on search term with sanitization
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(sanitizeInput(searchTerm.toLowerCase())) ||
    member.email.toLowerCase().includes(sanitizeInput(searchTerm.toLowerCase()))
  );

  // Calculate payment statistics
  const paymentStats = {
    total: members.length,
    paid: members.filter(m => m.duesPaid).length,
    unpaid: members.filter(m => !m.duesPaid).length
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dues & Members</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage member roster and track dues payments</p>
        </div>
        {activeTab === 'roster' && (
        <div className="flex space-x-4">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="Fall 2025">Fall 2025</option>
            <option value="Winter 2026">Winter 2026</option>
            <option value="Spring 2026">Spring 2026</option>
            <option value="Summer 2026">Summer 2026</option>
          </select>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center"
          >
            <span className="mr-2">📥</span>
            Import Roster
          </button>
          <div className="relative group">
            <button className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center">
              <span className="mr-2">📤</span>
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 hidden group-hover:block z-10">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('gcm')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Export as GCM
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'roster'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              👥 Member Roster
            </button>
            <button
              onClick={() => setActiveTab('dues')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dues'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              💰 Dues Management
            </button>
          </nav>
        </div>
      </div>

      {/* Dues Management Tab */}
      {activeTab === 'dues' && currentChapter?.id && (
        <DuesManagementSection chapterId={currentChapter.id} />
      )}

      {/* Roster Tab Content */}
      {activeTab === 'roster' && (
        <>
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          notification.type === 'error'
            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
            : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Total Members</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{paymentStats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Active members this quarter</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Dues Paid</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{paymentStats.paid}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Members with paid dues</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Dues Unpaid</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{paymentStats.unpaid}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Members with pending dues</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">🔍</span>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dues Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-300 font-medium">{member.name.charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
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
                    {member.paymentDate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => togglePaymentStatus(member.id)}
                      className={`px-3 py-1 rounded transition-colors ${
                        member.duesPaid
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                          : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                      }`}
                    >
                      {member.duesPaid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Import Roster</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
                >
                  ✕
                </button>
              </div>

              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload CSV File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-700">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CSV up to 5MB</p>
                  </div>
                </div>
              </div>

              {/* Manual Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or paste roster (Name, Email)
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  rows="5"
                  placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com"
                />
                {importError && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{importError}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualImport}
                  disabled={isLoading}
                  className={`px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Dues;
