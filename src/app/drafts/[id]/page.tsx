'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft } from '@/types/main.db';
import {
  FiArrowLeft, FiSave, FiDownload, FiCpu
} from 'react-icons/fi';
import { useAIService } from '@/hooks/useAIService';
import AdvancedEditor from '@/components/editor/AdvancedEditor';

export default function DraftEditPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;
  const supabase = createClient();
  
  const [draft, setDraft] = useState<IDraft | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { aiStatus, generateSummary, rewriteContent } = useAIService();

  useEffect(() => {
    if (draftId) {
      loadDraft();
    }
  }, [draftId]);

  const loadDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*, research_sessions(title)')
        .eq('id', draftId)
        .single();

      if (error) throw error;
      setDraft(data as any);
      setEditedContent(data.content);
    } catch (error) {
      console.error('Error loading draft:', error);
      router.push('/drafts');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('drafts')
        .update({ content: editedContent, version: draft.version + 1 })
        .eq('id', draft.id)
        .select()
        .single();

      if (error) throw error;
      setDraft(data as any);
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

  const exportToPDF = () => {
    const draftElement = document.querySelector('.prose');
    if (draftElement) {
      import('html2canvas').then(html2canvas => {
        import('jspdf').then(jsPDF => {
          html2canvas.default(draftElement as HTMLElement).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF.default();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${(draft?.research_session_id as any)?.title || 'draft'}.pdf`);
          });
        });
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <button onClick={() => router.push('/drafts')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2">
              <FiArrowLeft /> Back to Drafts
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{(draft?.research_session_id as any)?.title || 'Edit Draft'}</h1>
            <p className="text-sm text-gray-500">Version {draft?.version}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center text-sm ${aiStatus === 'ready' ? 'text-green-600' : 'text-yellow-600'}`}>
              <FiCpu className="w-4 h-4 mr-1" /> AI: {aiStatus}
            </span>
            <button onClick={exportToPDF} className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
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
          placeholder="Start writing your draft..."
        />
      </div>
    </Layout>
  );
}