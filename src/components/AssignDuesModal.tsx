import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Calendar, FileText, Search, User, Mail, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { DuesConfiguration } from '../services/types';

interface MemberOption {
  id: string;
  email: string;
  name: string;
  type: 'member' | 'invitation';
}

interface AssignDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  config: DuesConfiguration | null;
  onSuccess?: () => void;
}

const AssignDuesModal: React.FC<AssignDuesModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  config,
  onSuccess
}) => {
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [amount, setAmount] = useState(config?.default_dues?.toString() || '');
  const [dueDate, setDueDate] = useState(config?.due_date || '');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [invitations, setInvitations] = useState<MemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch members and invitations when modal opens
  useEffect(() => {
    if (isOpen && chapterId) {
      fetchMembersAndInvitations();
    }
  }, [isOpen, chapterId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const fetchMembersAndInvitations = async () => {
    setIsLoading(true);
    try {
      // Fetch existing members
      const { data: memberData, error: memberError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('chapter_id', chapterId)
        .order('full_name');

      if (memberError) throw memberError;

      // Fetch pending invitations
      const { data: invitationData, error: invitationError } = await supabase
        .from('member_invitations')
        .select('id, email, first_name, last_name')
        .eq('chapter_id', chapterId)
        .eq('status', 'pending')
        .order('first_name');

      if (invitationError) throw invitationError;

      // Transform to options
      const memberOptions: MemberOption[] = (memberData || []).map(m => ({
        id: m.id,
        email: m.email,
        name: m.full_name || m.email,
        type: 'member' as const
      }));

      const invitationOptions: MemberOption[] = (invitationData || []).map(i => ({
        id: i.id,
        email: i.email,
        name: `${i.first_name} ${i.last_name}`.trim() || i.email,
        type: 'invitation' as const
      }));

      setMembers(memberOptions);
      setInvitations(invitationOptions);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter options based on search
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvitations = invitations.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  const handleSelectMember = (option: MemberOption) => {
    setSelectedMember(option);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config) {
      toast.error('Please create a dues configuration first');
      return;
    }

    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }

    setIsProcessing(true);

    try {
      // Call the database function to assign dues by email
      const { data, error } = await supabase.rpc('assign_dues_by_email', {
        p_chapter_id: chapterId,
        p_email: selectedMember.email,
        p_config_id: config.id,
        p_base_amount: parseFloat(amount),
        p_due_date: dueDate || null,
        p_notes: notes || null
      });

      if (error) {
        console.error('Error assigning dues:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to assign dues');
      }

      // Show success message
      toast.success(`Dues assigned to ${selectedMember.name}!`);

      // Reset form and close
      resetForm();
      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to assign dues');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedMember(null);
    setAmount(config?.default_dues?.toString() || '');
    setDueDate(config?.due_date || '');
    setNotes('');
    setSearchTerm('');
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetForm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assign Dues
          </h3>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Member Selection Dropdown */}
            <div ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                Select Member *
              </label>

              {/* Selected Member Display / Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-left text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {selectedMember ? (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedMember.type === 'member'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    }`}>
                      {selectedMember.type === 'member' ? 'Member' : 'Invited'}
                    </span>
                    <span>{selectedMember.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      ({selectedMember.email})
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    {isLoading ? 'Loading...' : 'Select a member...'}
                  </span>
                )}
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full max-w-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-72 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="overflow-y-auto max-h-56">
                    {/* Members Section */}
                    {filteredMembers.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
                          Members ({filteredMembers.length})
                        </div>
                        {filteredMembers.map((member) => (
                          <button
                            key={`member-${member.id}`}
                            type="button"
                            onClick={() => handleSelectMember(member)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                              <span className="text-green-600 dark:text-green-300 text-sm font-medium">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {member.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {member.email}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Pending Invitations Section */}
                    {filteredInvitations.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
                          Pending Invitations ({filteredInvitations.length})
                        </div>
                        {filteredInvitations.map((invitation) => (
                          <button
                            key={`invitation-${invitation.id}`}
                            type="button"
                            onClick={() => handleSelectMember(invitation)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                              <Mail className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {invitation.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {invitation.email}
                              </div>
                            </div>
                            <span className="flex-shrink-0 text-xs text-amber-600 dark:text-amber-400">
                              Invited
                            </span>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Empty State */}
                    {filteredMembers.length === 0 && filteredInvitations.length === 0 && (
                      <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'No members found matching your search' : 'No members available'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Amount *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Reason/Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                Reason / Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g., Spring 2025 chapter dues, Social event fee, etc."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !selectedMember}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Assign Dues'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignDuesModal;
