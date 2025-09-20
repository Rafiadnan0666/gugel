'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate inputs
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      // Sign up the user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      });

      if (authError) {
        console.error('Signup error:', authError);
        
        // Handle specific error cases
        if (authError.message.includes('email')) {
          setError('Invalid email address');
        } else if (authError.message.includes('password')) {
          setError('Password does not meet requirements');
        } else if (authError.message.includes('confirmation email')) {
          // Special handling for email confirmation errors
          setError('We created your account but could not send confirmation email. Please try logging in directly.');
          setSuccess(true);
        } else {
          setError(authError.message || 'Failed to create account');
        }
        return;
      }

      // If we get here, signup was successful
      if (data.user) {
        // Create user profile (optional - remove if you don't need this)
        const { error: profileError } = await supabase
          .from('users')
          .insert([{ id: data.user.id, email: data.user.email }]);

        if (profileError) {
          console.warn('Profile creation warning:', profileError);
          // This isn't a fatal error - we'll still show success
        }

        setSuccess(true);
        router.push(`/sign-in?message=${encodeURIComponent('Check your email to confirm your account')}`);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-gray-900">Create Account</h1>
        
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
            Account created successfully! Please check your email to confirm.
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password (min 6 characters)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}