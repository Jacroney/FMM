import { Member } from './types';

export class MemberService {
  private static readonly API_BASE_URL = process.env.REACT_APP_API_URL;
  private static readonly API_KEY = process.env.REACT_APP_API_KEY;

  // Get all members
  static async getMembers(): Promise<Member[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  }

  // Save members
  static async saveMembers(members: Member[]): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(members),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving members:', error);
      throw error;
    }
  }

  // Update member payment status
  static async updatePaymentStatus(memberId: string, duesPaid: boolean): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/members/${memberId}/payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duesPaid,
          paymentDate: duesPaid ? new Date().toISOString() : null,
          lastUpdated: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
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