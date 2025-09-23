import { supabase } from './supabaseClient';
import { Member } from './types';

export class MemberService {
  // Fetch all members for a specific chapter
  static async getMembers(chapterId: string): Promise<Member[]> {
    if (!chapterId) {
      console.error('Chapter ID is required for getMembers');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(member => ({
        id: member.id,
        chapter_id: member.chapter_id,
        name: member.name,
        email: member.email,
        status: member.status as 'Active' | 'Inactive' | 'Pledge' | 'Alumni',
        year: member.year,
        duesPaid: member.dues_paid,
        paymentDate: member.payment_date,
        semester: member.semester,
        lastUpdated: member.last_updated
      }));
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  }

  // Add a new member
  static async addMember(member: Omit<Member, 'id'>): Promise<Member> {
    try {
      const { data, error } = await supabase
        .from('members')
        .insert({
          chapter_id: member.chapter_id,
          name: member.name,
          email: member.email,
          status: member.status,
          year: member.year,
          dues_paid: member.duesPaid,
          payment_date: member.paymentDate,
          semester: member.semester,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        chapter_id: data.chapter_id,
        name: data.name,
        email: data.email,
        status: data.status as 'Active' | 'Inactive' | 'Pledge' | 'Alumni',
        year: data.year,
        duesPaid: data.dues_paid,
        paymentDate: data.payment_date,
        semester: data.semester,
        lastUpdated: data.last_updated
      };
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  // Update member payment status
  static async updatePaymentStatus(memberId: string, duesPaid: boolean): Promise<void> {
    try {
      const updateData = {
        dues_paid: duesPaid,
        payment_date: duesPaid ? new Date().toISOString() : null,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Update a member
  static async updateMember(id: string, updates: Partial<Omit<Member, 'id'>>): Promise<Member> {
    try {
      const updateData: any = {
        name: updates.name,
        email: updates.email,
        status: updates.status,
        year: updates.year,
        dues_paid: updates.duesPaid,
        payment_date: updates.paymentDate,
        semester: updates.semester,
        last_updated: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key =>
        updateData[key] === undefined && delete updateData[key]
      );

      const { data, error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        chapter_id: data.chapter_id,
        name: data.name,
        email: data.email,
        status: data.status as 'Active' | 'Inactive' | 'Pledge' | 'Alumni',
        year: data.year,
        duesPaid: data.dues_paid,
        paymentDate: data.payment_date,
        semester: data.semester,
        lastUpdated: data.last_updated
      };
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  // Delete a member
  static async deleteMember(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  }

  // Export members to CSV
  static exportToCSV(members: Member[]): string {
    const headers = ['Name', 'Email', 'Status', 'Year', 'Dues Paid', 'Payment Date', 'Semester'];
    const rows = members.map(member => [
      member.name,
      member.email,
      member.status,
      member.year || '',
      member.duesPaid ? 'Yes' : 'No',
      member.paymentDate || '',
      member.semester
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  // Export members to GCM format
  static exportToGCM(members: Member[]): string {
    const gcmData = members.map(member => ({
      name: member.name,
      email: member.email,
      status: member.status,
      year: member.year,
      duesStatus: member.duesPaid ? 'PAID' : 'UNPAID',
      paymentDate: member.paymentDate,
      semester: member.semester
    }));

    return JSON.stringify(gcmData, null, 2);
  }

  // Batch import members (for CSV import)
  static async importMembers(members: Omit<Member, 'id'>[]): Promise<Member[]> {
    try {
      const results: Member[] = [];

      // Import members one by one to get proper error handling
      for (const member of members) {
        try {
          const savedMember = await this.addMember(member);
          results.push(savedMember);
        } catch (error) {
          console.error(`Failed to import member ${member.name}:`, error);
          // Continue with other members even if one fails
        }
      }

      return results;
    } catch (error) {
      console.error('Batch import failed:', error);
      throw error;
    }
  }
} 