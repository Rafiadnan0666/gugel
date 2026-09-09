'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { ResearchSession } from '@/types/main.db';
import { FiPlus, FiBook, FiFileText, FiCheck, FiClock, FiDownload, FiGlobe, FiShield, FiCpu, FiAlertCircle, FiLoader, FiEdit3, FiEdit, FiRefreshCw, FiPrinter, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PaperConfig {
  topic: string;
  discipline: string;
  citationStyle: 'APA' | 'MLA' | 'IEEE' | 'Chicago' | 'Harvard' | 'Vancouver';
  language: string;
  pageCount: number;
  includeGraphs: boolean;
  includeSimulations: boolean;
  customInstructions: string;
}

interface GeneratedPaper {
  id?: string;
  config: PaperConfig;  coverPage: {
    title: string;
    subtitle: string;
    authors: { name: string; affiliation: string; email: string }[];
    institution: string;
    department: string;
    date: string;
    abstract: string;
    keywords: string[];
  };
  sections: { id: string; title: string; content: string; wordCount: number; status: string; aiProvider?: string; figures?: any[]; tables?: any[] }[];
  references: { id: string; authors: string; title: string; year: number; journal?: string; doi?: string; verified: boolean; credibilityScore: number; source: string }[];
  totalWordCount?: number;
  status?: string;
  exportedFormats?: string[];
}

// The generate API may omit totals — always derive them safely.
function paperWordCount(paper: GeneratedPaper): number {
  if (typeof paper.totalWordCount === 'number') return paper.totalWordCount;
  return (paper.sections || []).reduce((sum, s) => sum + (s.wordCount || 0), 0);
}

interface ProgressUpdate {
  section: string;
  progress: number;
  status: string;
}

const DISCIPLINES = [
  'Computer Science', 'Engineering', 'Medicine', 'Biology', 'Physics',
  'Chemistry', 'Mathematics', 'Psychology', 'Sociology', 'Economics',
  'Business', 'Education', 'Environmental Science', 'Neuroscience',
  'Artificial Intelligence', 'Data Science', 'Public Health', 'Political Science',
  'Philosophy', 'Linguistics', 'Other',
];

const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' }, { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' }, { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' }, { code: 'id', name: 'Indonesian' },
];

const CITATION_STYLES = ['APA', 'MLA', 'IEEE', 'Chicago', 'Harvard', 'Vancouver'] as const;

