'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft, ISummary } from '@/types/main.db';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiCopy, FiDownload,
  FiExternalLink, FiZap, FiCpu, FiBook, FiLink, FiClock,
  FiUser, FiMessageSquare, FiRefreshCw, FiChevronDown,
  FiChevronUp, FiSearch, FiFilter, FiShare2, FiBookmark
} from 'react-icons/fi';

declare global {
  interface Window {
    ai?: {
      prompt: (prompt: string, options?: { signal?: AbortSignal }) => Promise<{ text: () => Promise<string> }>;
    };
  }
}

interface AISuggestion {
  type: 'summary' | 'analysis' | 'connection' | 'suggestion';
  content: string;
  confidence: number;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();

  const [session, setSession] = useState<IResearchSession | null>(null);
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [summaries, setSummaries] = useState<ISummary[]>([]);
  const [currentDraft, setCurrentDraft] = useState('');
  const [draftVersion, setDraftVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ai' | 'drafts'>('content');
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Load session
      const { data: sessionData } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      // Load tabs for this session
      const { data: tabsData } = await supabase
        .from('tabs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      // Load drafts for this session
      const { data: draftsData } = await supabase
        .from('drafts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      // Load summaries
      const { data: summariesData } = await supabase
        .from('summaries')
        .select('*')
        .in('tab_id', tabsData?.map(tab => tab.id) || []);

      if (sessionData) setSession(sessionData);
      if (tabsData) setTabs(tabsData);
      if (draftsData) {
        setDrafts(draftsData);
        if (draftsData.length > 0) {
          setCurrentDraft(draftsData[0].content);
          setDraftVersion(draftsData[0].version + 1);
        }
      }
      if (summariesData) setSummaries(summariesData);

      // Generate initial AI insights
      if (tabsData && tabsData.length > 0 && typeof window.ai !== 'undefined') {
        generateInitialAISuggestions(tabsData, summariesData || []);
      }

    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInitialAISuggestions = async (tabs: ITab[], summaries: ISummary[]) => {
    setIsGeneratingAI(true);
    try {
      const tabContents = tabs.map(tab => tab.content || tab.title || tab.url).join('\n\n');
      const summaryContents = summaries.map(s => s.summary).join('\n\n');

      const prompt = `
        Analyze this research session content and provide insights:

        Tabs Content:
        ${tabContents.substring(0, 3000)}

        Existing Summaries:
        ${summaryContents.substring(0, 2000)}

        Provide 3-5 insights in this format:
        TYPE: SUMMARY|ANALYSIS|CONNECTION|SUGGESTION
        CONFIDENCE: 0.8
        CONTENT: Your insight here

        Focus on:
        - Key themes and patterns
        - Research gaps
        - Potential connections
        - Next steps
        - Content organization
      `;

      const response = await window.ai!.prompt(prompt);
      const text = await response.text();
      parseAISuggestions(text);
    } catch (error) {
      console.warn('AI suggestion generation failed:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const parseAISuggestions = (text: string) => {
    const suggestions: AISuggestion[] = [];
    const lines = text.split('\n');
    
    let currentSuggestion: Partial<AISuggestion> = {};
    
    for (const line of lines) {
      if (line.startsWith('TYPE:')) {
        if (currentSuggestion.content) {
          suggestions.push(currentSuggestion as AISuggestion);
        }
        currentSuggestion = {
          type: line.replace('TYPE:', '').trim().toLowerCase() as AISuggestion['type'],
        };
      } else if (line.startsWith('CONFIDENCE:')) {
        currentSuggestion.confidence = parseFloat(line.replace('CONFIDENCE:', '').trim());
      } else if (line.startsWith('CONTENT:')) {
        currentSuggestion.content = line.replace('CONTENT:', '').trim();
      } else if (currentSuggestion.content && line.trim()) {
        currentSuggestion.content += ' ' + line.trim();
      }
    }
    
    if (currentSuggestion.content) {
      suggestions.push(currentSuggestion as AISuggestion);
    }
    
    setAiSuggestions(suggestions.slice(0, 5));
  };

  const generateAISummary = async (tabId: string, content: string) => {
    if (typeof window.ai === 'undefined') return;

    try {
      const response = await window.ai.prompt(`
        Summarize this research content concisely for academic purposes:
        
        ${content.substring(0, 2500)}
        
        Provide a clear, structured summary with key points.
      `);

      const summary = await response.text();
      
      // Save summary to database
      const { data } = await supabase
        .from('summaries')
        .insert([{
          tab_id: tabId,
          summary: summary,
          translator: 'AI',
          proofread: 'pending'
        }])
        .select()
        .single();

      if (data) {
        setSummaries(prev => [...prev, data]);
      }

      return summary;
    } catch (error) {
      console.error('AI summarization failed:', error);
    }
  };

  const generateResearchDraft = async () => {
    if (typeof window.ai === 'undefined' || tabs.length === 0) return;

    setIsGeneratingAI(true);
    try {
      const allContent = tabs.map(tab => tab.content || tab.title || '').join('\n\n');
      const allSummaries = summaries.map(s => s.summary).join('\n\n');

      const response = await window.ai.prompt(`
        Create a comprehensive research draft based on this content:

        Research Content:
        ${allContent.substring(0, 4000)}

        Summaries:
        ${allSummaries.substring(0, 2000)}

        Create a well-structured research draft with:
        1. Introduction
        2. Key findings
        3. Analysis
        4. Conclusions
        5. References (if any URLs are provided)

        Format it professionally for academic research.
      `);

      const draft = await response.text();
      setCurrentDraft(draft);
      
      // Auto-save draft
      await saveDraft(draft);

    } catch (error) {
      console.error('AI draft generation failed:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const saveDraft = async (content: string) => {
    const { data } = await supabase
      .from('drafts')
      .insert([{
        session_id: sessionId,
        content: content,
        version: draftVersion
      }])
      .select()
      .single();

    if (data) {
      setDrafts(prev => [data, ...prev]);
      setDraftVersion(prev => prev + 1);
    }
  };

  const toggleTabExpansion = (tabId: string) => {
    const newExpanded = new Set(expandedTabs);
    if (newExpanded.has(tabId)) {
      newExpanded.delete(tabId);
    } else {
      newExpanded.add(tabId);
    }
    setExpandedTabs(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Session not found</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-black hover:underline mt-4"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-black mb-4 flex items-center"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.title}</h1>
            <p className="text-gray-600">
              Created {formatDate(session.created_at)} • {tabs.length} tabs • {drafts.length} drafts
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              <FiShare2 className="w-5 h-5" />
            </button>
            <button className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              <FiBookmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 border-b-2 font-medium ${
              activeTab === 'content'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Research Content
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 border-b-2 font-medium ${
              activeTab === 'ai'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Insights
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-6 py-3 border-b-2 font-medium ${
              activeTab === 'drafts'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Drafts
          </button>
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tabs List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Research Tabs</h2>
                <span className="text-sm text-gray-600">{tabs.length} tabs</span>
              </div>

              {tabs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <FiLink className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No research tabs yet</p>
                  <p className="text-sm text-gray-500 mt-1">Import tabs using the browser extension</p>
                </div>
              ) : (
                tabs.map((tab) => {
                  const tabSummary = summaries.find(s => s.tab_id === tab.id);
                  const isExpanded = expandedTabs.has(tab.id);

                  return (
                    <div key={tab.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        onClick={() => toggleTabExpansion(tab.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {isExpanded ? (
                              <FiChevronUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <FiChevronDown className="w-4 h-4 text-gray-600" />
                            )}
                            <h3 className="font-medium text-gray-900 line-clamp-1">
                              {tab.title || 'Untitled Tab'}
                            </h3>
                          </div>
                          <a
                            href={tab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        {tabSummary && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Summarized
                            </span>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white">
                          {tab.content ? (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700">{tab.content.substring(0, 500)}...</p>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No content available</p>
                          )}

                          <div className="mt-4 flex space-x-2">
                            {!tabSummary && typeof window.ai !== 'undefined' && (
                              <button
                                onClick={() => generateAISummary(tab.id, tab.content || '')}
                                className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                              >
                                <FiZap className="w-4 h-4" />
                                <span>AI Summary</span>
                              </button>
                            )}
                            {tabSummary && (
                              <div className="bg-gray-50 p-3 rounded">
                                <h4 className="font-medium text-sm text-gray-900 mb-2">Summary</h4>
                                <p className="text-sm text-gray-700">{tabSummary.summary}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Actions & AI */}
            <div className="space-y-6">
              {/* AI Draft Generator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <FiCpu className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">AI Research Assistant</h3>
                </div>
                
                {typeof window.ai === 'undefined' ? (
                  <p className="text-blue-800 text-sm">
                    Enable Chromes AI features to get intelligent research assistance
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-blue-800 text-sm">
                      Generate comprehensive research drafts using AI analysis of your collected content
                    </p>
                    <button
                      onClick={generateResearchDraft}
                      disabled={isGeneratingAI || tabs.length === 0}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isGeneratingAI ? (
                        <FiRefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <FiZap className="w-5 h-5" />
                      )}
                      <span>
                        {isGeneratingAI ? 'Generating...' : 'Generate Research Draft'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Session Stats */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Session Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tabs Collected</span>
                    <span className="font-medium">{tabs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Summaries</span>
                    <span className="font-medium">{summaries.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Drafts Created</span>
                    <span className="font-medium">{drafts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium">{formatDate(session.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3">
                    <FiDownload className="w-5 h-5 text-gray-600" />
                    <span>Export Session Data</span>
                  </button>
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3">
                    <FiCopy className="w-5 h-5 text-gray-600" />
                    <span>Duplicate Session</span>
                  </button>
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3">
                    <FiTrash2 className="w-5 h-5 text-gray-600" />
                    <span>Delete Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FiCpu className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">AI-Powered Insights</h2>
            </div>

            {typeof window.ai === 'undefined' ? (
              <div className="text-center py-12">
                <FiCpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Features Not Available</h3>
                <p className="text-gray-600">
                  Enable Chromes built-in AI features to get intelligent research insights.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Visit chrome://flags and enable Prompt API for Gemini Nano
                </p>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <div className="text-center py-12">
                <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Yet</h3>
                <p className="text-gray-600">
                  {tabs.length === 0 
                    ? 'Add some research tabs to generate AI insights'
                    : 'AI insights will appear here after analyzing your research content'
                  }
                </p>
                {tabs.length > 0 && (
                  <button
                    onClick={() => generateInitialAISuggestions(tabs, summaries)}
                    className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Generate Insights
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      suggestion.type === 'summary'
                        ? 'bg-blue-50 border-blue-200'
                        : suggestion.type === 'analysis'
                        ? 'bg-green-50 border-green-200'
                        : suggestion.type === 'connection'
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        suggestion.type === 'summary'
                          ? 'bg-blue-100 text-blue-800'
                          : suggestion.type === 'analysis'
                          ? 'bg-green-100 text-green-800'
                          : suggestion.type === 'connection'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {suggestion.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-gray-900">{suggestion.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Draft Editor */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Research Draft</h2>
                <span className="text-sm text-gray-600">v{draftVersion}</span>
              </div>

              <textarea
                value={currentDraft}
                onChange={(e) => setCurrentDraft(e.target.value)}
                placeholder="Start writing your research draft here, or generate one with AI..."
                className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => saveDraft(currentDraft)}
                  disabled={!currentDraft.trim()}
                  className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
                <button className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                  <FiDownload className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Draft History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Draft History</h3>
              
              {drafts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <FiEdit2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No drafts yet</p>
                  <p className="text-sm text-gray-500 mt-1">Create your first draft to start writing</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setCurrentDraft(draft.content);
                        setDraftVersion(draft.version + 1);
                      }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">Version {draft.version}</span>
                        <span className="text-sm text-gray-500">{formatDate(draft.created_at)}</span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {draft.content.substring(0, 200)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}