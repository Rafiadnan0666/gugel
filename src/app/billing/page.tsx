'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { billingService, type BillingPlan } from '@/lib/billing';
import {
  FiCreditCard, FiDollarSign, FiDownload, FiFileText, FiCheckCircle,
  FiAlertTriangle, FiRefreshCw, FiZap, FiShield, FiTrendingUp,
  FiCalendar, FiClock, FiExternalLink, FiInfo, FiStar, FiAward
} from 'react-icons/fi';

export default function BillingPage() {
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const supabase = createClient();

  const loadBillingInfo = async () => {
    try {
      const response = await fetch('/api/billing');
      if (response.ok) {
        const data = await response.json();
        setBillingInfo(data);
      }
    } catch (error) {
      console.error('Error loading billing info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingInfo();
    setPlans(billingService.getPlans());
  }, []);

  const handlePurchasePlan = async (plan: BillingPlan) => {
    try {
      setProcessingPayment(true);
      setSelectedPlan(plan);

      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_payment_intent',
          planId: plan.id,
          gateway: 'stripe'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const paymentData = await response.json();

      // Redirect to Stripe Checkout or handle payment
      if (paymentData.clientSecret) {
        // Use Stripe.js to handle payment
        const stripe = (window as any).Stripe;
        if (stripe) {
          const { error } = await stripe.confirmCardPayment(paymentData.clientSecret);
          if (error) {
            throw new Error(error.message);
          }
          await loadBillingInfo(); // Refresh billing info
        }
      }
    } catch (error) {
      console.error('Error purchasing plan:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
      setSelectedPlan(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Credits</h1>
          <p className="text-gray-600 mt-2">Manage your subscription and credits</p>
        </div>
        <button
          onClick={loadBillingInfo}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Credit Balance Card */}
      {billingInfo && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Current Balance</h2>
              <p className="text-4xl font-bold">{formatCurrency(billingInfo.creditBalance)}</p>
              <p className="text-blue-100 mt-2">Available credits for AI usage</p>
            </div>
            <div className="text-right">
              <FiDollarSign className="w-16 h-16 text-blue-200" />
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      {billingInfo?.recentInvoices && billingInfo.recentInvoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Invoices</h3>
          <div className="space-y-4">
            {billingInfo.recentInvoices.map((invoice: any) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <FiFileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Invoice #{invoice.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(invoice.created_at)} • {formatCurrency(invoice.subtotal)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                  <button className="text-blue-600 hover:text-blue-700">
                    <FiDownload className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {billingInfo.paymentMethods.map((method: any) => (
              <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FiCreditCard className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{method.display_name}</p>
                    <p className="text-sm text-gray-600">{method.name}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  method.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {method.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}