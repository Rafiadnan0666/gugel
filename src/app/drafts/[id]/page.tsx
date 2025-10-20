'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IProfile, IResearchSession, IComment } from '@/types/main.db';
import { exportToPDF } from '@/lib/pdf';

interface IDraftWithResearchSession extends IDraft {
  research_sessions: IResearchSession;
  profiles?: IProfile;
}


import {
  FiArrowLeft, FiSave, FiDownload, FiCpu, FiX,
  FiUsers, FiClock, FiMessageSquare, FiShare2,
  FiMoreVertical, FiEye, FiEdit3, FiZap, FiGlobe, FiUser,
  FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft,
  FiAlignCenter, FiAlignRight, FiLink, FiImage,
  FiType, FiColumns, FiCode, FiMinus, FiCheck
} from 'react-icons/fi';

// Simple fallback for AI service if hook fails
const useAIService = () => ({
  aiStatus: 'ready' as 'loading' | 'ready' | 'error' | 'unavailable',
  generateSummary: async (content: string) => `Summary: ${content.substring(0, 100)}...`,
  rewriteContent: async (content: string) => `Improved: ${content}`,
  translateContent: async (content: string) => `Translated: ${content}`,
});

// Simple fallback for collaboration if hook fails
const useDraftCollaboration = () => ({
  onlineUsers: [] as any[],
  cursorPositions: [] as any[],
});

const ProEditor = ({ content, onChange }: { content: string; onChange: (content: string) => void }) => {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      placeholder="Start writing your draft..."
    />
  );
};

const AIResponse = ({ content }: { content: string }) => {
  return (
    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
      <p className="text-sm text-gray-700">{content}</p>
    </div>
  );
};

interface EditorState {
  content: string;
  wordCount: number;
  characterCount: number;
  readingTime: number;
  lastSaved: Date | null;
  title: string;
}

interface AISuggestion {
  id: string;
  type: 'rewrite' | 'expand' | 'summarize' | 'translate' | 'improve';
  original: string;
  suggestion: string;
  accepted: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'academic' | 'business' | 'creative' | 'technical';
}

