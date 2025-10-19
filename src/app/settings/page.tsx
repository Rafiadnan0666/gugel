'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IProfile, ISettings } from '@/types/main.db';
import ToggleSwitch from '@/components/settings/ToggleSwitch';
import Dropdown from '@/components/settings/Dropdown';

export default function SettingsPage() {
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [settings, setSettings] = useState<Partial<ISettings>>({});
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setSettings(profileData.settings ?? {});
      setLoading(false);
    };

    fetchProfile();
  }, [router, supabase]);

  const handleSettingChange = (key: keyof ISettings, value: ISettings[keyof ISettings]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSettingsSave = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setSaveError((err as Error).message || 'Failed to update settings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 pt-24 font-poppins">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">Settings</h1>
          <div className="bg-white rounded-lg shadow p-6">
            {saveError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{saveError}</div>
            )}
            {saveSuccess && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                Settings saved successfully!
              </div>
            )}
            
            <div className="space-y-4">
              <ToggleSwitch
                label="Enable AI Suggestions"
                enabled={settings.enable_ai_suggestions ?? false}
                onChange={(value) => handleSettingChange('enable_ai_suggestions', value)}
              />
              <ToggleSwitch
                label="Enable Dark Mode"
                enabled={settings.enable_dark_mode ?? false}
                onChange={(value) => handleSettingChange('enable_dark_mode', value)}
              />
              <ToggleSwitch
                label="Enable Notifications"
                enabled={settings.enable_notifications ?? true}
                onChange={(value) => handleSettingChange('enable_notifications', value)}
              />
              <ToggleSwitch
                label="Auto-save Drafts"
                enabled={settings.auto_save_drafts ?? false}
                onChange={(value) => handleSettingChange('auto_save_drafts', value)}
              />
              <ToggleSwitch
                label="Disable Sync"
                enabled={settings.disable_sync ?? false}
                onChange={(value) => handleSettingChange('disable_sync', value)}
              />
              <Dropdown
                label="AI Model"
                value={settings.ai_model ?? 'gpt-3.5'}
                options={[
                  { value: 'gpt-3.5', label: 'GPT-3.5' },
                  { value: 'gpt-4', label: 'GPT-4' },
                ]}
                onChange={(value) => handleSettingChange('ai_model', value as 'gpt-3.5' | 'gpt-4')}
              />
              <Dropdown
                label="Default PDF Template"
                value={settings.default_pdf_template ?? 'simple'}
                options={[
                  { value: 'simple', label: 'Simple' },
                  { value: 'academic', label: 'Academic' },
                  { value: 'research', label: 'Research Paper' },
                ]}
                onChange={(value) => handleSettingChange('default_pdf_template', value as 'simple' | 'academic' | 'research')}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSettingsSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}