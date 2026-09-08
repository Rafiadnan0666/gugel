'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FiCreditCard, FiDollarSign, FiLoader, FiCheck, FiX } from 'react-icons/fi';

interface PaymentFormProps {
  readonly onPaymentSuccess?: (paymentData: any) => void;
  readonly onPaymentError?: (error: string) => void;
}

interface PaymentPackage {
  readonly id: string;
  readonly credits: number;
  readonly price: number;
  readonly description: string;
}

const PAYMENT_PACKAGES: readonly PaymentPackage[] = [
  { id: 'starter', credits: 100, price: 10000, description: 'Perfect for getting started' },
  { id: 'pro', credits: 500, price: 45000, description: 'Best value for regular users' },
  { id: 'enterprise', credits: 1000, price: 80000, description: 'Maximum power for heavy users' },
];

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

function loadMidtransScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.snap) return resolve();

    const existing = document.querySelector('script[src*="snap/snap.js"]');
    if (existing) {
      const check = setInterval(() => {
        if (window.snap) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); window.snap ? resolve() : reject(new Error('Timeout')); }, 5000);
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
    const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
    const snapUrl = isProd
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';

    const script = document.createElement('script');
    script.src = snapUrl;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.snap) resolve();
        else reject(new Error('snap not available after load'));
      }, 300);
    };
    script.onerror = () => reject(new Error('Failed to load Midtrans script'));
    document.body.appendChild(script);
  });
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onPaymentSuccess, onPaymentError }) => {
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'bank_transfer'>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    loadMidtransScript()
      .then(() => setScriptReady(true))
      .catch(() => setScriptReady(false));
  }, []);

  const handlePayment = useCallback(async () => {
    if (!selectedPackage) return;
    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      const response = await fetch('/api/payments/midtrans/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPackage.price,
          credits: selectedPackage.credits,
          paymentType: paymentMethod,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      // If redirect URL, navigate directly
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      // If snap token, use snap popup
      if (result.snapToken) {
        await loadMidtransScript();
        if (!window.snap) throw new Error('Midtrans Snap popup not loaded. Check NEXT_PUBLIC_MIDTRANS_CLIENT_KEY env var.');

        window.snap.pay(result.snapToken, {
          onSuccess: (data: any) => {
            onPaymentSuccess?.(data);
            setCurrentStep('success');
          },
          onPending: () => {
            setCurrentStep('processing');
          },
          onError: (err: any) => {
            onPaymentError?.(err?.status_message || 'Payment failed');
            setCurrentStep('error');
          },
          onClose: () => {
            setCurrentStep('select');
            setIsProcessing(false);
          },
        });
        return;
      }

      // Fallback
      onPaymentSuccess?.(result);
      setCurrentStep('success');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onPaymentError?.(errorMessage);
      setCurrentStep('error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPackage, paymentMethod, onPaymentSuccess, onPaymentError]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {currentStep === 'select' && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Credit Package</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PAYMENT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`p-4 border rounded-lg transition-all text-left ${
                    selectedPackage?.id === pkg.id
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{pkg.credits}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Credits</div>
                  <div className="mt-2 text-lg font-semibold text-orange-600 dark:text-orange-400">
                    Rp {pkg.price.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{pkg.description}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedPackage && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Method</h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="radio" name="pm" value="credit_card" checked={paymentMethod === 'credit_card'}
                    onChange={() => setPaymentMethod('credit_card')} className="mr-3" />
                  <FiCreditCard className="mr-2 text-orange-500" />
                  <span className="text-gray-900 dark:text-white">Credit Card / E-Wallet</span>
                </label>
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="radio" name="pm" value="bank_transfer" checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')} className="mr-3" />
                  <FiDollarSign className="mr-2 text-orange-500" />
                  <span className="text-gray-900 dark:text-white">Bank Transfer</span>
                </label>
              </div>
            </div>
          )}

          {selectedPackage && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handlePayment}
                disabled={isProcessing || !scriptReady}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isProcessing ? (
                  <><FiLoader className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : !scriptReady ? (
                  <><FiLoader className="w-4 h-4 mr-2 animate-spin" /> Loading payment...</>
                ) : (
                  `Pay Rp ${selectedPackage.price.toLocaleString()}`
                )}
              </button>
            </div>
          )}
        </>
      )}

      {currentStep === 'processing' && (
        <div className="flex flex-col items-center justify-center py-8">
          <FiLoader className="w-12 h-12 text-orange-500 animate-spin mb-4" />
          <p className="text-gray-900 dark:text-white">Processing your payment...</p>
        </div>
      )}

      {currentStep === 'success' && (
        <div className="flex flex-col items-center justify-center py-8">
          <FiCheck className="w-12 h-12 text-green-500 mb-4" />
          <p className="text-gray-900 dark:text-white">Payment successful!</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {selectedPackage?.credits} credits added to your account.
          </p>
        </div>
      )}

      {currentStep === 'error' && (
        <div className="flex flex-col items-center justify-center py-8">
          <FiX className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-gray-900 dark:text-white">Payment failed</p>
          <button onClick={() => { setCurrentStep('select'); setIsProcessing(false); }}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(PaymentForm);
