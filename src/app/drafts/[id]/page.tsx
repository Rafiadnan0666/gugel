'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IResearchSession, IProfile } from '@/types/main.db';
import {
  FiArrowLeft, FiSave, FiDownload, FiZap, FiCpu, FiFileText,
  FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft,
  FiAlignCenter, FiAlignRight, FiLink2, FiOctagon, FiRotateCw,
  FiTarget, FiCoffee, FiAward, FiGlobe,
  FiSmile, FiBriefcase
} from 'react-icons/fi';

// AI Service Hook (copied from session page)
const useAIService = () => {
  const [aiSession, setAiSession] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');

  useEffect(() => {
    const initializeAI = async () => {
      try {
        const opts = {
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        };

        const availability = await (window as any).LanguageModel.availability(opts);
        if (availability === "unavailable") {
          setAiStatus('unavailable');
          return;
        }

        const session = await (window as any).LanguageModel.create({
          ...opts,
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              console.log(`📥 Download progress: ${(e.loaded * 100).toFixed(1)}%`);
            });
            m.addEventListener("statechange", (e: any) => {
              console.log("⚡ State change:", e.target.state);
            });
          }
        });
        setAiSession(session);
        setAiStatus('ready');
      } catch (err) {
        console.error("Error:", err);
        setAiStatus('error');
      }
    };

    if ((window as any).LanguageModel) {
      initializeAI();
    } else {
      setAiStatus('error');
    }
  }, []);

  const cleanAIResponse = (text: string) => {
    return text.replace(/##/g, '').replace(/\*\*/g, '').trim();
  };

  const promptAI = async (prompt: string) => {
    if (!aiSession) return "AI not available";
    try {
      const result = await aiSession.prompt(prompt);
      return cleanAIResponse(result);
    } catch (error) {
      return "Error from AI";
    }
  };

  const generateSummary = async (content: string) => {
    return await promptAI(`Summarize this content: ${content.substring(0, 2000)}`);
  };

  const rewriteContent = async (content: string, style: string = 'academic') => {
    return await promptAI(`Rewrite in ${style} style: ${content.substring(0, 2000)}`);
  };

  return {
    aiStatus,
    generateSummary,
    rewriteContent,
    promptAI
  };
};

// Advanced Editor (copied from session page)
const AdvancedEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onAIAction?: (action: string, content: string) => Promise<string>;
}> = ({ value, onChange, placeholder, disabled, onAIAction }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAITools, setShowAITools] = useState(false);

  const formatText = (command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAIAction = async (action: string) => {
    if (!onAIAction || !editorRef.current) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString() || editorRef.current.innerText;
    if (!selectedText.trim()) return;
    
    setIsAILoading(true);
    try {
      const result = await onAIAction(action, selectedText);
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(result));
      } else {
        editorRef.current.innerHTML += `<p>${result}</p>`;
      }
      onChange(editorRef.current.innerHTML);
    } finally {
      setIsAILoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const AI_TOOLS = [
    { id: 'summarize', label: 'Summarize', icon: FiFileText },
    { id: 'rewrite', label: 'Rewrite', icon: FiRotateCw },
    { id: 'simplify', label: 'Simplify', icon: FiCoffee },
    { id: 'formalize', label: 'Formalize', icon: FiAward },
  ];

  const AI_TONE_TOOLS = [
    { id: 'casual', label: 'Make Casual', icon: FiCoffee },
    { id: 'friendly', label: 'Make Friendly', icon: FiSmile },
    { id: 'professional', label: 'Make Professional', icon: FiBriefcase },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden relative">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button type="button" onClick={() => setShowAITools(!showAITools)} className="p-2 rounded hover:bg-gray-200 relative" title="AI Tools">
          <FiOctagon className="w-4 h-4 text-purple-600" />
          {showAITools && <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full"></div>}
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button type="button" onClick={() => formatText('bold')} className="p-2 rounded hover:bg-gray-200" title="Bold"><FiBold className="w-4 h-4" /></button>
        <button type="button" onClick={() => formatText('italic')} className="p-2 rounded hover:bg-gray-200" title="Italic"><FiItalic className="w-4 h-4" /></button>
        <button type="button" onClick={() => formatText('underline')} className="p-2 rounded hover:bg-gray-200" title="Underline"><FiUnderline className="w-4 h-4" /></button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button type="button" onClick={() => formatText('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200" title="Bullet List"><FiList className="w-4 h-4" /></button>
      </div>
      
      {showAITools && (
        <div className="absolute top-12 left-2 z-10 bg-white border rounded-lg shadow-xl w-60 p-2">
          <p className="text-xs font-semibold text-gray-500 px-2 pt-1 pb-2">Content</p>
          {AI_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => handleAIAction(tool.id)} disabled={isAILoading} className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-left disabled:opacity-50">
              <tool.icon className="w-4 h-4 text-blue-600" />
              <span>{tool.label}</span>
            </button>
          ))}
          <p className="text-xs font-semibold text-gray-500 px-2 pt-3 pb-2">Tone</p>
          {AI_TONE_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => handleAIAction(tool.id)} disabled={isAILoading} className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-left disabled:opacity-50">
              <tool.icon className="w-4 h-4 text-green-600" />
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      )}

      <div ref={editorRef} contentEditable={!disabled} onInput={(e) => onChange(e.currentTarget.innerHTML)} onPaste={handlePaste} className="min-h-[500px] p-4 focus:outline-none prose max-w-none" dangerouslySetInnerHTML={{ __html: value || placeholder }} />

      {isAILoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-blue-600">
            <FiCpu className="animate-spin h-6 w-6" />
            <span>AI is thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
};

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
        return await generateSummary(content);
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
            pdf.save(`${(draft?.research_sessions as any)?.title || 'draft'}.pdf`);
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
            <h1 className="text-2xl font-bold text-gray-900">{(draft?.research_sessions as any)?.title || 'Edit Draft'}</h1>
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
