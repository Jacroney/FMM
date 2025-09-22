import React, { useState } from 'react';
import Papa from 'papaparse';
import { MemberService } from '../services/memberService';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Fall 2025');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
            const formattedMembers = results.data
              .filter(row => row[0] && row[1]) // Filter out empty rows
              .map((row) => {
                const name = sanitizeInput(row[0] || '');
                const email = row[1] || '';
                
                if (!isValidEmail(email)) {
                  errors.push(`Invalid email format for ${name}`);
                  return null;
                }

                return {
                  id: crypto.randomUUID(),
                  name,
                  email,
                  status: 'Active',
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
                await MemberService.saveMembers(formattedMembers);
                setMembers(formattedMembers);
                setShowImportModal(false);
                setImportError('');
                showNotification('Members imported successfully!');
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
          const [name, email] = row.split(',').map(item => sanitizeInput(item.trim()));
          
          if (!name || !email) {
            errors.push(`Row ${index + 1}: Missing name or email`);
            return null;
          }

          if (!isValidEmail(email)) {
            errors.push(`Row ${index + 1}: Invalid email format for ${name}`);
            return null;
          }

          return {
            id: crypto.randomUUID(),
            name,
            email,
            status: 'Active',
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
          await MemberService.saveMembers(formattedMembers);
          setMembers(formattedMembers);
          setShowImportModal(false);
          setImportData('');
          setImportError('');
          showNotification('Members imported successfully!');
        } catch (error) {
          setImportError('Failed to save members. Please try again.');
        }
      }
      setIsLoading(false);
    } catch (error) {
      setImportError('Invalid format. Please use: Name, Email');
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
          <h1 className="text-2xl font-bold text-gray-800">Members</h1>
          <p className="text-sm text-gray-500 mt-1">Manage member roster and track dues payments</p>
        </div>
        <div className="flex space-x-4">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Fall 2025">Fall 2025</option>
            <option value="Winter 2026">Winter 2026</option>
            <option value="Spring 2026">Spring 2026</option>
            <option value="Summer 2026">Summer 2026</option>
          </select>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <span className="mr-2">📥</span>
            Import Roster
          </button>
          <div className="relative group">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center">
              <span className="mr-2">📤</span>
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block z-10">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('gcm')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Export as GCM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700">Total Members</h3>
          <p className="text-3xl font-bold text-blue-600">{paymentStats.total}</p>
          <p className="text-sm text-gray-500 mt-2">Active members this quarter</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700">Dues Paid</h3>
          <p className="text-3xl font-bold text-green-600">{paymentStats.paid}</p>
          <p className="text-sm text-gray-500 mt-2">Members with paid dues</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-gray-700">Dues Unpaid</h3>
          <p className="text-3xl font-bold text-red-600">{paymentStats.unpaid}</p>
          <p className="text-sm text-gray-500 mt-2">Members with pending dues</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dues Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">{member.name.charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.duesPaid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {member.duesPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.paymentDate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => togglePaymentStatus(member.id)}
                      className={`px-3 py-1 rounded transition-colors ${
                        member.duesPaid
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Import Roster</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
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
                    <p className="text-xs text-gray-500">CSV up to 5MB</p>
                  </div>
                </div>
              </div>

              {/* Manual Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or paste roster (Name, Email)
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="5"
                  placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com"
                />
                {importError && (
                  <p className="text-red-500 text-sm mt-1">{importError}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualImport}
                  disabled={isLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center ${
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
    </div>
  );
};

export default Members; 