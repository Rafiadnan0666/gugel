'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import MidtransPaymentForm from '@/components/MidtransPaymentForm';
import { createClient } from '@/utils/supabase/client';
import { FiCreditCard, FiTrendingUp, FiTrendingDown, FiClock, FiRefreshCw, FiZap, FiFileText, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi';

interface LedgerEntry {
  id: string;
  source: string;
  amount: number;
  balance_after: number;
  created_at: string;
  reference_id?: string;
}

interface UsageLog {
  id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
}

interface Invoice {
  id: string;
  subtotal: number;
  status: string;
  created_at: string;
  period_start: string;
  period_end: string;
  invoice_items?: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function CreditsPage() {
  const supabase = createClient();
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'usage' | 'invoices' | 'buy'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch credit balance
      const { data: creditData } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      setBalance(creditData?.balance || 0);

      // Fetch ledger
      const { data: ledgerData } = await supabase
        .from('credit_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setLedger(ledgerData || []);

      // Fetch usage logs
      const { data: usageData } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setUsageLogs(usageData || []);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch invoice items separately and merge
      if (invoicesData && invoicesData.length > 0) {
        const invoiceIds = invoicesData.map((inv: any) => inv.id);
        const { data: itemsData } = await supabase
          .from('invoice_items')
          .select('*')
          .in('invoice_id', invoiceIds);

        const itemsByInvoice = (itemsData || []).reduce((acc: any, item: any) => {
          if (!acc[item.invoice_id]) acc[item.invoice_id] = [];
          acc[item.invoice_id].push(item);
          return acc;
        }, {});

        setInvoices(invoicesData.map((inv: any) => ({ ...inv, invoice_items: itemsByInvoice[inv.id] || [] })));
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching credit data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const totalEarned = ledger.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const totalSpent = ledger.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'payment': return 'Purchase';
      case 'ai_usage': return 'AI Usage';
      case 'admin_adjustment': return 'Adjustment';
      case 'refund': return 'Refund';
      default: return source;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><FiCheckCircle /> Paid</span>;
      case 'pending': return <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium"><FiClock /> Pending</span>;
      case 'failed': return <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><FiXCircle /> Failed</span>;
      case 'draft': return <span className="flex items-center gap-1 text-gray-500 text-xs font-medium"><FiFileText /> Draft</span>;
      case 'overdue': return <span className="flex items-center gap-1 text-orange-600 text-xs font-medium"><FiClock /> Overdue</span>;
      default: return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'history' as const, label: 'History' },
    { id: 'usage' as const, label: 'AI Usage' },
    { id: 'invoices' as const, label: 'Invoices' },
    { id: 'buy' as const, label: 'Buy Credits' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credits & Billing</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your credits, usage, and invoices</p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white mb-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Available Credits</p>
                <p className="text-4xl font-bold mt-1">{loading ? '...' : balance.toLocaleString()}</p>
              </div>
              <FiCreditCard className="w-12 h-12 text-orange-200 opacity-50" />
            </div>
            <div className="flex gap-6 mt-4 pt-4 border-t border-orange-400/30">
              <div>
                <p className="text-orange-100 text-xs">Total Earned</p>
                <p className="text-lg font-semibold">+{totalEarned.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-orange-100 text-xs">Total Spent</p>
                <p className="text-lg font-semibold">-{totalSpent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-orange-100 text-xs">AI Calls</p>
                <p className="text-lg font-semibold">{usageLogs.length}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <FiCreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FiTrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Earned</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">+{totalEarned.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <FiTrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">-{totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FiFileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Invoices</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Credit History */}
          {activeTab === 'history' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {ledger.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No credit history yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{getSourceLabel(entry.source)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(entry.created_at)}</td>
                        <td className={`px-4 py-3 text-sm font-semibold text-right ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.amount >= 0 ? '+' : ''}{entry.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">{entry.balance_after.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* AI Usage */}
          {activeTab === 'usage' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {usageLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No AI usage yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tokens</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {usageLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          <div>{log.total_tokens?.toLocaleString() || 0} tokens</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{log.input_tokens} in / {log.output_tokens} out</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(log.created_at)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right">
                          -{(log.cost || 0).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Invoices */}
          {activeTab === 'invoices' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No invoices yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">{inv.id.substring(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {inv.invoice_items?.map((i: InvoiceItem) => i.description).join(', ') || 'No items'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(inv.status)}
                            {inv.status === 'draft' && (
                              <button
                                onClick={() => setActiveTab('buy')}
                                className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded hover:bg-orange-600 transition-colors"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(inv.created_at)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">
                          {Number(inv.subtotal || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Buy Credits */}
          {activeTab === 'buy' && (
            <MidtransPaymentForm
              onPaymentSuccess={() => fetchData()}
              onPaymentError={(err) => console.error('Payment error:', err)}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
