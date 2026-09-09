'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { Profile } from '@/types/main.db';
import { FiSave, FiUser, FiBell, FiCpu, FiShield, FiMoon, FiSun, FiGlobe, FiCheck } from 'react-icons/fi';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'preferences' | 'notifications' | 'security'>('profile');

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Settings fields
  const [theme, setTheme] = useState('system');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiModel, setAiModel] = useState('gemini-pro');
  const [language, setLanguage] = useState('en');
  const [enableAiSuggestions, setEnableAiSuggestions] = useState(true);
  const [autoSaveDrafts, setAutoSaveDrafts] = useState(true);

  // Notification fields
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [creditAlerts, setCreditAlerts] = useState(true);
  const [sessionUpdates, setSessionUpdates] = useState(true);
  const [teamInvites, setTeamInvites] = useState(true);
  const [paymentConfirmations, setPaymentConfirmations] = useState(true);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/sign-in'); return; }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setEmail(profileData.email || user.email || '');

      const settings = profileData.settings as any || {};
      setTheme(settings.theme || 'system');
      setAiProvider(settings.ai_provider || 'gemini');
      setAiModel(settings.ai_model || 'gemini-pro');
      setLanguage(settings.language || 'en');
      setEnableAiSuggestions(settings.enable_ai_suggestions !== false);
      setAutoSaveDrafts(settings.auto_save_drafts !== false);
      setEmailNotifications(settings.email_notifications !== false);
      setCreditAlerts(settings.credit_alerts !== false);
      setSessionUpdates(settings.session_updates !== false);
      setTeamInvites(settings.team_invites !== false);
      setPaymentConfirmations(settings.payment_confirmations !== false);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          settings: {
            theme,
            ai_provider: aiProvider,
            ai_model: aiModel,
            language,
            enable_ai_suggestions: enableAiSuggestions,
            auto_save_drafts: autoSaveDrafts,
            email_notifications: emailNotifications,
            credit_alerts: creditAlerts,
            session_updates: sessionUpdates,
            team_invites: teamInvites,
            payment_confirmations: paymentConfirmations,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      showMessage('success', 'Settings saved successfully');
    } catch (err) {
      showMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showMessage('success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to update password');
    }
  };

  const applyTheme = (newTheme: string) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (newTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: FiUser },
    { id: 'preferences' as const, label: 'Preferences', icon: FiCpu },
    { id: 'notifications' as const, label: 'Notifications', icon: FiBell },
    { id: 'security' as const, label: 'Security', icon: FiShield },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <div className="w-48 flex-shrink-0">
              <nav className="space-y-1">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === s.id
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <s.icon className="w-4 h-4" />
                    {s.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">

              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input type="email" value={email} disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed" />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="en">English</option>
                      <option value="ur">Urdu</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSection === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
                    <div className="flex gap-2">
                      {['light', 'dark', 'system'].map((t) => (
                        <button key={t} onClick={() => applyTheme(t)}
                          className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium capitalize transition-colors ${
                            theme === t
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                          }`}>
                          {t === 'light' ? <FiSun className="inline w-4 h-4 mr-1" /> : t === 'dark' ? <FiMoon className="inline w-4 h-4 mr-1" /> : <FiGlobe className="inline w-4 h-4 mr-1" />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Provider</label>
                    <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="mistral">Mistral (free tier)</option>
                      <option value="openrouter">OpenRouter (free models)</option>
                      <option value="local">Local offline draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Model</label>
                    <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="mistral-small-latest">Mistral Small (free tier)</option>
                      <option value="google/gemma-4-26b-a4b-it:free">Gemma 4 via OpenRouter (free)</option>
                    </select>
                  </div>

                  <ToggleRow label="AI Suggestions" desc="Get intelligent suggestions while researching" value={enableAiSuggestions} onChange={setEnableAiSuggestions} />
                  <ToggleRow label="Auto-save Drafts" desc="Automatically save your work as you type" value={autoSaveDrafts} onChange={setAutoSaveDrafts} />
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Settings</h2>

                  <ToggleRow label="Email Notifications" desc="Receive notifications via email" value={emailNotifications} onChange={setEmailNotifications} />
                  <ToggleRow label="Credit Alerts" desc="Get notified when credits are low" value={creditAlerts} onChange={setCreditAlerts} />
                  <ToggleRow label="Session Updates" desc="Notifications about research session changes" value={sessionUpdates} onChange={setSessionUpdates} />
                  <ToggleRow label="Team Invites" desc="Receive notifications for team invitations" value={teamInvites} onChange={setTeamInvites} />
                  <ToggleRow label="Payment Confirmations" desc="Email confirmation for payments" value={paymentConfirmations} onChange={setPaymentConfirmations} />
                </div>
              )}

              {activeSection === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>

                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter new password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Confirm new password" />
                      </div>
                      <button onClick={handleChangePassword}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection !== 'security' && (
                <div className="mt-6 flex justify-end">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
                    {saving ? 'Saving...' : <><FiSave className="w-4 h-4" /> Save Settings</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
