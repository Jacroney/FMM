import React, { useState, useEffect } from 'react';
import { InvitationService, InvitationWithDetails } from '../services/invitationService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Invitations() {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [emails, setEmails] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'exec' | 'member'>('member');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await InvitationService.getChapterInvitations();
      console.log('Loaded invitations:', data);
      setInvitations(data);
    } catch (err: any) {
      console.error('Failed to load invitations:', err);
      setError(err?.message || 'Failed to load invitations');
      toast.error('Failed to load invitations. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitations = async () => {
    if (!emails.trim() || !profile?.chapter_id) {
      toast.error('Please enter at least one email address');
      return;
    }

    setCreating(true);
    try {
      // Split by newlines, commas, or semicolons and filter empty
      const emailList = emails
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const result = await InvitationService.createInvitations(
        emailList,
        profile.chapter_id,
        selectedRole
      );

      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`${successCount} invitation(s) created successfully!`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} invitation(s) failed to create`);
      }

      setEmails('');
      setShowCreateModal(false);
      loadInvitations();
    } catch (error) {
      toast.error('Failed to create invitations');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const success = await InvitationService.copyInvitationLink(token);
    if (success) {
      toast.success('Invitation link copied to clipboard!');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    const success = await InvitationService.revokeInvitation(invitationId);
    if (success) {
      toast.success('Invitation revoked');
      loadInvitations();
    } else {
      toast.error('Failed to revoke invitation');
    }
  };

  const handleResend = async (invitationId: string) => {
    const success = await InvitationService.resendInvitation(invitationId);
    if (success) {
      toast.success('Invitation renewed with new expiry date');
      loadInvitations();
    } else {
      toast.error('Failed to resend invitation');
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();

    if (status === 'accepted') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Accepted</span>;
    }
    if (status === 'revoked') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Revoked</span>;
    }
    if (isExpired) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Expired</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Pending</span>;
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      exec: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      member: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role as keyof typeof colors]}`}>{role}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invitations</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Invitations</h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadInvitations}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invitations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage member invitations for your chapter
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create Invitations
        </button>
      </div>

      {/* Invitations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No invitations yet. Create your first invitation to get started!
                  </td>
                </tr>
              ) : (
                invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getRoleBadge(invitation.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {invitation.status === 'pending' && new Date(invitation.expires_at) > new Date() && (
                        <>
                          <button
                            onClick={() => handleCopyLink(invitation.token)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Copy invitation link"
                          >
                            Copy Link
                          </button>
                          <button
                            onClick={() => handleRevoke(invitation.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Revoke invitation"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                      {invitation.status === 'pending' && new Date(invitation.expires_at) <= new Date() && (
                        <button
                          onClick={() => handleResend(invitation.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Renew invitation"
                        >
                          Renew
                        </button>
                      )}
                      {invitation.status === 'accepted' && (
                        <span className="text-gray-400">✓ Accepted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invitation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Create Invitations
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Addresses
                </label>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="Enter email addresses (one per line, or comma-separated)&#10;&#10;example@email.com&#10;another@email.com"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Separate multiple emails with commas, semicolons, or new lines
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'exec' | 'member')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           dark:bg-gray-700 dark:text-white"
                >
                  <option value="member">Member</option>
                  <option value="exec">Executive Board</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvitations}
                disabled={creating || !emails.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Invitations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
