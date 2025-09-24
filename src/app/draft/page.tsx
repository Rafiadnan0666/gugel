'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IResearchSession, IProfile } from '@/types/main.db';
import {
  FiSave,
  FiArrowLeft,
  FiDownload,
  FiCopy,
  FiZap,
  FiBarChart2,
  FiEye,
  FiEdit3,
  FiClock,
  FiUser,
  FiBook
} from 'react-icons/fi';

interface DraftWithSession extends IDraft {
  research_sessions: IResearchSession;
  profiles?: IProfile;
}

export default function DraftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;
  const supabase = createClient();

  const [draft, setDraft] = useState<DraftWithSession | null>(null);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiEnhancing, setAiEnhancing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draftId) {
      loadDraft();
    }
  }, [draftId]);

  const loadDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select(`
          *,
          research_sessions (
            id,
            user_id,
            team_id,
            title,
            created_at
          ),
          profiles:research_sessions.profiles (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('id', draftId)
        .single();

      if (error) throw error;

      if (data) {
        setDraft(data as DraftWithSession);
        setContent(data.content || '');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('drafts')
        .update({ 
          content: content,
          created_at: new Date().toISOString()
        })
        .eq('id', draftId)
        .select(`
          *,
          research_sessions (
            id,
            user_id,
            team_id,
            title,
            created_at
          ),
          profiles:research_sessions.profiles (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        setDraft(data as DraftWithSession);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const createNewVersion = async () => {
    if (!draft) return;

    setIsSaving(true);
    try {
      // Get the latest version number
      const { data: latestDraft, error: versionError } = await supabase
        .from('drafts')
        .select('version')
        .eq('session_id', draft.session_id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (versionError && versionError.code !== 'PGRST116') {
        throw versionError;
      }

      const newVersion = (latestDraft?.version || 0) + 1;

      const { data, error } = await supabase
        .from('drafts')
        .insert({
          session_id: draft.session_id,
          content: content,
          version: newVersion,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          research_sessions (
            id,
            user_id,
            team_id,
            title,
            created_at
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        router.push(`/drafts/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating new version:', error);
      alert('Failed to create new version');
    } finally {
      setIsSaving(false);
    }
  };

  const enhanceWithAI = async () => {
    if (!content.trim()) return;

    setAiEnhancing(true);
    try {
      // Simulate AI enhancement - replace with actual AI service integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const enhancedContent = `# Enhanced Draft - ${new Date().toLocaleDateString()}\n\n` +
        content + 
        '\n\n---\n*Enhanced with AI: Improved structure and clarity.*\n' +
        '*Key improvements: Better organization, grammar corrections, and enhanced readability.*';
      
      setContent(enhancedContent);
    } catch (error) {
      console.error('AI enhancement failed:', error);
      alert('AI enhancement failed. Please try again.');
    } finally {
      setAiEnhancing(false);
    }
  };

  const exportDraft = () => {
    if (!draft || !content.trim()) return;

    const sessionTitle = draft.research_sessions?.title || 'unknown-session';
    const fileName = `draft-${sessionTitle.replace(/\s+/g, '-').toLowerCase()}-v${draft.version}.md`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      alert('Draft copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
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

  if (!draft) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Draft not found</h1>
            <button 
              onClick={() => router.push('/drafts')}
              className="text-black hover:underline"
            >
              Back to Drafts
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const session = draft.research_sessions;
  const author = draft.profiles;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.push('/drafts')}
            className="flex items-center text-gray-600 hover:text-black mb-6 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Drafts
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {session?.title || 'Untitled Session'}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                <span className="flex items-center">
                  <FiClock className="w-4 h-4 mr-1" />
                  Version {draft.version}
                </span>
                
                <span className="flex items-center">
                  <FiUser className="w-4 h-4 mr-1" />
                  {author?.full_name || author?.email || 'Unknown author'}
                </span>
                
                <span className="flex items-center">
                  <FiBook className="w-4 h-4 mr-1" />
                  Last updated {new Date(draft.created_at).toLocaleDateString()}
                </span>
                
                {session?.team_id && (
                  <span className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    Team Session
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyToClipboard}
                disabled={!content.trim()}
                className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <FiCopy className="w-4 h-4 mr-2" />
                Copy
              </button>
              
              <button
                onClick={enhanceWithAI}
                disabled={aiEnhancing || !content.trim()}
                className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors"
              >
                <FiZap className="w-4 h-4 mr-2" />
                {aiEnhancing ? 'Enhancing...' : 'AI Enhance'}
              </button>
              
              <button
                onClick={exportDraft}
                disabled={!content.trim()}
                className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Export
              </button>
              
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={createNewVersion}
                    disabled={isSaving}
                    className="flex items-center px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 transition-colors"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Save as New Version
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FiEdit3 className="w-4 h-4 mr-2" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Draft Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[500px] p-6 border-0 rounded-lg focus:outline-none resize-none font-mono text-sm leading-relaxed"
              placeholder="Start writing your research draft..."
              autoFocus
            />
          ) : (
            <div className="p-6">
              {content ? (
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900 leading-relaxed">
                  {content}
                </pre>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <FiEdit3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>This draft is empty. Start editing to add content.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Enhancement Indicator */}
        {aiEnhancing && (
          <div className="mt-4 flex items-center justify-center p-4 bg-purple-50 rounded-lg border border-purple-100">
            <FiZap className="w-5 h-5 text-purple-600 mr-2 animate-pulse" />
            <span className="text-purple-700 font-medium">AI is enhancing your draft...</span>
          </div>
        )}

        {/* Session Info Panel */}
        {session && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Title:</span>
                <p className="text-gray-900">{session.title}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-900">{new Date(session.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Draft Version:</span>
                <p className="text-gray-900">{draft.version}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-900">{new Date(draft.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}