export default function DraftEditPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;
  const supabase = createClient();
  
  const [draft, setDraft] = useState<IDraftWithResearchSession | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    wordCount: 0,
    characterCount: 0,
    readingTime: 0,
    lastSaved: null,
    title: 'Untitled Draft'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [sidebarTab, setSidebarTab] = useState<'comments' | 'history' | 'collaborators' | 'ai' | 'templates'>('ai');
  const [history, setHistory] = useState<IDraft[]>([]);
  const [collaborators, setCollaborators] = useState<IProfile[]>([]);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const [wordGoal, setWordGoal] = useState(1000);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const saveIntervalRef = useRef<NodeJS.Timeout>();

  const { aiStatus, generateSummary, rewriteContent, translateContent } = useAIService();
  const { onlineUsers, cursorPositions } = useDraftCollaboration();

  // Enhanced templates
  const defaultTemplates: Template[] = [
    {
      id: 'academic-paper',
      name: 'Academic Paper',
      description: 'Formal academic paper with title, abstract, and sections',
      category: 'academic',
      content: `# Research Title

## Abstract
Brief summary of your research study and key findings...

## Introduction
Background information and research question...

## Literature Review
Existing research and theoretical framework...

## Methodology
Research design, participants, and procedures...

## Results
Key findings and data analysis...

## Discussion
Interpretation of results and implications...

## Conclusion
Summary and recommendations for future research...

## References
- Author, A. (Year). Title. Journal.
- Author, B. (Year). Title. Publisher.`
    },
    {
      id: 'business-report',
      name: 'Business Report',
      description: 'Professional business report format',
      category: 'business',
      content: `# Executive Summary

Overview of the report and key recommendations...

## Introduction
Business context and report objectives...

## Key Findings
Main insights and data analysis...

## Market Analysis
Current market trends and opportunities...

## Recommendations
Proposed actions and implementation plan...

## Financial Implications
Budget considerations and ROI analysis...

## Conclusion
Summary and next steps...`
    },
    {
      id: 'creative-article',
      name: 'Creative Article',
      description: 'Engaging article format for blogs and publications',
      category: 'creative',
      content: `# Engaging Headline That Captures Attention

## Introduction
Start with a compelling hook that draws readers in...

## The Main Story
Develop your narrative with vivid examples and personal insights...

## Key Insights
- Important point 1 with supporting details
- Important point 2 with real-world examples
- Important point 3 with actionable advice

## Personal Experience
Share relevant stories and lessons learned...

## Practical Applications
How readers can apply this information...

## Conclusion
Leave readers with something to think about and a call to action...`
    },
    {
      id: 'technical-doc',
      name: 'Technical Documentation',
      description: 'Structured technical documentation',
      category: 'technical',
      content: `# System Overview

Brief description of the system or technology...

## Installation
\`\`\`bash
# Installation commands
npm install package-name
\`\`\`

## Quick Start
Basic usage example...

\`\`\`javascript
// Code example
const example = new Example();
example.start();
\`\`\`

## API Reference
### Endpoints
- GET /api/users
- POST /api/users
- PUT /api/users/{id}

### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User identifier |

## Configuration
Environment variables and settings...

## Troubleshooting
Common issues and solutions...

## FAQ
Frequently asked questions and answers...`
    }
  ];

  // Calculate editor statistics
  const calculateStats = useCallback((content: string) => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characters = content.length;
    const readingTime = Math.ceil(words / 200);
    
    setEditorState(prev => ({
      ...prev,
      wordCount: words,
      characterCount: characters,
      readingTime
    }));
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && editorState.content && draft) {
      if (saveIntervalRef.current) {
        clearTimeout(saveIntervalRef.current);
      }
      
      saveIntervalRef.current = setTimeout(() => {
        saveDraft(false);
      }, 3000);
    }

    return () => {
      if (saveIntervalRef.current) {
        clearTimeout(saveIntervalRef.current);
      }
    };
  }, [editorState.content, autoSave, draft]);

  // Track text selection for AI actions
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Load user and initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
        setTemplates(defaultTemplates);
        
        if (draftId) {
          await loadDraft();
          await loadComments();
          await loadCollaborators();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Failed to initialize editor');
      }
    };

    initialize();
  }, [draftId]);

  const loadDraft = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading draft with ID:', draftId);

      if (!draftId) {
        throw new Error('No draft ID provided');
      }

      // Get draft with related data
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select(`
          *,
          research_sessions (
            id,
            title,
            user_id,
            created_at,
            team_id
          )
        `)
        .eq('id', draftId)
        .single();

      if (draftError) {
        console.error('Draft loading error:', draftError);
        throw new Error(`Draft not found: ${draftError.message}`);
      }

      if (!draftData) {
        throw new Error('Draft does not exist');
      }

      console.log('Draft loaded successfully:', draftData);

      // Get user profile if available
      let profileData = null;
      if (draftData.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', draftData.user_id)
          .single();
        profileData = userData;
      }

      const combinedData: IDraftWithResearchSession = {
        ...draftData,
        research_sessions: draftData.research_sessions || {
          id: draftData.research_session_id,
          user_id: '',
          title: 'Untitled Session',
          created_at: new Date(),
          team_id: undefined
        },
        profiles: profileData || undefined
      };

      setDraft(combinedData);
      setEditorState(prev => ({
        ...prev,
        content: draftData.content || '',
        title: draftData.research_sessions?.title || 'Untitled Draft',
        lastSaved: new Date(draftData.updated_at || draftData.created_at)
      }));
      calculateStats(draftData.content || '');
      
    } catch (error: any) {
      console.error('Error in loadDraft:', error);
      setError(error.message || 'Failed to load draft');
    } finally {
      setLoading(false);
    }
  }, [supabase, draftId, calculateStats]);

  const loadComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('draft_id', draftId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Comments loading error:', error);
        return;
      }
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [supabase, draftId]);

  const loadHistory = useCallback(async () => {
    if (!draft?.research_session_id) return;
    
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('research_session_id', draft.research_session_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('History loading error:', error);
        return;
      }
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, [supabase, draft]);

    const loadCollaborators = useCallback(async () => {

      if (!draft?.research_session_id) return;

      

      try {

        const { data, error } = await supabase

          .from('session_collaborators')

          .select(`

            user_id,

            role,

            profiles (

              id,

              email,

              full_name,

              avatar_url,

              created_at,

              updated_at

            )

          `)

          .eq('session_id', draft.research_session_id);

  

        if (error) {

          console.error('Collaborators loading error:', error);

          return;

        }

        

        if (data) {

          const collaboratorProfiles = data

            .map(item => item.profiles)

            .filter(Boolean);

          setCollaborators(collaboratorProfiles.flat() as IProfile[]);

        }

      } catch (error) {

        console.error('Error in loadCollaborators:', error);

      }

    }, [supabase, draft]);

  const saveDraft = async (showNotification = true) => {
    if (!draft || !user) {
      setError('Cannot save: Draft or user not loaded');
      return;
    }
    
    setSaving(true);
    try {
      const updates = {
        content: editorState.content,
        version: (draft.version || 0) + 1,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('drafts')
        .update(updates)
        .eq('id', draftId);

      if (error) throw error;
      
      setEditorState(prev => ({ ...prev, lastSaved: new Date() }));
      
      if (showNotification) {
        console.log('Draft saved successfully');
      }

      // Reload draft to get updated data
      await loadDraft();

    } catch (error: any) {
      console.error('Error saving draft:', error);
      setError(error.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: Template) => {
    setEditorState(prev => ({
      ...prev,
      content: template.content
    }));
    setShowTemplates(false);
    calculateStats(template.content);
  };

  const handleContentChange = (content: string) => {
    setEditorState(prev => ({ ...prev, content }));
    calculateStats(content);
  };

  // Custom improveWriting function
  const improveWriting = async (content: string): Promise<string> => {
    return await rewriteContent(content);
  };

  const handleAIAction = async (action: string, content: string, options?: any) => {
    try {
      let result: string;
      const targetContent = selectedText || content;
      
      switch (action) {
        case 'summarize':
          result = await generateSummary(targetContent);
          break;
        case 'rewrite':
          result = await rewriteContent(targetContent);
          break;
        case 'translate':
          result = await translateContent(targetContent);
          break;
        case 'expand':
          result = await rewriteContent(targetContent);
          break;
        case 'simplify':
          result = await rewriteContent(targetContent);
          break;
        case 'improve':
          result = await improveWriting(targetContent);
          break;
        case 'formalize':
          result = await rewriteContent(targetContent);
          break;
        default:
          result = targetContent;
      }

      // Add to suggestions
      const suggestion: AISuggestion = {
        id: Date.now().toString(),
        type: action as any,
        original: targetContent,
        suggestion: result,
        accepted: false
      };
      
      setAiSuggestions(prev => [suggestion, ...prev.slice(0, 9)]);
      return result;
    } catch (error) {
      console.error('AI Action failed:', error);
      return content;
    }
  };

  const applySuggestion = (suggestionId: string) => {
    const suggestion = aiSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (selectedText) {
      const newContent = editorState.content.replace(selectedText, suggestion.suggestion);
      setEditorState(prev => ({ ...prev, content: newContent }));
    } else {
      setEditorState(prev => ({
        ...prev,
        content: prev.content + '\n\n' + suggestion.suggestion
      }));
    }

    setAiSuggestions(prev =>
      prev.map(s =>
        s.id === suggestionId ? { ...s, accepted: true } : s
      )
    );
  };

  const handleCustomAIPrompt = async () => {
    if (!aiPrompt.trim()) return;

    try {
      const result = await handleAIAction('rewrite', editorState.content, { prompt: aiPrompt });
      setAiResults(prev => [result, ...prev.slice(0, 4)]);
      setAiPrompt('');
    } catch (error) {
      console.error('Custom AI prompt failed:', error);
    }
  };

  const handleExport = async (template: string) => {
    if (!draft) return;
    setShowPDFModal(false);

    try {
      const draftWithContent = { ...draft, content: editorState.content };
      exportToPDF(template, draftWithContent, []);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export document');
    }
  };

  const generateShareLink = async () => {
    if (!draft) return;
    
    const shareToken = btoa(JSON.stringify({
      draftId: draft.id,
      sessionId: draft.research_session_id,
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    }));
    
    setShareLink(`${window.location.origin}/shared/${shareToken}`);
    setShowShareModal(true);
  };

  const addComment = async (content: string) => {
    if (!draft || !user) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          draft_id: draft.id,
          user_id: user.id,
          content,
        })
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;
      setComments(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Load history when draft is available
  useEffect(() => {
    if (draft) {
      loadHistory();
    }
  }, [draft, loadHistory]);

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading draft editor...</p>
          <p className="text-sm text-gray-500 mt-2">Draft ID: {draftId}</p>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error || !draft) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center max-w-md">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              <h1 className="text-xl font-bold mb-2">Unable to Load Draft</h1>
              <p className="mb-2">{error || 'The draft could not be loaded.'}</p>
              <p className="text-sm text-red-600">Draft ID: {draftId}</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/drafts')}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiArrowLeft /> Back to Drafts
              </button>
              <button 
                onClick={loadDraft}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FiEye /> Try Again
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const progressPercentage = Math.min((editorState.wordCount / wordGoal) * 100, 100);

  return (
    <Layout>
      {/* Enhanced Header */}
      <div className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-3">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/drafts')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-gray-900">
                  {editorState.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Version {draft?.version || 1}</span>
                  <span>•</span>
                  <span>{editorState.lastSaved ? `Saved ${editorState.lastSaved.toLocaleTimeString()}` : 'Not saved'}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <FiEye className="w-3 h-3" />
                    <span>{(user?.id === draft?.research_sessions?.user_id) ? 'Owner' : 'Editor'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Word Goal Progress */}
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {editorState.wordCount}/{wordGoal}
                </span>
              </div>

              {/* Auto-save Toggle */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm text-gray-600">Auto-save</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiType className="w-4 h-4" />
                  Templates
                </button>
                
                <button 
                  onClick={generateShareLink}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiShare2 className="w-4 h-4" />
                  Share
                </button>
                
                <button 
                  onClick={() => setShowPDFModal(true)}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiDownload className="w-4 h-4" />
                  Export
                </button>
                
                <button 
                  onClick={() => saveDraft(true)}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 py-2 border-t">
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiBold className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiItalic className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiUnderline className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiAlignLeft className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiAlignCenter className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiAlignRight className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiList className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiLink className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <FiImage className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1"></div>
            
            {/* Editor Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{editorState.wordCount} words</span>
              <span>{editorState.characterCount} chars</span>
              <span>{editorState.readingTime} min read</span>
            </div>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* AI Status */}
            <div className={`flex items-center gap-2 text-sm ${
              aiStatus === 'ready' ? 'text-green-600' : 
              aiStatus === 'loading' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              <FiCpu className="w-4 h-4" />
              <span className="capitalize">{aiStatus}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 bg-gray-50">
        {/* Main Editor */}
        <div className="flex-1 max-w-4xl mx-auto bg-white shadow-inner">
          <div className="p-6 min-h-[calc(100vh-140px)]">
            <ProEditor
              content={editorState.content}
              onChange={handleContentChange}
            />
          </div>
        </div>

        {/* Enhanced Sidebar */}
        <div className="w-80 border-l bg-white shadow-lg">
          <div className="flex border-b">
            {[
              { id: 'ai' as const, icon: FiZap, label: 'AI' },
              { id: 'templates' as const, icon: FiType, label: 'Templates' },
              { id: 'comments' as const, icon: FiMessageSquare, label: 'Comments' },
              { id: 'collaborators' as const, icon: FiUsers, label: 'People' },
              { id: 'history' as const, icon: FiClock, label: 'History' },
            ].map(({ id, icon: Icon, label }) => (
              <button 
                key={id}
                className={`flex-1 p-3 flex items-center justify-center gap-2 text-xs ${
                  sidebarTab === id 
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } transition-colors`}
                onClick={() => setSidebarTab(id)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 h-[calc(100vh-200px)] overflow-y-auto">
            {sidebarTab === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">AI Assistant</h3>
                  {selectedText && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {selectedText.length > 20 ? selectedText.substring(0, 20) + '...' : selectedText}
                    </span>
                  )}
                </div>
                
                {/* Quick Actions */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Quick Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { action: 'improve', label: 'Improve', color: 'bg-purple-100 text-purple-700' },
                        { action: 'summarize', label: 'Summarize', color: 'bg-green-100 text-green-700' },
                        { action: 'rewrite', label: 'Rewrite', color: 'bg-blue-100 text-blue-700' },
                        { action: 'expand', label: 'Expand', color: 'bg-yellow-100 text-yellow-700' },
                        { action: 'simplify', label: 'Simplify', color: 'bg-orange-100 text-orange-700' },
                        { action: 'formalize', label: 'Formal', color: 'bg-gray-100 text-gray-700' },
                      ].map(({ action, label, color }) => (
                        <button
                          key={action}
                          onClick={() => handleAIAction(action, editorState.content)}
                          className={`px-3 py-2 ${color} rounded-lg text-sm hover:opacity-80 transition-opacity text-center`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Prompt */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Instruction</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Ask AI to help with..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleCustomAIPrompt()}
                      />
                      <button
                        onClick={handleCustomAIPrompt}
                        disabled={!aiPrompt.trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
                      >
                        <FiZap className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  {aiSuggestions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">AI Suggestions</h4>
                      {aiSuggestions.slice(0, 3).map((suggestion) => (
                        <div key={suggestion.id} className="bg-gray-50 p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600 capitalize">
                              {suggestion.type}
                            </span>
                            {suggestion.accepted ? (
                              <FiCheck className="w-4 h-4 text-green-500" />
                            ) : (
                              <button
                                onClick={() => applySuggestion(suggestion.id)}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {suggestion.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {sidebarTab === 'templates' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Document Templates</h3>
                <div className="space-y-3">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full border-2 border-gray-300 group-hover:border-blue-500 mt-1"></div>
                        <div>
                          <h4 className="font-semibold text-sm">{template.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {template.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === 'comments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Comments ({comments.length})</h3>
                </div>
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                          <FiUser className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="font-medium text-sm">{comment.profiles?.full_name || 'Anonymous'}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {sidebarTab === 'collaborators' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Collaborators</h3>
                  <span className="text-sm text-gray-500">{onlineUsers.length} online</span>
                </div>
                
                <div className="space-y-3">
                  {collaborators.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No collaborators</p>
                  ) : (
                    collaborators.map(collaborator => (
                      <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="relative">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <FiUser className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            onlineUsers.some(u => u.user_id === collaborator.id) ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{collaborator.full_name || collaborator.email}</p>
                          <p className="text-xs text-gray-500">{collaborator.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {sidebarTab === 'history' && (
              <div className="space-y-3">
                <h3 className="font-semibold">Version History</h3>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No history available</p>
                ) : (
                  history.map(version => (
                    <div 
                      key={version.id}
                      onClick={() => router.push(`/drafts/${version.id}`)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        version.id === draft?.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">Version {version.version}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(version.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {version.content?.substring(0, 50)}...
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Choose a Template</h3>
              <button 
                onClick={() => setShowTemplates(false)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{template.name}</h4>
                        <p className="text-gray-600 mt-1">{template.description}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          {template.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced PDF Export Modal */}
      {showPDFModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Export Document</h3>
              <button 
                onClick={() => setShowPDFModal(false)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {[
                { id: 'simple', name: 'Simple', desc: 'Clean and professional layout', icon: FiAlignLeft },
                { id: 'academic', name: 'Academic', desc: 'Formal academic paper format', icon: FiType },
                { id: 'research', name: 'Research Paper', desc: 'Includes sources and references', icon: FiColumns }
              ].map(({ id, name, desc, icon: Icon }) => (
                <div
                  key={id}
                  onClick={() => handleExport(id)}
                  className="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50 group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                    <div>
                      <h4 className="font-semibold">{name}</h4>
                      <p className="text-sm text-gray-600">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Share Document</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Shareable Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(shareLink)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}