"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';

export default function ProfilePreferencesPage() {
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .single();

        if (error) {
          console.error('Error fetching preferences:', error);
        } else {
          setPreferences(data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error in loadPreferences:', error);
        setLoading(false);
      }
    };

    loadPreferences();
  }, [supabase]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 border-t-transparent"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading preferences...
          </span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Preferences</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {preferences ? (
            <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 p-4 rounded overflow-x-auto">
              {JSON.stringify(preferences, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              No preferences set yet.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}