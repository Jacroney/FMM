import { supabase } from './supabaseClient';

export interface PlaidConnection {
  id: string;
  chapter_id: string;
  institution_name: string;
  last_synced_at: string | null;
  is_active: boolean;
  created_at: string;
  error_message: string | null;
}

export interface PlaidSyncResult {
  success: boolean;
  added: number;
  modified: number;
  removed: number;
  has_more: boolean;
  error?: string;
}

export class PlaidService {
  /**
   * Creates a Plaid Link token for initializing the Link flow
   */
  static async createLinkToken(chapterId: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync', {
        body: {
          action: 'create_link_token',
          chapter_id: chapterId,
        },
      });

      if (error) throw error;
      return data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  }

  /**
   * Exchanges a public token from Plaid Link for an access token
   * and stores the connection in the database
   */
  static async exchangeToken(
    publicToken: string,
    chapterId: string
  ): Promise<{ connection_id: string; institution_name: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync', {
        body: {
          action: 'exchange_token',
          public_token: publicToken,
          chapter_id: chapterId,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error exchanging token:', error);
      throw error;
    }
  }

  /**
   * Syncs transactions from Plaid to the staging table
   */
  static async syncTransactions(
    connectionId: string,
    chapterId: string
  ): Promise<PlaidSyncResult> {
    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync', {
        body: {
          action: 'sync_transactions',
          connection_id: connectionId,
          chapter_id: chapterId,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw error;
    }
  }

  /**
   * Syncs all active connections for a chapter
   */
  static async syncAll(chapterId: string): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync', {
        body: {
          action: 'sync_all',
          chapter_id: chapterId,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing all connections:', error);
      throw error;
    }
  }

  /**
   * Gets all Plaid connections for a chapter
   */
  static async getConnections(chapterId: string): Promise<PlaidConnection[]> {
    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync', {
        body: {
          action: 'get_connections',
          chapter_id: chapterId,
        },
      });

      if (error) throw error;
      return data.connections || [];
    } catch (error) {
      console.error('Error getting connections:', error);
      throw error;
    }
  }

  /**
   * Deactivates a Plaid connection
   */
  static async deactivateConnection(
    connectionId: string,
    chapterId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('plaid-sync', {
        body: {
          action: 'deactivate_connection',
          connection_id: connectionId,
          chapter_id: chapterId,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating connection:', error);
      throw error;
    }
  }

  /**
   * Runs the reconciliation function to move staging data to expenses
   */
  static async reconcile(
    chapterId: string,
    stagingTable: 'plaid_txn_staging' | 'transaction_staging' | 'switch_txn_staging' = 'plaid_txn_staging'
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('fn_reconcile_staging', {
        p_staging_table: stagingTable,
        p_chapter_id: chapterId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reconciling staging data:', error);
      throw error;
    }
  }

  /**
   * Gets unprocessed staging records for preview before reconciliation
   */
  static async getUnprocessedStaging(chapterId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('unprocessed_staging_v')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('ingested_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting unprocessed staging records:', error);
      return [];
    }
  }

  /**
   * Gets recent sync history for a chapter
   */
  static async getSyncHistory(chapterId: string, limit: number = 20): Promise<any[]> {
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

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }
}
