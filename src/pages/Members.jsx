import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { AuthService } from '../services/authService';
import { useChapter } from '../context/ChapterContext';
import DuesManagementSection from '../components/DuesManagementSection';
import { supabase } from '../services/supabaseClient';

const Members = () => {
  const { currentChapter } = useChapter();
  const [members, setMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Winter 2025');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' or 'dues'
  const [importStep, setImportStep] = useState('upload'); // 'upload', 'preview', 'result'
  const [parsedMembers, setParsedMembers] = useState([]);
  const [importResult, setImportResult] = useState(null);

  // Load members and pending invitations on component mount and when chapter changes
  useEffect(() => {
    const loadMembersAndInvitations = async () => {
      if (currentChapter) {
        try {
          setIsLoading(true);
          const [memberList, invitations] = await Promise.all([
            AuthService.getChapterMembers(currentChapter.id),
            AuthService.getPendingInvitations(currentChapter.id)
          ]);
          setMembers(memberList);
          setPendingInvitations(invitations);
        } catch (error) {
          console.error('Failed to load members:', error);
          showNotification('Failed to load members', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadMembersAndInvitations();
  }, [currentChapter]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Sanitize input
  const sanitizeInput = (input) => {
    return input.replace(/[<>]/g, '');
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle CSV file upload with validation - now shows preview
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      setImportError('');

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
            // Check if first row is header
            const hasHeader = results.data[0] &&
              (results.data[0][0]?.toLowerCase().includes('first') ||
               results.data[0][0]?.toLowerCase().includes('name') ||
               results.data[0][2]?.toLowerCase().includes('email'));

            const dataRows = hasHeader ? results.data.slice(1) : results.data;

            // Parse CSV: first_name, last_name, email, phone, year
            const parsed = dataRows
              .filter(row => row[0] || row[1] || row[2]) // Filter out completely empty rows
              .map((row, index) => {
                const firstName = sanitizeInput(row[0] || '').trim();
                const lastName = sanitizeInput(row[1] || '').trim();
                const email = sanitizeInput(row[2] || '').trim().toLowerCase();
                const phone = sanitizeInput(row[3] || '').trim();
                const year = sanitizeInput(row[4] || '').trim();

                const rowErrors = [];
                if (!firstName) rowErrors.push('Missing first name');
                if (!lastName) rowErrors.push('Missing last name');
                if (!email) rowErrors.push('Missing email');
                else if (!isValidEmail(email)) rowErrors.push('Invalid email format');

                return {
                  first_name: firstName,
                  last_name: lastName,
                  email: email,
                  phone: phone,
                  year: year,
                  status: 'active', // Default status, editable in preview
                  errors: rowErrors,
                  rowIndex: index + 1,
                };
              });

            // Filter valid and invalid members
            const validMembers = parsed.filter(m => m.errors.length === 0);
            const invalidMembers = parsed.filter(m => m.errors.length > 0);

            if (invalidMembers.length > 0) {
              const errorMessages = invalidMembers.slice(0, 5).map(m =>
                `Row ${m.rowIndex}: ${m.errors.join(', ')}`
              );
              if (invalidMembers.length > 5) {
                errorMessages.push(`... and ${invalidMembers.length - 5} more errors`);
              }
              setImportError(errorMessages.join('\n'));
            }

            if (validMembers.length > 0) {
              setParsedMembers(validMembers);
              setImportStep('preview');
            } else if (invalidMembers.length > 0) {
              setImportError('No valid members found in CSV. Please check the format.');
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

  // Execute the import after preview confirmation
  const handleConfirmImport = async () => {
    if (!currentChapter?.id || parsedMembers.length === 0) return;

    setIsLoading(true);
    setImportError('');

    try {
      const membersToImport = parsedMembers.map(m => ({
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
        phone: m.phone || null,
        year: m.year || null,
        status: m.status || 'active',
      }));

      const result = await AuthService.bulkImportMembersWithInvitations(
        membersToImport,
        currentChapter.id
      );

      setImportResult(result);
      setImportStep('result');

      if (result.imported_count > 0) {
        showNotification(`${result.imported_count} members imported!`);
        // Refresh pending invitations to show newly imported members
        const invitations = await AuthService.getPendingInvitations(currentChapter.id);
        setPendingInvitations(invitations);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError(error.message || 'Failed to import members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (invitationId) => {
    try {
      const result = await AuthService.resendInvitation(invitationId, currentChapter.id);
      if (result.success) {
        showNotification('Invitation email queued for sending');
        // Refresh invitations to update status
        const invitations = await AuthService.getPendingInvitations(currentChapter.id);
        setPendingInvitations(invitations);
      } else {
        showNotification(result.error || 'Failed to resend invitation', 'error');
      }
    } catch (error) {
      showNotification('Failed to resend invitation', 'error');
    }
  };

  // Handle cancel invitation
  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const result = await AuthService.cancelInvitation(invitationId);
      if (result.success) {
        showNotification('Invitation cancelled');
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        showNotification(result.error || 'Failed to cancel invitation', 'error');
      }
    } catch (error) {
      showNotification('Failed to cancel invitation', 'error');
    }
  };

  // Handle send all pending invitations
  const handleSendAllInvitations = async () => {
    const pendingToSend = pendingInvitations.filter(inv => inv.invitation_email_status === 'pending');
    if (pendingToSend.length === 0) {
      showNotification('No pending invitations to send', 'error');
      return;
    }

    if (!confirm(`Send invitation emails to ${pendingToSend.length} member(s)?`)) return;

    try {
      setIsLoading(true);
      const invitationIds = pendingToSend.map(inv => inv.id);

      // Send all at once using RPC
      const { data, error } = await supabase.rpc('send_member_invitation_emails', {
        p_chapter_id: currentChapter.id,
        p_invitation_ids: invitationIds,
      });

      if (error) throw error;

      showNotification(`Invitation emails queued for ${data?.queued_count || pendingToSend.length} members`);

      // Refresh invitations
      const invitations = await AuthService.getPendingInvitations(currentChapter.id);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error sending invitations:', error);
      showNotification('Failed to send invitations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset import modal state
  const resetImportModal = () => {
    setShowImportModal(false);
    setImportStep('upload');
    setParsedMembers([]);
    setImportResult(null);
    setImportError('');
    setImportData('');
  };

  // Update a member field in the preview
  const updateMemberField = (index, field, value) => {
    setParsedMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Remove a member from the preview
  const removeMember = (index) => {
    setParsedMembers(prev => prev.filter((_, i) => i !== index));
  };

  // Handle manual roster input with validation
  const handleManualImport = async () => {
    try {
      setIsLoading(true);
      setImportError('');
      const rows = importData.split('\n').filter(row => row.trim());

      // Parse manual input: first_name, last_name, email, phone, year
      const parsed = rows.map((row, index) => {
        const parts = row.split(',').map(item => sanitizeInput(item.trim()));
        const [firstName, lastName, email, phone, year] = parts;

        const rowErrors = [];
        if (!firstName) rowErrors.push('Missing first name');
        if (!lastName) rowErrors.push('Missing last name');
        if (!email) rowErrors.push('Missing email');
        else if (!isValidEmail(email.toLowerCase())) rowErrors.push('Invalid email format');

        return {
          first_name: firstName || '',
          last_name: lastName || '',
          email: (email || '').toLowerCase(),
          phone: phone || '',
          year: year || '',
          status: 'active', // Default status, editable in preview
          errors: rowErrors,
          rowIndex: index + 1,
        };
      });

      const validMembers = parsed.filter(m => m.errors.length === 0);
      const invalidMembers = parsed.filter(m => m.errors.length > 0);

      if (invalidMembers.length > 0) {
        const errorMessages = invalidMembers.slice(0, 5).map(m =>
          `Row ${m.rowIndex}: ${m.errors.join(', ')}`
        );
        if (invalidMembers.length > 5) {
          errorMessages.push(`... and ${invalidMembers.length - 5} more errors`);
        }
        setImportError(errorMessages.join('\n'));
      }

      if (validMembers.length > 0) {
        setParsedMembers(validMembers);
        setImportStep('preview');
      } else if (invalidMembers.length > 0 && validMembers.length === 0) {
        setImportError('No valid members found. Please check the format: FirstName, LastName, Email, Phone, Year (1-5)');
      }

      setIsLoading(false);
    } catch (error) {
      setImportError('Invalid format. Please use: FirstName, LastName, Email, Phone, Year (1-5)');
      setIsLoading(false);
    }
  };

  // Toggle payment status with audit trail
  const togglePaymentStatus = async (memberId) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      await AuthService.updatePaymentStatus(memberId, !member.duesPaid);
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
      showNotification(`Payment status updated for ${member.full_name || 'member'}`);
    } catch (error) {
      showNotification('Failed to update payment status', 'error');
    }
  };

  // Export members
  const handleExport = (format) => {
    try {
      const content = format === 'csv'
        ? AuthService.exportMembersToCSV(members)
        : AuthService.exportMembersToGCM(members);

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
    (member.full_name || '').toLowerCase().includes(sanitizeInput(searchTerm.toLowerCase())) ||
    (member.email || '').toLowerCase().includes(sanitizeInput(searchTerm.toLowerCase()))
  );

  // Filter pending invitations based on search term
  const filteredInvitations = pendingInvitations.filter(inv =>
    (inv.full_name || '').toLowerCase().includes(sanitizeInput(searchTerm.toLowerCase())) ||
    (inv.email || '').toLowerCase().includes(sanitizeInput(searchTerm.toLowerCase()))
  );

  // Calculate payment statistics (includes pending invitations in total)
  const paymentStats = {
    total: members.length + pendingInvitations.length,
    active: members.length,
    pending: pendingInvitations.length,
    paid: members.filter(m => m.duesPaid).length,
    unpaid: members.filter(m => !m.duesPaid).length
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Members</h1>
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
            <span className="mr-1.5">📥</span>
            Import Roster
          </button>
          {pendingInvitations.filter(inv => inv.invitation_email_status === 'pending').length > 0 && (
            <button
              onClick={handleSendAllInvitations}
              disabled={isLoading}
              className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center disabled:opacity-50"
            >
              <span className="mr-1.5">📧</span>
              Send All Invitations ({pendingInvitations.filter(inv => inv.invitation_email_status === 'pending').length})
            </button>
          )}
          <div className="relative group">
            <button className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center">
              <span className="mr-1.5">📤</span>
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

      {/* Member Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Total Members</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{paymentStats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Active + invited members</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Pending Invites</h3>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{paymentStats.pending}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Awaiting account creation</p>
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
              {/* Active Members */}
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-300 font-medium">{(member.full_name || 'M').charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      {member.status || 'Active'}
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
              {/* Pending Invitations */}
              {filteredInvitations.map((invitation) => (
                <tr key={`inv-${invitation.id}`} className="hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors bg-amber-50/30 dark:bg-amber-900/10">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 dark:text-amber-300 font-medium">{(invitation.full_name || 'I').charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{invitation.full_name || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {invitation.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      Invited
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Pending
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleResendInvitation(invitation.id)}
                      className={`px-3 py-1 rounded transition-colors ${
                        invitation.invitation_email_status === 'pending'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                      }`}
                    >
                      {invitation.invitation_email_status === 'pending' ? 'Send Invitation' : 'Resend'}
                    </button>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="px-3 py-1 rounded transition-colors bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
              {/* Empty state */}
              {filteredMembers.length === 0 && filteredInvitations.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No members found. Import members using the button above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-10 mx-auto p-5 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md bg-white dark:bg-gray-800 ${importStep === 'preview' ? 'max-w-4xl w-full mx-4' : 'w-96'}`}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {importStep === 'upload' && 'Import Members'}
                  {importStep === 'preview' && 'Preview Import'}
                  {importStep === 'result' && 'Import Complete'}
                </h3>
                <button
                  onClick={resetImportModal}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
                >
                  ✕
                </button>
              </div>

              {/* Step: Upload */}
              {importStep === 'upload' && (
                <>
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>CSV Format:</strong> First Name, Last Name, Email, Phone, Year (1-5)
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Members will be added to the roster. You can send invitation emails from the member list when ready.
                    </p>
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
                      Or paste member data
                    </label>
                    <textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm"
                      rows="5"
                      placeholder="John, Doe, john@example.com, 555-1234, 2&#10;Jane, Smith, jane@example.com, 555-5678, 3"
                    />
                    {importError && (
                      <p className="text-red-500 dark:text-red-400 text-sm mt-2 whitespace-pre-line">{importError}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={resetImportModal}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleManualImport}
                      disabled={isLoading || !importData.trim()}
                      className={`px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center ${
                        isLoading || !importData.trim() ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Parsing...
                        </>
                      ) : (
                        'Preview Import'
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Step: Preview */}
              {importStep === 'preview' && (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Review and edit members below. Click Import when ready.
                    </p>
                    <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">First</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Phone</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Year</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                            <th className="px-2 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {parsedMembers.map((member, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={member.first_name}
                                  onChange={(e) => updateMemberField(idx, 'first_name', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={member.last_name}
                                  onChange={(e) => updateMemberField(idx, 'last_name', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="email"
                                  value={member.email}
                                  onChange={(e) => updateMemberField(idx, 'email', e.target.value.toLowerCase())}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={member.phone}
                                  onChange={(e) => updateMemberField(idx, 'phone', e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <select
                                  value={member.year}
                                  onChange={(e) => updateMemberField(idx, 'year', e.target.value)}
                                  className="w-16 px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="">-</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                  <option value="5">5</option>
                                </select>
                              </td>
                              <td className="px-2 py-1">
                                <select
                                  value={member.status}
                                  onChange={(e) => updateMemberField(idx, 'status', e.target.value)}
                                  className="w-24 px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="active">Active</option>
                                  <option value="pledge">Pledge</option>
                                  <option value="abroad">Abroad</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </td>
                              <td className="px-2 py-1">
                                <button
                                  onClick={() => removeMember(idx)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {parsedMembers.length} member{parsedMembers.length !== 1 ? 's' : ''} to import
                    </p>
                    {importError && (
                      <p className="text-amber-600 dark:text-amber-400 text-sm mt-2 whitespace-pre-line">
                        Note: Some rows had errors and were skipped:
                        <br />{importError}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => { setImportStep('upload'); setParsedMembers([]); setImportError(''); }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={isLoading || parsedMembers.length === 0}
                      className={`px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center ${
                        isLoading || parsedMembers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
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
                        `Import ${parsedMembers.length} Member${parsedMembers.length !== 1 ? 's' : ''}`
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Step: Result */}
              {importStep === 'result' && importResult && (
                <>
                  <div className="text-center py-4">
                    {importResult.imported_count > 0 ? (
                      <>
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                          <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Members Imported!
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {importResult.imported_count} member{importResult.imported_count !== 1 ? 's' : ''} added successfully.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          You can send invitation emails from the member list.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900 mb-4">
                          <svg className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No Members Imported
                        </h4>
                      </>
                    )}

                    {importResult.skipped_count > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-left">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                          {importResult.skipped_count} member{importResult.skipped_count !== 1 ? 's' : ''} skipped:
                        </p>
                        <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                          {importResult.errors?.slice(0, 5).map((err, idx) => (
                            <li key={idx}>{err.email}: {err.error}</li>
                          ))}
                          {importResult.errors?.length > 5 && (
                            <li>... and {importResult.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={resetImportModal}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Members;
