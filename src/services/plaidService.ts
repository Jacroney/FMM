import { supabase } from './supabaseClient';
import {
  PlaidConnection,
  PlaidAccount,
  PlaidConnectionWithDetails,
  PlaidSyncHistory,
  PlaidLinkTokenResponse,
  PlaidExchangeResponse,
  PlaidSyncResponse,
} from './types';

export class PlaidService {
  /**
   * Create a Plaid Link token to initialize the Plaid Link component
   */
  static async createLinkToken(): Promise<PlaidLinkTokenResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-create-link-token`;
      console.log('Calling Plaid function at:', url);
      console.log('Using Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create link token');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  }

  /**
   * Exchange public token for access token after user connects their bank
   */
  static async exchangePublicToken(publicToken: string): Promise<PlaidExchangeResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-exchange-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ public_token: publicToken }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to exchange token');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error exchanging token:', error);
      throw error;
    }
  }

  /**
   * Sync transactions for a specific connection
   */
  static async syncTransactions(connectionId: string): Promise<PlaidSyncResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-sync-transactions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connection_id: connectionId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync transactions');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw error;
    }
  }

  /**
   * Get all active connections for the current chapter
   */
  static async getConnections(chapterId: string): Promise<PlaidConnectionWithDetails[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_active_plaid_connections', { p_chapter_id: chapterId });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching connections:', error);
      throw error;
    }
  }

  /**
   * Get a single connection by ID
   */
  static async getConnection(connectionId: string): Promise<PlaidConnection | null> {
    try {
      const { data, error } = await supabase
        .from('plaid_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching connection:', error);
      throw error;
    }
  }

  /**
   * Get all accounts for a specific connection
   */
  static async getAccountsForConnection(connectionId: string): Promise<PlaidAccount[]> {
    try {
      const { data, error } = await supabase
        .from('plaid_accounts')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('is_active', true)
        .order('account_name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Get all accounts for the current chapter
   */
  static async getAllAccounts(chapterId: string): Promise<PlaidAccount[]> {
    try {
      const { data, error } = await supabase
        .from('plaid_accounts')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_active', true)
        .order('account_name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all accounts:', error);
      throw error;
    }
  }

  /**
   * Get total bank balance across all connected accounts
   */
  static async getTotalBankBalance(chapterId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_total_bank_balance', { p_chapter_id: chapterId });

      if (error) {
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Error fetching total balance:', error);
      throw error;
    }
  }

  /**
   * Deactivate a connection (soft delete)
   */
  static async deleteConnection(connectionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('deactivate_plaid_connection', { p_connection_id: connectionId });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      throw error;
    }
  }

  /**
   * Get sync history for a connection
   */
  static async getSyncHistory(
    connectionId: string,
    limit: number = 10
  ): Promise<PlaidSyncHistory[]> {
    try {
      const { data, error } = await supabase
        .from('plaid_sync_history')
        .select('*')
        .eq('connection_id', connectionId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching sync history:', error);
      throw error;
    }
  }

  /**
   * Get recent sync history for a chapter
   */
  static async getRecentSyncHistory(
    chapterId: string,
    limit: number = 20
  ): Promise<PlaidSyncHistory[]> {
    try {
      const { data, error } = await supabase
        .from('plaid_sync_history')
        .select(`
          *,
          plaid_connections (
            institution_name
          )
        `)
        .eq('chapter_id', chapterId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent sync history:', error);
      throw error;
    }
  }

  /**
   * Check if a connection needs to be refreshed (has errors)
   */
  static needsReconnection(connection: PlaidConnection): boolean {
    return (
      connection.error_code !== null ||
      !connection.is_active
    );
  }

  /**
   * Format last sync time for display
   */
  static formatLastSyncTime(lastSyncedAt: string | null): string {
    if (!lastSyncedAt) {
      return 'Never';
    }

    const date = new Date(lastSyncedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
