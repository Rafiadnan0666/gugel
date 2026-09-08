"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FiDollarSign, FiTrendingUp, FiUsers, FiCalendar } from 'react-icons/fi';
import Layout from "@/components/Layout";

interface CreditStats {
  totalCredits: number;
  activeUsers: number;
  creditsUsed: number;
  creditsPurchased: number;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  source: 'payment' | 'ai_usage' | 'admin_adjustment' | 'refund';
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminCreditsPage() {
  const [stats, setStats] = useState<CreditStats>({
    totalCredits: 0,
    activeUsers: 0,
    creditsUsed: 0,
    creditsPurchased: 0,
  });
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadCreditData = useCallback(async () => {
    try {
      // Get total credits
      const { data: creditBalances } = await supabase
        .from('user_credits')
        .select('balance');

      const totalCredits = creditBalances?.reduce((sum: number, credit: any) => sum + credit.balance, 0) || 0;

      // Get active users with credits
      const { data: activeUsers } = await supabase
        .from('user_credits')
        .select('user_id')
        .gt('balance', 0);

      // Get credit transactions
      const { data: transactionData } = await supabase
        .from('credit_ledger')
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const creditsPurchased = transactionData?.filter((t: any) => t.source === 'payment')
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      const creditsUsed = Math.abs(transactionData?.filter((t: any) => t.source === 'ai_usage')
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0);

      setStats({
        totalCredits,
        activeUsers: activeUsers?.length || 0,
        creditsUsed,
        creditsPurchased,
      });

      setTransactions(transactionData || []);
    } catch (error) {
      console.error("Error loading credit data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCreditData();
  }, [loadCreditData]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Credits Management
        </h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <FiDollarSign className="text-3xl text-blue-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalCredits.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Credits
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <FiUsers className="text-3xl text-green-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeUsers}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Active Users
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <FiTrendingUp className="text-3xl text-purple-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.creditsPurchased.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Credits Purchased
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <FiCalendar className="text-3xl text-orange-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.creditsUsed.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Credits Used
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Credit Transactions
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Balance After
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.profiles?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.profiles?.email || 'No email'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.source === 'payment' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                          transaction.source === 'ai_usage' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                          transaction.source === 'admin_adjustment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {transaction.source.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {transaction.balance_after}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}