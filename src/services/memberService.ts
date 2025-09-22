import { supabase } from './supabaseClient';
import { Member } from './types';

export class MemberService {
  // Fetch all members for a specific chapter
  static async getMembers(chapterId?: string): Promise<Member[]> {
    try {
      let query = supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });

      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(member => ({
        id: member.id,
        chapter_id: member.chapter_id,
        name: member.name,
        email: member.email,
        status: member.status as 'Active' | 'Inactive',
        duesPaid: member.duesPaid,
        paymentDate: member.paymentDate,
        semester: member.semester,
        lastUpdated: member.lastUpdated
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
          duesPaid: member.duesPaid,
          paymentDate: member.paymentDate,
          semester: member.semester,
          lastUpdated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        chapter_id: data.chapter_id,
        name: data.name,
        email: data.email,
        status: data.status as 'Active' | 'Inactive',
        duesPaid: data.duesPaid,
        paymentDate: data.paymentDate,
        semester: data.semester,
        lastUpdated: data.lastUpdated
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
        duesPaid,
        paymentDate: duesPaid ? new Date().toISOString() : null,
        lastUpdated: new Date().toISOString()
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
        ...updates,
        lastUpdated: new Date().toISOString()
      };

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
        status: data.status as 'Active' | 'Inactive',
        duesPaid: data.duesPaid,
        paymentDate: data.paymentDate,
        semester: data.semester,
        lastUpdated: data.lastUpdated
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
    const headers = ['Name', 'Email', 'Status', 'Dues Paid', 'Payment Date', 'Semester'];
    const rows = members.map(member => [
      member.name,
      member.email,
      member.status,
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
      duesStatus: member.duesPaid ? 'PAID' : 'UNPAID',
      paymentDate: member.paymentDate,
      semester: member.semester
    }));

    return JSON.stringify(gcmData, null, 2);
  }
} 