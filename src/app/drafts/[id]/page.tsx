'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft } from '@/types/main.db';

interface IDraftWithResearchSession extends IDraft {
  research_sessions: {
    title: string;
  };
}

import {
  FiArrowLeft, FiSave, FiDownload, FiCpu, FiX
} from 'react-icons/fi';
import { useAIService } from '@/hooks/useAIService';
import { useDraftCollaboration } from '@/hooks/useDraftCollaboration';
import AdvancedEditor from '@/components/editor/AdvancedEditor';

export default function DraftEditPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;
  const supabase = createClient();
  
  const [draft, setDraft] = useState<IDraftWithResearchSession | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [user, setUser] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('comments');
  const [history, setHistory] = useState<IDraft[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    getUser();
  }, [supabase]);

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
        .select('*, profiles(*)')
        .single();

      if (error) throw error;
      setComments(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState('simple');
  
  const { aiStatus, generateSummary, rewriteContent } = useAIService();
  const { onlineUsers, cursorPositions, broadcastCursorPosition } = useDraftCollaboration(draftId, user?.id);

  useEffect(() => {
    if (draftId) {
      loadDraft().then(() => {
        loadComments();
        loadHistory();
      });
    }
  }, [draftId]);

  const loadHistory = async () => {
    if (!draft) return;
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('research_session_id', draft.research_session_id)
        .order('version', { ascending: false });

      if (error) throw error;
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*, research_sessions(title)')
        .eq('id', draftId)
        .single();

      if (error) throw error;
      setDraft(data);
      setEditedContent(data.content);
    } catch (error) {
      console.error('Error loading draft:', error);
      router.push('/drafts');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft || !user) return;
    setSaving(true);
    try {
      const { data: newDraft, error } = await supabase
        .from('drafts')
        .insert({
          research_session_id: draft.research_session_id,
          content: editedContent,
          version: draft.version + 1,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      router.push(`/drafts/${newDraft.id}`);

    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAIAction = async (action: string, content: string) => {
    switch (action) {
      case 'summarize':
        return await generateSummary(content, 'draft');
      case 'rewrite':
        return await rewriteContent(content, 'academic');
      case 'simplify':
        return await rewriteContent(content, 'simple');
      case 'formalize':
        return await rewriteContent(content, 'formal');
      case 'casual':
        return await rewriteContent(content, 'casual');
      case 'friendly':
        return await rewriteContent(content, 'friendly');
      case 'professional':
        return await rewriteContent(content, 'professional');
      default:
        return content;
    }
  };

  const exportToPDF = async (template: string) => {
    if (!draft) return;

    setShowPDFModal(false);

    if (template === 'simple') {
      import('jspdf').then(jsPDF => {
        const doc = new jsPDF.default();
        const pageHeight = doc.internal.pageSize.height;
        let y = 20; // Initial y position

        // Title
        doc.setFontSize(22);
        doc.text(draft.research_sessions?.title || 'Draft', 10, y);
        y += 10;

        // Version
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Version ${draft.version}`, 10, y);
        y += 10;

        // Horizontal line
        doc.setDrawColor(200);
        doc.line(10, y, 200, y);
        y += 10;

        // Content
        doc.setFontSize(12);
        doc.setTextColor(0);
        
        // Create a temporary div to get the text content from the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editedContent;
        const textContent = tempDiv.innerText;

        const splitText = doc.splitTextToSize(textContent, 180);
        
        splitText.forEach(line => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 10, y);
          y += 7;
        });

        doc.save(`${draft.research_sessions?.title || 'draft'}.pdf`);
      });
    } else if (template === 'academic' || template === 'research') {
      // Fetch tabs for the research session
      const { data: tabs, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('session_id', draft.research_session_id);

      if (error) {
        console.error('Error fetching tabs:', error);
        return;
      }

      import('jspdf').then(jsPDF => {
        const doc = new jsPDF.default();
        
        // Title page
        doc.setFontSize(22);
        doc.text(draft.research_sessions?.title || 'Draft', 10, 140);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Version ${draft.version}`, 10, 150);

        doc.addPage();

        // Content
        doc.setFontSize(12);
        doc.setTextColor(0);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editedContent;
        const textContent = tempDiv.innerText;
        const splitText = doc.splitTextToSize(textContent, 180);
        let y = 20;
        const pageHeight = doc.internal.pageSize.height;
        splitText.forEach(line => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 10, y);
          y += 7;
        });

        // References
        doc.addPage();
        doc.setFontSize(18);
        doc.text('References', 10, 20);
        y = 30;
        doc.setFontSize(12);
        tabs.forEach(tab => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(tab.title || '', 10, y);
          y += 5;
          doc.setTextColor(0, 0, 255);
          doc.textWithLink(tab.url, 10, y, { url: tab.url });
          doc.setTextColor(0);
          y += 10;
        });

        doc.save(`${draft.research_sessions?.title || 'draft'}.pdf`);
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex">
        <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <button onClick={() => router.push('/drafts')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2">
                <FiArrowLeft /> Back to Drafts
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{draft?.research_sessions?.title || 'Edit Draft'}</h1>
              <p className="text-sm text-gray-500">Version {draft?.version}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center text-sm ${aiStatus === 'ready' ? 'text-green-600' : 'text-yellow-600'}`}>
                <FiCpu className="w-4 h-4 mr-1" /> AI: {aiStatus}
              </span>
              <button onClick={() => setShowPDFModal(true)} className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                <FiDownload /> Export PDF
              </button>
              <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <FiSave /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <AdvancedEditor
            value={editedContent}
            onChange={setEditedContent}
            onAIAction={handleAIAction}
            onAddComment={addComment}
            placeholder="Start writing your draft..."
            onlineUsers={onlineUsers}
            currentUser={user}
            onCursorPositionChange={broadcastCursorPosition}
            cursorPositions={cursorPositions}
          />
        </div>
        <div className="w-80 border-l p-4">
          <div className="flex border-b mb-4">
            <button className={`flex-1 p-2 ${sidebarTab === 'comments' ? 'border-b-2 border-blue-500' : ''}`} onClick={() => setSidebarTab('comments')}>Comments</button>
            <button className={`flex-1 p-2 ${sidebarTab === 'history' ? 'border-b-2 border-blue-500' : ''}`} onClick={() => setSidebarTab('history')}>History</button>
          </div>
          {sidebarTab === 'comments' && (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <img src={comment.profiles?.avatar_url} className="w-6 h-6 rounded-full mr-2" />
                    <span className="font-semibold">{comment.profiles?.full_name}</span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
          {sidebarTab === 'history' && (
            <div className="space-y-4">
              {history.map(h => (
                <div key={h.id} onClick={() => router.push(`/drafts/${h.id}`)} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  Version {h.version}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPDFModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Choose PDF Template</h3>
              <button onClick={() => setShowPDFModal(false)} className="p-1 rounded-full hover:bg-gray-200">
                <FiX />
              </button>
            </div>
            <div className="space-y-4">
              <div
                onClick={() => setPdfTemplate('simple')}
                className={`p-4 border rounded-lg cursor-pointer ${pdfTemplate === 'simple' ? 'border-blue-500' : 'border-gray-300'}`}
              >
                <h4 className="font-semibold">Simple</h4>
                <p className="text-sm text-gray-600">A clean and simple layout.</p>
              </div>
              <div
                onClick={() => setPdfTemplate('academic')}
                className={`p-4 border rounded-lg cursor-pointer ${pdfTemplate === 'academic' ? 'border-blue-500' : 'border-gray-300'}`}
              >
                <h4 className="font-semibold">Academic</h4>
                <p className="text-sm text-gray-600">A template for academic papers.</p>
              </div>
              <div
                onClick={() => setPdfTemplate('research')}
                className={`p-4 border rounded-lg cursor-pointer ${pdfTemplate === 'research' ? 'border-blue-500' : 'border-gray-300'}`}
              >
                <h4 className="font-semibold">Research Paper</h4>
                <p className="text-sm text-gray-600">A template for research papers with sources.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => exportToPDF(pdfTemplate)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}