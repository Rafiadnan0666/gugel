'use client';
import React from 'react';
import MidtransPaymentForm from '@/components/MidtransPaymentForm';
import Layout from '@/components/Layout';

export default function PaymentsPage() {
  const handlePaymentSuccess = (paymentData: any) => {
    console.log('Payment successful:', paymentData);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Purchase Credits
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Add credits to your account to unlock premium features
          </p>
        </div>

        <MidtransPaymentForm
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>
    </div>
    </Layout>
  );
}