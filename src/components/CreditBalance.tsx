"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function CreditBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: creditData } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        const { data: historyData } = await supabase
          .from('credit_ledger')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setBalance(creditData?.balance || 0);
        setHistory(historyData || []);
      } catch (error) {
        console.error('Error fetching credit data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Credit Balance
        </h2>
        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
          {balance.toLocaleString()}
        </p>
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Activity
          </h3>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.source === 'payment' ? 'Purchase' : 'Usage'}
                </span>
                <span className={`font-medium ${
                  item.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}