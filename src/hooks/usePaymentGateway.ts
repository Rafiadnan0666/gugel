import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

type PaymentResult = {
    success: boolean;
    message?: string;
    data?: any;
};

type StripeCreateResponse = {
    publishableKey?: string;
    clientSecret?: string;
    checkoutUrl?: string;
};

type MidtransCreateResponse = {
    snapToken?: string;
    redirectUrl?: string;
};

type UsePaymentGatewayOptions = {
    stripeEndpoint?: string; // backend endpoint that creates Stripe session / payment intent
    midtransEndpoint?: string; // backend endpoint that creates Midtrans snap token
    midtransScriptUrl?: string; // optional custom snap.js url (sandbox/production)
};

export default function usePaymentGateway(options?: UsePaymentGatewayOptions) {
    const stripeEndpoint = options?.stripeEndpoint ?? '/api/payments/stripe';
    const midtransEndpoint = options?.midtransEndpoint ?? '/api/payments/midtrans';
    const defaultMidtransScript = options?.midtransScriptUrl ?? 'https://app.sandbox.midtrans.com/snap/snap.js';

    const [loading, setLoading] = useState(false);

    const loadMidtransScript = useCallback(async (scriptUrl = defaultMidtransScript, clientKey?: string) => {
        if (typeof window === 'undefined') return;
        // if script already present, resolve immediately
        if ((window as any).snap) return;
        return new Promise<void>((resolve, reject) => {
            const existing = document.querySelector(`script[src="${scriptUrl}"]`);
            if (existing) {
                // ensure data-client-key exists if provided
                if (clientKey && !(existing as HTMLScriptElement).getAttribute('data-client-key')) {
                    (existing as HTMLScriptElement).setAttribute('data-client-key', clientKey);
                }
                // wait a short while for window.snap to appear
                const t = setInterval(() => {
                    if ((window as any).snap) {
                        clearInterval(t);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(t);
                    if ((window as any).snap) resolve();
                    else reject(new Error('Midtrans script loaded but snap not available'));
                }, 5000);
                return;
            }

            const s = document.createElement('script');
            s.src = scriptUrl;
            if (clientKey) s.setAttribute('data-client-key', clientKey);
            s.onload = () => {
                // give snap a moment to initialize
                setTimeout(() => {
                    if ((window as any).snap) resolve();
                    else reject(new Error('Midtrans snap not available after script load'));
                }, 300);
            };
            s.onerror = (err) => reject(new Error('Failed to load Midtrans script'));
            document.body.appendChild(s);
        });
    }, [defaultMidtransScript]);

    const payWithStripe = useCallback(
        async (payload: Record<string, any> = {}): Promise<PaymentResult> => {
            setLoading(true);
            try {
                // Backend should return either { checkoutUrl } for Stripe Checkout
                // or { publishableKey, clientSecret } for PaymentIntent flows
                const res = await fetch(stripeEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Stripe endpoint error: ${text}`);
                }

                const data: StripeCreateResponse = await res.json();

                if (data.checkoutUrl) {
                    // Redirect user to Stripe Checkout (recommended)
                    window.location.assign(data.checkoutUrl);
                    return { success: true, message: 'Redirecting to Stripe Checkout', data };
                }

                if (!data.publishableKey || !data.clientSecret) {
                    throw new Error('Missing publishableKey or clientSecret from Stripe response');
                }

                const stripe = await loadStripe(data.publishableKey);
                if (!stripe) throw new Error('Failed to initialize Stripe.js');

                // Try to confirm payment without card element (useful for saved payment methods / server-side confirmation).
                // If your flow requires collecting card details on client, adapt to render a PaymentElement or CardElement instead.
                const result = await (stripe as any).confirmCardPayment(data.clientSecret);
                if (result.error) {
                    throw result.error;
                }
                return { success: true, message: 'Payment succeeded', data: result };
            } catch (err: any) {
                return { success: false, message: err?.message ?? 'Unknown Stripe error', data: err };
            } finally {
                setLoading(false);
            }
        },
        [stripeEndpoint]
    );

    const payWithMidtrans = useCallback(
        async (payload: Record<string, any> = {}, scriptUrl?: string): Promise<PaymentResult> => {
            setLoading(true);
            try {
                // Backend should return { snapToken } or { redirectUrl } depending on server-side integration
                const res = await fetch(midtransEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Midtrans endpoint error: ${text}`);
                }

                const data: MidtransCreateResponse & { clientKey?: string } = await res.json();

                // If backend decides to redirect (server side) just navigate
                if (data.redirectUrl) {
                    window.location.assign(data.redirectUrl);
                    return { success: true, message: 'Redirecting to Midtrans', data };
                }

                if (!data.snapToken) {
                    throw new Error('Missing snapToken from Midtrans response');
                }

                // Try to ensure snap.js is loaded. Backend may also supply clientKey to set as data-client-key.
                // Use provided scriptUrl or our default.
                await loadMidtransScript(scriptUrl ?? defaultMidtransScript, (data as any).clientKey);

                if (!(window as any).snap || typeof (window as any).snap.pay !== 'function') {
                    throw new Error('Midtrans snap is not available');
                }

                return await new Promise<PaymentResult>((resolve) => {
                    (window as any).snap.pay(data.snapToken, {
                        onSuccess: (result: any) => resolve({ success: true, message: 'Payment success', data: result }),
                        onPending: (result: any) => resolve({ success: true, message: 'Payment pending', data: result }),
                        onError: (result: any) => resolve({ success: false, message: 'Payment error', data: result }),
                        onClose: () => resolve({ success: false, message: 'Payment popup closed by user' }),
                    });
                });
            } catch (err: any) {
                return { success: false, message: err?.message ?? 'Unknown Midtrans error', data: err };
            } finally {
                setLoading(false);
            }
        },
        [midtransEndpoint, loadMidtransScript, defaultMidtransScript]
    );

    return {
        loading,
        payWithStripe,
        payWithMidtrans,
    };
}