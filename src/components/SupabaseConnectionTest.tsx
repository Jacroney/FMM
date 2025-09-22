import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export const SupabaseConnectionTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult('Testing connection...');

    try {
      // Test 1: Check if Supabase client is configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setTestResult('❌ Environment variables not set! Check your .env file.');
        return;
      }

      // Test 2: Try to fetch from each table
      const tests = [];
      
      // Test transactions table
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('count')
        .limit(1);
      
      if (txError) {
        tests.push(`❌ Transactions table: ${txError.message}`);
      } else {
        tests.push(`✅ Transactions table connected`);
      }

      // Test members table
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('count')
        .limit(1);
      
      if (memberError) {
        tests.push(`❌ Members table: ${memberError.message}`);
      } else {
        tests.push(`✅ Members table connected`);
      }

      // Test budgets table
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('count')
        .limit(1);
      
      if (budgetError) {
        tests.push(`❌ Budgets table: ${budgetError.message}`);
      } else {
        tests.push(`✅ Budgets table connected`);
      }

      setTestResult(tests.join('\n'));
      
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4">Supabase Connection Test</h2>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Not set'}</p>
          <p><strong>Supabase Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</p>
        </div>

        <button
          onClick={testConnection}
          disabled={isTesting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>

        {testResult && (
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {testResult}
          </pre>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Troubleshooting:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>If you see "relation does not exist", create the tables using the SQL in SUPABASE_SETUP.md</li>
            <li>If you see "JWT expired", check your API key in the Supabase dashboard</li>
            <li>If variables are not set, update your .env file and restart the dev server</li>
          </ul>
        </div>
      </div>
    </div>
  );
};