export default function ResearchPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'generate' | 'history'>('sessions');

  // Paper generation state
  const [config, setConfig] = useState<PaperConfig>({
    topic: '',
    discipline: '',
    citationStyle: 'APA',
    language: 'en',
    pageCount: 10,
    includeGraphs: true,
    includeSimulations: false,
    customInstructions: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [generatedPaper, setGeneratedPaper] = useState<GeneratedPaper | null>(null);
  const [error, setError] = useState('');
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [translationTarget, setTranslationTarget] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [health, setHealth] = useState<{ remoteConfigured: boolean; reachable: string[] } | null>(null);
  const [coverEditing, setCoverEditing] = useState(false);
  const [coverDraft, setCoverDraft] = useState<any>(null);
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
  const [rewriteStyle, setRewriteStyle] = useState('academic');
  const [rewritingSection, setRewritingSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/sign-in'); return; }
        const { data, error } = await supabase
          .from('research_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) setSessions(data);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
    fetchProviders();
    fetchHealth();
  }, [router, supabase]);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/ai/health');
      if (res.ok) setHealth(await res.json());
    } catch { /* ignore */ }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/research/providers');
      if (res.ok) {
        const data = await res.json();
        setAvailableProviders(data.providers || []);
      }
    } catch { /* ignore */ }
  };

  const generatePaper = async () => {
    if (!config.topic.trim()) { setError('Please enter a research topic'); return; }
    if (!config.discipline) { setError('Please select a discipline'); return; }

    setIsGenerating(true);
    setError('');
    setGeneratedPaper(null);
    setProgress({ section: 'init', progress: 0, status: 'Starting...' });

    try {
      const res = await fetch('/api/research/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.errors?.join(', ') || 'Generation failed');
      }

      const data = await res.json();
      setGeneratedPaper(data.paper);
      setActiveTab('history');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const exportPDF = async () => {
    if (!generatedPaper) return;
    setIsExporting(true);
    try {
      const res = await fetch('/api/research/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper: generatedPaper, options: { includeCoverPage: true, includeTableOfContents: true } }),
      });

      if (!res.ok) throw new Error('Export failed');

      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(generatedPaper.coverPage?.title || 'research-paper').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const verifyReferences = async () => {
    if (!generatedPaper?.references?.length) return;
    setIsVerifying(true);
    try {
      const res = await fetch('/api/research/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ references: generatedPaper.references, topic: generatedPaper.config.topic }),
      });

      if (!res.ok) throw new Error('Verification failed');

      const data = await res.json();
      setVerificationResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const translateSection = async (sectionId: string) => {
    if (!generatedPaper) return;
    setIsTranslating(true);
    try {
      const section = generatedPaper.sections.find(s => s.id === sectionId);
      if (!section) return;

      const res = await fetch('/api/research/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: section.content,
          sourceLanguage: generatedPaper.config.language,
          targetLanguage: translationTarget,
          mode: 'section',
        }),
      });

      if (!res.ok) throw new Error('Translation failed');

      const data = await res.json();
      setGeneratedPaper(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId ? { ...s, content: data.content } : s
          ),
        };
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const rewriteSection = async (sectionId: string) => {
    if (!generatedPaper) return;
    const section = generatedPaper.sections.find(s => s.id === sectionId);
    if (!section?.content) return;
    setRewritingSection(sectionId);
    try {
      const res = await fetch('/api/ai/rewrite-contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: section.content,
          style: rewriteStyle,
          context: { researchTopic: generatedPaper.config.topic },
          preserveCitations: true,
          improveStructure: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Rewrite failed');
      }
      const data = await res.json();
      const rewritten = data.data?.rewrittenContent;
      if (!rewritten) throw new Error('Empty rewrite result');
      setGeneratedPaper(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId ? { ...s, content: rewritten, wordCount: rewritten.split(/\s+/).length } : s
          ),
        };
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRewritingSection(null);
    }
  };

  const exportMarkdown = () => {
    if (!generatedPaper) return;
    const lines: string[] = [];
    lines.push(`# ${generatedPaper.coverPage?.title || generatedPaper.config.topic}`);
    if (generatedPaper.coverPage?.subtitle) lines.push(`*${generatedPaper.coverPage.subtitle}*`);
    lines.push('');
    const authors = (generatedPaper.coverPage?.authors || []).filter(a => a.name).map(a => a.name).join(', ');
    if (authors) lines.push(authors);
    if (generatedPaper.coverPage?.institution) lines.push(generatedPaper.coverPage.institution);
    lines.push('');
    if (generatedPaper.coverPage?.keywords?.length) lines.push(`**Keywords:** ${generatedPaper.coverPage.keywords.join(', ')}`);
    lines.push('');
    for (const s of generatedPaper.sections) {
      if (!s.content) continue;
      lines.push(`## ${s.title}`);
      lines.push('');
      lines.push(s.content);
      lines.push('');
    }
    if (generatedPaper.references.length > 0) {
      lines.push('## References');
      lines.push('');
      generatedPaper.references.forEach((ref, i) => {
        lines.push(`${i + 1}. ${ref.authors} (${ref.year}). ${ref.title}.${ref.journal ? ` *${ref.journal}*.` : ''}${ref.doi ? ` DOI: ${ref.doi}` : ''}`);
      });
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(generatedPaper.coverPage?.title || 'research-paper').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPaper = () => {
    window.print();
  };

  const regenerateCover = async () => {
    if (!generatedPaper) return;
    setIsRegeneratingCover(true);
    try {
      const abstract = generatedPaper.sections.find(s => s.id === 'abstract')?.content || '';
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'chat',
          prompt: `Design a professional research paper cover page for the topic "${generatedPaper.config.topic}" (${generatedPaper.config.discipline}). Context — abstract excerpt: ${abstract.substring(0, 1500)}. Return ONLY valid JSON with keys: title, subtitle, authors (array of {name, affiliation, email}), institution, department, keywords (array of 4-6 strings). No commentary.`,
        }),
      });
      if (!res.ok) throw new Error('Cover regeneration failed');
      const data = await res.json();
      const match = (data.result || '').match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse cover data');
      const parsed = JSON.parse(match[0]);
      const next = { ...generatedPaper.coverPage, ...parsed, date: generatedPaper.coverPage?.date || new Date().toISOString().split('T')[0] };
      setGeneratedPaper(prev => (prev ? { ...prev, coverPage: next } : prev));
      setCoverDraft(next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRegeneratingCover(false);
    }
  };

  const createNewSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: newSession } = await supabase
      .from('research_sessions')
      .insert([{ user_id: user.id, title: `Research - ${new Date().toLocaleDateString()}` }])
      .select().single();
    if (newSession) router.push(`/session/${newSession.id}`);
  };

  const handleConfigChange = (field: keyof PaperConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Research Paper Generator</h1>
            <p className="text-gray-600 mt-2">Generate academic research papers with multi-AI collaboration and evidence verification.</p>
          </div>
          <div className="flex gap-2">
            {availableProviders.length > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <FiCpu className="w-4 h-4" />
                {availableProviders.length} AI {availableProviders.length === 1 ? 'provider' : 'providers'} active
              </div>
            )}
            <button
              onClick={() => setActiveTab('generate')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center space-x-2 shadow-md"
            >
              <FiFileText className="w-5 h-5" />
              <span>New Paper</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'sessions' as const, label: 'Sessions', icon: FiBook },
            { id: 'generate' as const, label: 'Generate Paper', icon: FiFileText },
            { id: 'history' as const, label: 'Generated Papers', icon: FiClock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI setup hint when no cloud key is configured */}
        {health && !health.remoteConfigured && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <span className="font-medium">No cloud AI key configured.</span>{' '}
              Papers will be generated as offline local scaffolds. Add a free key to{' '}
              <code className="px-1 bg-yellow-100 rounded">.env.local</code> (
              <span className="font-medium">MISTRAL_API_KEY</span> or OPENROUTER_API_KEY) and restart the dev server for full multi-AI generation. See{' '}
              <code className="px-1 bg-yellow-100 rounded">docs/ADMIN_SETUP.md</code> in the repo.
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <FiBook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No research sessions yet.</p>
                <button onClick={createNewSession} className="text-blue-600 hover:underline mt-2 font-medium">
                  Create your first session
                </button>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/session/${session.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
                    <p className="text-sm text-gray-600">
                      Created {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Generate Paper Tab */}
        {activeTab === 'generate' && (
          <div className="max-w-3xl">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Configure Research Paper</h2>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Research Topic *</label>
                <input
                  type="text"
                  value={config.topic}
                  onChange={e => handleConfigChange('topic', e.target.value)}
                  placeholder="e.g., The impact of artificial intelligence on healthcare diagnostics"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{config.topic.length}/500 characters</p>
              </div>

              {/* Discipline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discipline *</label>
                <select
                  value={config.discipline}
                  onChange={e => handleConfigChange('discipline', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select discipline...</option>
                  {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Two columns: Citation style & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Citation Style</label>
                  <select
                    value={config.citationStyle}
                    onChange={e => handleConfigChange('citationStyle', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    {CITATION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={config.language}
                    onChange={e => handleConfigChange('language', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Page Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Page Count: {config.pageCount} pages</label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={config.pageCount}
                  onChange={e => handleConfigChange('pageCount', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 page</span>
                  <span>50 pages</span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeGraphs}
                    onChange={e => handleConfigChange('includeGraphs', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Include data visualizations and graphs</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeSimulations}
                    onChange={e => handleConfigChange('includeSimulations', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Include simulation results</span>
                </label>
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Instructions (optional)</label>
                <textarea
                  value={config.customInstructions}
                  onChange={e => handleConfigChange('customInstructions', e.target.value)}
                  placeholder="Any specific requirements, focus areas, or methodology preferences..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>

              {/* AI Providers Status */}
              {availableProviders.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiCpu className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Active AI Providers (Free Tier)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableProviders.map(p => (
                      <span key={p.id} className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-700">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={generatePaper}
                disabled={isGenerating || !config.topic.trim() || !config.discipline}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    Generating Paper...
                  </>
                ) : (
                  <>
                    <FiFileText className="w-5 h-5" />
                    Generate Research Paper
                  </>
                )}
              </button>

              {/* Progress */}
              {isGenerating && progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{progress.status}</span>
                    <span>{progress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History / Generated Papers Tab */}
        {activeTab === 'history' && (
          <div>
            {generatedPaper ? (
              <div className="space-y-6">
                {/* Paper Header */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{generatedPaper.coverPage?.title || generatedPaper.config.topic}</h2>
                      {generatedPaper.coverPage?.subtitle && (
                        <p className="text-gray-600 italic mt-1">{generatedPaper.coverPage.subtitle}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={verifyReferences}
                        disabled={isVerifying}
                        className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2 text-sm"
                      >
                        <FiShield className="w-4 h-4" />
                        {isVerifying ? 'Verifying...' : 'Verify References'}
                      </button>
                      <button
                        onClick={exportPDF}
                        disabled={isExporting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <FiDownload className="w-4 h-4" />
                        {isExporting ? 'Exporting...' : 'Export HTML'}
                      </button>
                      <button
                        onClick={exportMarkdown}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                      >
                        <FiDownload className="w-4 h-4" />
                        Markdown
                      </button>
                      <button
                        onClick={printPaper}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                      >
                        <FiPrinter className="w-4 h-4" />
                        Print / PDF
                      </button>
                    </div>
                  </div>

                  {/* Paper Stats */}
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{paperWordCount(generatedPaper).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Words</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">{generatedPaper.sections.filter(s => s.content).length}</div>
                      <div className="text-xs text-gray-500">Sections</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{generatedPaper.references.length}</div>
                      <div className="text-xs text-gray-500">References</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">{generatedPaper.config.citationStyle}</div>
                      <div className="text-xs text-gray-500">Citation Style</div>
                    </div>
                  </div>

                  {/* Words-per-section chart */}
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Words per section</p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={generatedPaper.sections.filter(s => s.content).map(s => ({ name: s.title.split(' ')[0], words: s.wordCount }))}
                          margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
                        >
                          <XAxis dataKey="name" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Bar dataKey="words" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Verification Results */}
                  {verificationResults && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FiShield className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">Reference Verification Complete</span>
                      </div>
                      <p className="text-sm text-green-700">
                        {verificationResults.summary.verified}/{verificationResults.summary.total} references verified
                        (avg confidence: {verificationResults.summary.averageConfidence}%)
                      </p>
                    </div>
                  )}

                  {/* Translation */}
                  <div className="mt-4 flex items-center gap-3">
                    <FiGlobe className="w-4 h-4 text-gray-500" />
                    <select
                      value={translationTarget}
                      onChange={e => setTranslationTarget(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    >
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                    <button
                      onClick={async () => {
                        if (!generatedPaper) return;
                        setIsTranslating(true);
                        try {
                          const res = await fetch('/api/research/translate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              sections: generatedPaper.sections.map(s => ({ title: s.title, content: s.content })),
                              sourceLanguage: generatedPaper.config.language,
                              targetLanguage: translationTarget,
                              mode: 'full-paper',
                            }),
                          });
                          if (!res.ok) throw new Error('Translation failed');
                          const data = await res.json();
                          setGeneratedPaper(prev => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              sections: prev.sections.map((s, i) => ({
                                ...s,
                                title: data.sections[i]?.title || s.title,
                                content: data.sections[i]?.content || s.content,
                              })),
                              config: { ...prev.config, language: translationTarget },
                            };
                          });
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setIsTranslating(false);
                        }
                      }}
                      disabled={isTranslating}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isTranslating ? 'Translating...' : 'Translate Full Paper'}
                    </button>
                  </div>
                </div>

                {/* Cover Page Preview + Editor */}
                {generatedPaper.coverPage && (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Cover Page</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setCoverDraft({ ...generatedPaper.coverPage }); setCoverEditing(v => !v); }}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                        >
                          <FiEdit className="w-4 h-4" />
                          {coverEditing ? 'Close Editor' : 'Edit Cover'}
                        </button>
                        <button
                          onClick={regenerateCover}
                          disabled={isRegeneratingCover}
                          className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <FiRefreshCw className={`w-4 h-4 ${isRegeneratingCover ? 'animate-spin' : ''}`} />
                          {isRegeneratingCover ? 'Generating...' : 'AI Regenerate'}
                        </button>
                      </div>
                    </div>
                    {coverEditing && coverDraft && (
                      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={coverDraft.title || ''}
                            onChange={e => setCoverDraft({ ...coverDraft, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={coverDraft.subtitle || ''}
                            onChange={e => setCoverDraft({ ...coverDraft, subtitle: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Author name</label>
                          <input
                            type="text"
                            value={coverDraft.authors?.[0]?.name || ''}
                            onChange={e => setCoverDraft({ ...coverDraft, authors: [{ ...(coverDraft.authors?.[0] || {}), name: e.target.value }] })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Affiliation</label>
                          <input
                            type="text"
                            value={coverDraft.authors?.[0]?.affiliation || ''}
                            onChange={e => setCoverDraft({ ...coverDraft, authors: [{ ...(coverDraft.authors?.[0] || {}), affiliation: e.target.value }] })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Institution</label>
                          <input
                            type="text"
                            value={coverDraft.institution || ''}
                            onChange={e => setCoverDraft({ ...coverDraft, institution: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Keywords (comma separated)</label>
                          <input
                            type="text"
                            value={(coverDraft.keywords || []).join(', ')}
                            onChange={e => setCoverDraft({ ...coverDraft, keywords: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <button
                            onClick={() => { setGeneratedPaper(prev => (prev ? { ...prev, coverPage: coverDraft } : prev)); setCoverEditing(false); }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Save Cover
                          </button>
                          <button
                            onClick={() => setCoverEditing(false)}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="text-center space-y-4 border-2 border-gray-200 rounded-lg p-8">
                      <h1 className="text-3xl font-bold text-gray-900">{generatedPaper.coverPage.title}</h1>
                      {generatedPaper.coverPage.subtitle && (
                        <p className="text-lg text-gray-600 italic">{generatedPaper.coverPage.subtitle}</p>
                      )}
                      {generatedPaper.coverPage.authors?.filter(a => a.name).map((author, i) => (
                        <div key={i} className="text-gray-700">
                          <span className="font-medium">{author.name}</span>
                          {author.affiliation && <span className="text-sm text-gray-500 ml-2">({author.affiliation})</span>}
                        </div>
                      ))}
                      {generatedPaper.coverPage.institution && (
                        <p className="text-gray-700 font-medium">{generatedPaper.coverPage.institution}</p>
                      )}
                      <p className="text-gray-500">{generatedPaper.coverPage.date}</p>
                      {generatedPaper.coverPage.keywords?.length > 0 && (
                        <p className="text-sm text-gray-500">
                          <strong>Keywords:</strong> {generatedPaper.coverPage.keywords.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sections */}
                {generatedPaper.sections.filter(s => s.content && s.title !== 'Research Plan').map(section => (
                  <div key={section.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpandedSection(expandedSection === section.id ? null : section.id); }}
                      role="button"
                      tabIndex={0}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <FiFileText className="w-5 h-5 text-blue-500" />
                        <span className="font-medium text-gray-900">{section.title}</span>
                        <span className="text-xs text-gray-500">{section.wordCount} words</span>
                        {section.aiProvider && (
                          <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                            {section.aiProvider}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          onClick={e => { e.stopPropagation(); translateSection(section.id); }}
                          onKeyDown={e => { e.stopPropagation(); }}
                          role="button"
                          tabIndex={0}
                          title="Translate section"
                          className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                        >
                          <FiGlobe className="w-4 h-4" />
                        </span>
                        {expandedSection === section.id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {expandedSection === section.id && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <select
                            value={rewriteStyle}
                            onChange={e => setRewriteStyle(e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                            title="Rewrite style"
                          >
                            <option value="academic">Academic</option>
                            <option value="formal">Formal</option>
                            <option value="simple">Simple</option>
                            <option value="technical">Technical</option>
                            <option value="concise">Concise</option>
                          </select>
                          <button
                            onClick={() => rewriteSection(section.id)}
                            disabled={rewritingSection === section.id}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            <FiEdit3 className="w-3 h-3" />
                            {rewritingSection === section.id ? 'Rewriting...' : 'AI Rewrite'}
                          </button>
                        </div>
                        <div className="mt-4 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {section.content}
                        </div>
                        {section.figures?.map((fig: any, i: number) => (
                          <div key={i} className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-700">Figure {i + 1}: {fig.title}</p>
                            <p className="text-xs text-gray-500 italic">{fig.caption}</p>
                          </div>
                        ))}
                        {section.tables?.map((table: any, i: number) => (
                          <div key={i} className="mt-4 overflow-x-auto">
                            <p className="text-sm font-medium text-gray-700 mb-2">Table {i + 1}: {table.title}</p>
                            <table className="min-w-full text-sm border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  {table.headers?.map((h: string, j: number) => (
                                    <th key={j} className="px-3 py-2 text-left font-medium text-gray-700 border">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows?.map((row: string[], j: number) => (
                                  <tr key={j} className="hover:bg-gray-50">
                                    {row.map((cell, k) => (
                                      <td key={k} className="px-3 py-2 border text-gray-600">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* References */}
                {generatedPaper.references.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      References ({generatedPaper.references.length})
                    </h3>
                    <div className="space-y-3">
                      {generatedPaper.references.map((ref, i) => (
                        <div key={ref.id || i} className="flex items-start gap-3 text-sm">
                          <span className="text-gray-400 shrink-0 w-8">[{i + 1}]</span>
                          <div className="flex-1">
                            <p className="text-gray-800">
                              {ref.authors}. ({ref.year}). {ref.title}.
                              {ref.journal && <em> {ref.journal}</em>}
                              {ref.doi && <span className="text-blue-600"> DOI: {ref.doi}</span>}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {ref.verified ? (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <FiCheck className="w-3 h-3" /> Verified ({ref.credibilityScore}%)
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Pending verification</span>
                              )}
                              <span className="text-xs text-gray-400">Source: {ref.source}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Back button */}
                <button
                  onClick={() => { setGeneratedPaper(null); setActiveTab('generate'); }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  ← Generate another paper
                </button>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No papers generated yet.</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="text-blue-600 hover:underline mt-2 font-medium"
                >
                  Generate your first paper
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
