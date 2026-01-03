'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IResearchSession } from '@/types/main.db';
import {
  FiPlus, FiEdit3, FiTrash2, FiCopy, FiChevronDown,
  FiChevronRight, FiShield, FiDownload, FiBarChart2,
  FiZap, FiSearch, FiFilter, FiEye, FiEyeOff,
  FiCheck, FiX, FiAlertCircle, FiDatabase,
  FiTrendingUp, FiCode, FiFileText, FiLayers
} from 'react-icons/fi';
import { useAIService } from '@/hooks/useAIService';
import dynamic from 'next/dynamic';
import DraftQualityAssessment from '@/components/drafts/DraftQualityAssessment';

const ProEditor = dynamic(() => import('@/components/editor/ProEditor').then(mod => mod.ProEditor), { ssr: false });

// Main Page Component
export default function DraftListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [drafts, setDrafts] = useState<Record<string, IDraft[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'session' | 'draft'; item?: any }>({ isOpen: false, type: 'session' });
  const [content, setContent] = useState('');
  const { aiStatus, generateSummary, rewriteContent, rewriteContentWithContext, assessContentQuality } = useAIService();
  const [sessionPage, setSessionPage] = useState(1);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [draftsPage, setDraftsPage] = useState<Record<string, number>>({});
  const [hasMoreDrafts, setHasMoreDrafts] = useState<Record<string, boolean>>({});
  
  // Advanced Features State
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'plagiarized' | 'original'>('all');
  const [plagiarismReports, setPlagiarismReports] = useState<Record<string, any>>({});
  const [showAdvancedExport, setShowAdvancedExport] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    template: 'comprehensive',
    includeSources: true,
    plagiarismCheck: false,
    batchProcessing: true
  });
  
  // Quality Assessment State
  const [qualityAssessment, setQualityAssessment] = useState<{
    isOpen: boolean;
    draftId?: string;
    metrics?: any;
    suggestions?: string[];
    improvements?: any[];
    isAnalyzing?: boolean;
  }>({ isOpen: false });
  
  const [selectedDraftForRewrite, setSelectedDraftForRewrite] = useState<{
    id: string;
    content: string;
    title: string;
  } | null>(null);
  const [aiEnhancements, setAiEnhancements] = useState({
    autoSummary: true,
    smartRewrite: true,
    contextualRewrite: true,
    qualityAssessment: true,
    qualityAnalysis: true
  });

  useEffect(() => {
    const loadSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((sessionPage - 1) * 10, sessionPage * 10 - 1);

      if (data) {
        setSessions(prev => (sessionPage === 1 ? data : [...prev, ...data]));
        setHasMoreSessions(data.length === 10);
      }
      setLoading(false);
    }
    loadSessions();
  }, [sessionPage, supabase]);

  const loadDrafts = async (sessionId: string, page = 1) => {
    const { data } = await supabase
      .from('drafts')
      .select('*')
      .eq('research_session_id', sessionId)
      .order('created_at', { ascending: false })
      .range((page - 1) * 10, page * 10 - 1);

    if (data) {
      setDrafts(prev => ({ ...prev, [sessionId]: page === 1 ? data : [...(prev[sessionId] || []), ...data] }));
      setHasMoreDrafts(prev => ({ ...prev, [sessionId]: data.length === 10 }));
    }
  };

  const toggleSession = (id: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      if (!drafts[id]) {
        setDraftsPage(prev => ({ ...prev, [id]: 1 }));
        loadDrafts(id, 1);
      }
    }
    setExpandedSessions(newExpanded);
  };

  const openModal = (type: 'session' | 'draft', item?: any) => {
    setModal({ isOpen: true, type, item });
    setContent(item ? (type === 'draft' ? item.content : item.title) : '');
  };

  const saveModal = async () => {
    const { type, item } = modal;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (type === 'session') {
      if (item?.id) {
        await supabase.from('research_sessions').update({ title: content }).eq('id', item.id);
      } else {
        await supabase.from('research_sessions').insert({ title: content, user_id: user.id });
      }
      setSessionPage(1);
    } else if (type === 'draft') {
      if (item?.id) {
        await supabase.from('drafts').update({ content, version: (item.version || 0) + 1 }).eq('id', item.id);
      } else {
        await supabase.from('drafts').insert({ research_session_id: item.sessionId, content, version: 1 });
      }
      loadDrafts(item.sessionId);
    }
    setModal({ isOpen: false, type: 'session' });
  };

  const handleAIAction = async (action: string, text: string, context?: any) => {
    if (action === 'summarize') return await generateSummary(text, 'draft');
    if (action === 'rewrite') return await rewriteContent(text, 'academic');
    if (action === 'simplify') return await rewriteContent(text, 'simple');
    if (action === 'formalize') return await rewriteContent(text, 'formal');
    if (action === 'contextual-rewrite' && context) {
      return await rewriteContentWithContext(text, context.style || 'academic', {
        researchTopic: context.researchTopic,
        targetAudience: context.targetAudience,
        existingSources: context.existingSources || [],
        writingGoals: context.writingGoals || [],
        preserveCitations: context.preserveCitations !== false,
        improveStructure: context.improveStructure !== false
      });
    }
    if (action === 'assess-quality') {
      return await assessContentQuality(text);
    }
    return text;
  };

  const assessDraftQuality = async (draftId: string, content: string) => {
    setQualityAssessment({
      isOpen: true,
      draftId,
      isAnalyzing: true
    });

    try {
      const assessment = await assessContentQuality(content);
      const parsedAssessment = typeof assessment === 'string' ? 
        JSON.parse(assessment) : assessment;

      setQualityAssessment({
        isOpen: true,
        draftId,
        metrics: {
          overall: parsedAssessment.overallQualityScore || 75,
          clarity: parsedAssessment.clarityScore || 75,
          coherence: parsedAssessment.coherenceScore || 75,
          academicTone: parsedAssessment.academicToneScore || 75,
          grammar: parsedAssessment.grammarScore || 85,
          structure: parsedAssessment.structureScore || 80,
          originality: parsedAssessment.originalityScore || 90,
          readingLevel: parsedAssessment.readingDifficulty || 'medium',
          wordCount: content.split(/\s+/).length,
          sentenceCount: content.split(/[.!?]+/).length,
          avgSentenceLength: Math.round(content.split(/\s+/).length / content.split(/[.!?]+/).length)
        },
        suggestions: parsedAssessment.suggestionsForEnhancement || [],
        improvements: (parsedAssessment.structuralImprovements || []).map((improvement: string, index: number) => ({
          type: 'Structure',
          description: improvement,
          priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low'
        })),
        isAnalyzing: false
      });
    } catch (error) {
      console.error('Quality assessment failed:', error);
      setQualityAssessment(prev => ({
        ...prev,
        isAnalyzing: false,
        suggestions: ['Analysis failed. Please try again.'],
        improvements: []
      }));
    }
  };

  const openContextualRewrite = (draft: IDraft) => {
    setSelectedDraftForRewrite({
      id: draft.id,
      content: draft.content,
      title: draft.content.substring(0, 50) + '...'
    });
  };

  const applyContextualRewrite = async (context: any) => {
    if (!selectedDraftForRewrite) return;

    try {
      const result = await rewriteContentWithContext(
        selectedDraftForRewrite.content,
        context.style || 'academic',
        {
          researchTopic: context.researchTopic,
          targetAudience: context.targetAudience,
          existingSources: [],
          writingGoals: context.writingGoals?.split(',').map((g: string) => g.trim()) || [],
          preserveCitations: context.preserveCitations !== false,
          improveStructure: context.improveStructure !== false
        }
      );

      if (result?.rewrittenContent) {
        // Update the draft in database
        await supabase
          .from('drafts')
          .update({ content: result.rewrittenContent })
          .eq('id', selectedDraftForRewrite.id);

        // Close modal and refresh drafts
        setSelectedDraftForRewrite(null);
        // Refresh the drafts for the affected session
        const affectedSessionId = drafts[selectedDraftForRewrite.id]?.[0]?.research_session_id;
        if (affectedSessionId) {
          loadDrafts(affectedSessionId);
        }
      }
    } catch (error) {
      console.error('Contextual rewrite failed:', error);
      alert('Failed to apply rewrite. Please try again.');
    }
  };

  const duplicateDraft = async (draft: IDraft) => {
    await supabase.from('drafts').insert({ research_session_id: draft.research_session_id, content: draft.content, version: 1 });
    loadDrafts(draft.research_session_id);
  };

  const deleteItem = async (type: 'session' | 'draft', id: string, sessionId?: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from(type === 'session' ? 'research_sessions' : 'drafts').delete().eq('id', id);
    if (type === 'session') setSessionPage(1);
    else if (sessionId) loadDrafts(sessionId);
  };

  // Advanced Features Functions
  const checkPlagiarism = async (draftId: string) => {
    const draft = drafts[draftId]?.find(d => d.id === draftId);
    if (!draft || !draft.content) {
      alert('No content available for plagiarism check');
      return;
    }

    try {
      const response = await fetch('/api/plagiarism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.content })
      });

      if (!response.ok) {
        throw new Error('Plagiarism check failed');
      }

      const result = await response.json();
      setPlagiarismReports(prev => ({
        ...prev,
        [draftId]: result.result
      }));
      
      // Show plagiarism report in modal
      openModal('draft', { ...draft, plagiarismReport: result.result });
    } catch (error) {
      console.error('Plagiarism check failed:', error);
      alert('Failed to check plagiarism. Please try again.');
    }
  };

  const enhanceDraftWithAI = async (draftId: string) => {
    const draft = drafts[draftId]?.find(d => d.id === draftId);
    if (!draft || !draft.content) {
      alert('No content available for AI enhancement');
      return;
    }

    try {
      // Split content into sections for better AI processing
      const sections = splitContentIntoSections(draft.content);
      
      const enhancedSections = await Promise.all(
        sections.map(async (section, index) => {
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Enhance this research section for academic quality and clarity. Section title: "${section.title}". Content: ${section.content}`,
              task: 'enhance-content'
            })
          });

          if (!response.ok) {
            throw new Error('AI enhancement failed');
          }

          const result = await response.json();
          return {
            ...section,
            enhancedContent: result.result || section.content
          };
        })
      );

      const enhancedContent = enhancedSections
        .map(section => section.enhancedContent)
        .join('\n\n');

      // Update the draft with enhanced content
      await supabase
        .from('drafts')
        .update({ 
          content: enhancedContent,
          version: (draft.version || 0) + 1
        })
        .eq('id', draftId);

      loadDrafts(draft.research_session_id);
      alert('Draft enhanced successfully with AI!');
    } catch (error) {
      console.error('AI enhancement failed:', error);
      alert('Failed to enhance draft with AI. Please try again.');
    }
  };

  const splitContentIntoSections = (content: string): Array<{title: string, content: string}> => {
    const paragraphs = content.split('\n\n');
    const sections: Array<{title: string, content: string}> = [];
    
    let currentSection: {title: string, content: string} = {
      title: 'Introduction',
      content: ''
    };

    paragraphs.forEach((paragraph, index) => {
      if (paragraph.includes('#') || paragraph.includes('##') || paragraph.includes('###')) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        const title = paragraph.replace(/#+\s*/, '').trim() || `Section ${sections.length + 1}`;
        currentSection = { title, content: '' };
      } else {
        currentSection.content += (currentSection.content ? '\n\n' : '') + paragraph;
      }
    });

    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  };

  const handleBulkAction = async (action: string) => {
    if (selectedDrafts.length === 0) {
      alert('Please select drafts first');
      return;
    }

    try {
      switch (action) {
        case 'export':
          await handleBulkExport();
          break;
        case 'plagiarism':
          await handleBulkPlagiarismCheck();
          break;
        case 'enhance':
          await handleBulkEnhance();
          break;
        case 'delete':
          if (confirm(`Are you sure you want to delete ${selectedDrafts.length} drafts?`)) {
            await handleBulkDelete();
          }
          break;
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Failed to perform bulk action');
    }
  };

  const handleBulkExport = async () => {
    const selectedDraftData: IDraft[] = [];
    
    for (const draftId of selectedDrafts) {
      for (const sessionId in drafts) {
        const draft = drafts[sessionId].find(d => d.id === draftId);
        if (draft) {
          selectedDraftData.push(draft);
          break;
        }
      }
    }

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: selectedDraftData.map(d => d.content).join('\n\n===\n\n'),
          template: exportOptions.template,
          includeSources: false,
          plagiarismCheck: exportOptions.plagiarismCheck,
          batchProcessing: exportOptions.batchProcessing
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();
      
      // Download the PDF
      const link = document.createElement('a');
      link.href = result.pdf_url;
      link.download = `bulk-export-drafts-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowBulkActions(false);
      setSelectedDrafts([]);
      alert(`Successfully exported ${selectedDraftData.length} drafts`);
    } catch (error) {
      console.error('Bulk export failed:', error);
      throw error;
    }
  };

  const handleBulkPlagiarismCheck = async () => {
    const results = [];
    
    for (const draftId of selectedDrafts) {
      for (const sessionId in drafts) {
        const draft = drafts[sessionId].find(d => d.id === draftId);
        if (draft) {
          try {
            const response = await fetch('/api/plagiarism', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: draft.content })
            });

            if (response.ok) {
              const result = await response.json();
              results.push({ draftId, result: result.result });
            }
          } catch (error) {
            console.error(`Plagiarism check failed for draft ${draftId}:`, error);
          }
          break;
        }
      }
    }

    // Update plagiarism reports
    const newReports = { ...plagiarismReports };
    results.forEach(({ draftId, result }) => {
      newReports[draftId] = result;
    });
    setPlagiarismReports(newReports);

    setShowBulkActions(false);
    setSelectedDrafts([]);
    alert(`Plagiarism check completed for ${results.length} drafts`);
  };

  const handleBulkEnhance = async () => {
    const enhancementPromises = [];
    
    for (const draftId of selectedDrafts) {
      for (const sessionId in drafts) {
        const draft = drafts[sessionId].find(d => d.id === draftId);
        if (draft) {
          enhancementPromises.push(enhanceDraftWithAI(draftId));
          break;
        }
      }
    }

    await Promise.all(enhancementPromises);
    setShowBulkActions(false);
    setSelectedDrafts([]);
    alert(`Enhanced ${selectedDrafts.length} drafts with AI`);
  };

  const handleBulkDelete = async () => {
    for (const draftId of selectedDrafts) {
      for (const sessionId in drafts) {
        const draft = drafts[sessionId].find(d => d.id === draftId);
        if (draft) {
          await supabase.from('drafts').delete().eq('id', draftId);
          break;
        }
      }
    }

    // Reload all affected sessions
    const affectedSessions = new Set();
    for (const draftId of selectedDrafts) {
      for (const sessionId in drafts) {
        if (drafts[sessionId].some(d => d.id === draftId)) {
          affectedSessions.add(sessionId);
        }
      }
    }

    affectedSessions.forEach(sessionId => loadDrafts(sessionId as string));

    setShowBulkActions(false);
    setSelectedDrafts([]);
    alert('Deleted ' + selectedDrafts.length + ' drafts');
  };

  const toggleDraftSelection = (draftId: string) => {
    setSelectedDrafts(prev => 
      prev.includes(draftId) 
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    );
  };

  const selectAllDrafts = (sessionId: string) => {
    const allDraftIds = drafts[sessionId]?.map(d => d.id) || [];
    setSelectedDrafts(allDraftIds);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Drafts</h1>
          <button onClick={() => openModal('session')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <FiPlus /> New Session
          </button>
        </div>

        <div className="space-y-6">
          {sessions.map(session => (
            <div key={session.id} className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => toggleSession(session.id)}>
                <div className="flex items-center gap-3">
                  {expandedSessions.has(session.id) ? <FiChevronDown /> : <FiChevronRight />}
                  <h2 className="text-xl font-semibold text-gray-700">{session.title}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openModal('session', session); }} className="p-2 rounded-md hover:bg-gray-100"><FiEdit3 /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem('session', session.id); }} className="p-2 rounded-md hover:bg-red-100 text-red-600"><FiTrash2 /></button>
                </div>
              </div>

              {expandedSessions.has(session.id) && (
                <div className="p-4 border-t">
                  <div className="flex justify-end mb-4">
                    <button onClick={() => openModal('draft', { sessionId: session.id })} className="flex items-center gap-2 text-sm bg-gray-800 text-white px-3 py-2 rounded-md hover:bg-gray-700">
                      <FiPlus /> New Draft
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(drafts[session.id] || []).map(draft => (
                      <div key={draft.id} className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow">
                        <div className="prose prose-sm line-clamp-4 mb-3" dangerouslySetInnerHTML={{ __html: draft.content || 'Empty draft' }} />
                        <div className="text-xs text-gray-500 mb-3">v{draft.version}</div>
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => router.push(`/drafts/${draft.id}`)} 
                            className="p-2 rounded-md hover:bg-gray-200" 
                            title="Edit Draft"
                          >
                            <FiEdit3 />
                          </button>
                          <button 
                            onClick={() => openContextualRewrite(draft)} 
                            className="p-2 rounded-md hover:bg-blue-100 text-blue-600" 
                            title="Contextual Rewrite"
                          >
                            <FiZap />
                          </button>
                          <button 
                            onClick={() => assessDraftQuality(draft.id, draft.content)} 
                            className="p-2 rounded-md hover:bg-green-100 text-green-600" 
                            title="Assess Quality"
                          >
                            <FiBarChart2 />
                          </button>
                          <button onClick={() => duplicateDraft(draft)} className="p-2 rounded-md hover:bg-gray-200" title="Duplicate">
                            <FiCopy />
                          </button>
                          <button onClick={() => deleteItem('draft', draft.id, session.id)} className="p-2 rounded-md hover:bg-red-100 text-red-600" title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {drafts[session.id] && drafts[session.id].length === 0 && <p className="text-center text-gray-500 py-4">No drafts in this session yet.</p>}
                  {hasMoreDrafts[session.id] && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => {
                          const nextPage = (draftsPage[session.id] || 1) + 1;
                          setDraftsPage(prev => ({ ...prev, [session.id]: nextPage }));
                          loadDrafts(session.id, nextPage);
                        }}
                        className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {hasMoreSessions && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setSessionPage(prev => prev + 1)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Load More Sessions
              </button>
            </div>
          )}
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">{modal.item ? 'Edit' : 'New'} {modal.type}</h2>
            {modal.type === 'session' ? (
              <input value={content} onChange={e => setContent(e.target.value)} placeholder="Session title" className="w-full p-3 border rounded-lg" />
            ) : (
              <ProEditor content={content} onChange={setContent} />
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModal({ isOpen: false, type: 'session' })} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
              <button onClick={saveModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Quality Assessment Modal */}
      {qualityAssessment.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Content Quality Assessment</h2>
              <button 
                onClick={() => setQualityAssessment({ isOpen: false })}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX />
              </button>
            </div>
            <div className="p-6">
              <DraftQualityAssessment
                metrics={qualityAssessment.metrics}
                suggestions={qualityAssessment.suggestions || []}
                improvements={qualityAssessment.improvements || []}
                isAnalyzing={qualityAssessment.isAnalyzing || false}
                onApplyImprovement={(improvement) => {
                  // Handle improvement application
                  console.log('Applying improvement:', improvement);
                  setQualityAssessment({ isOpen: false });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Contextual Rewrite Modal */}
      {selectedDraftForRewrite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Contextual Rewrite</h2>
                  <p className="text-gray-600">
                    Rewriting: <span className="font-medium">{selectedDraftForRewrite.title}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDraftForRewrite(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FiX />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Writing Style
                  </label>
                  <select 
                    id="rewrite-style"
                    className="w-full p-3 border rounded-lg"
                    defaultValue="academic"
                  >
                    <option value="academic">Academic</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="simple">Simple</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Research Topic
                  </label>
                  <input 
                    type="text"
                    id="research-topic"
                    placeholder="e.g., Climate Change, Machine Learning"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <select 
                    id="target-audience"
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="academic">Academic Researchers</option>
                    <option value="general">General Public</option>
                    <option value="business">Business Professionals</option>
                    <option value="students">Students</option>
                    <option value="technical">Technical Experts</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Writing Goals
                  </label>
                  <input 
                    type="text"
                    id="writing-goals"
                    placeholder="e.g., clarity, persuasion, information"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    id="preserve-citations"
                    defaultChecked={true}
                    className="mr-2"
                  />
                  Preserve Citations
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    id="improve-structure"
                    defaultChecked={true}
                    className="mr-2"
                  />
                  Improve Structure
                </label>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
                <div className="bg-white rounded border p-3 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 line-clamp-6">
                    {selectedDraftForRewrite.content.substring(0, 300)}...
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedDraftForRewrite(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const context = {
                      style: (document.getElementById('rewrite-style') as HTMLSelectElement)?.value,
                      researchTopic: (document.getElementById('research-topic') as HTMLInputElement)?.value,
                      targetAudience: (document.getElementById('target-audience') as HTMLSelectElement)?.value,
                      writingGoals: (document.getElementById('writing-goals') as HTMLInputElement)?.value,
                      preserveCitations: (document.getElementById('preserve-citations') as HTMLInputElement)?.checked,
                      improveStructure: (document.getElementById('improve-structure') as HTMLInputElement)?.checked
                    };
                    applyContextualRewrite(context);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Rewrite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}