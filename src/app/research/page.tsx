'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession } from '@/types/main.db';
import { FiBook, FiPlus, FiGlobe, FiSearch, FiZap, FiFilter, FiTrendingUp, FiDatabase, FiCode, FiLayers, FiExternalLink } from 'react-icons/fi';

export default function ResearchPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Features State
  const [researchQuery, setResearchQuery] = useState('');
  const [isAnalyzingQuery, setIsAnalyzingQuery] = useState(false);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [batchCreation, setBatchCreation] = useState(false);
  const [researchSources, setResearchSources] = useState<string[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/sign-in');
          return;
        }

        const { data: sessionData, error } = await supabase
          .from('research_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (sessionData) {
          setSessions(sessionData);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [router, supabase]);

  const createNewSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newSession } = await supabase
      .from('research_sessions')
      .insert([{
        user_id: user.id, 
        title: `Research Session - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      }])
      .select()
      .single();

    if (newSession) {
      router.push(`/session/${newSession.id}`);
    }
  };

  // Advanced Research Functions
  const analyzeResearchQuery = async () => {
    if (!researchQuery.trim()) {
      alert('Please enter a research query');
      return;
    }

    setIsAnalyzingQuery(true);
    setQueryResults([]);

    try {
      // Use AI to generate research insights
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze this research query and provide comprehensive insights: "${researchQuery}". Generate:
          1. Key research questions to investigate
          2. Recommended search terms and keywords
          3. Potential research sources and approaches
          4. Suggested research methodology
          5. Expected outcomes and deliverables`,
          task: 'analyze-query'
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      
      // Parse and display AI insights
      const insights = result.result.split('\n').filter((line: string) => line.trim().length > 0);
      setAiInsights(insights);
      
      // Generate search terms from insights
      const searchTerms = extractSearchTerms(result.result);
      setQueryResults(searchTerms.map((term: string, index: number) => ({
        id: `query-${index}`,
        query: term,
        type: 'ai-suggestion',
        relevance: Math.max(1, 100 - index * 10)
      })));
      
    } catch (error) {
      console.error('Query analysis failed:', error);
      alert('Failed to analyze research query');
    } finally {
      setIsAnalyzingQuery(false);
    }
  };

  const extractSearchTerms = (aiResponse: string): string[] => {
    const terms: string[] = [];
    
    // Extract keywords from AI response
    const keywordPatterns = [
      /(?:keywords?|search terms?):\s*([^\n]+)/i,
      /(?:recommend(?:ed)?\s*(?:to\s*)?search\s*for):\s*([^\n]+)/i,
      /(?:research\s*(?:topics?|questions?)):\s*([^\n]+)/i,
      /(?:investigate|explore):\s*([^\n]+)/i
    ];

    keywordPatterns.forEach(pattern => {
      const match = aiResponse.match(pattern);
      if (match && match[1]) {
        const extractedTerms = match[1]
          .split(/[,;]/)
          .map((term: string) => term.trim())
          .filter((term: string) => term.length > 0);
        terms.push(...extractedTerms);
      }
    });

    // Add some default research terms based on query
    if (terms.length === 0) {
      const queryWords = researchQuery.toLowerCase().split(/\s+/);
      terms.push(
        `${researchQuery} research methodology`,
        `${researchQuery} case studies`,
        `${researchQuery} literature review`,
        `${queryWords[0]} analysis framework`
      );
    }

    return [...new Set(terms)].slice(0, 8); // Remove duplicates and limit to 8
  };

  const createBatchSessions = async () => {
    if (selectedTopics.length === 0) {
      alert('Please select research topics');
      return;
    }

    setBatchCreation(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sessionPromises = selectedTopics.map(async (topic, index) => {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Create a comprehensive research session about "${topic}". Include:
            1. Research objectives and questions
            2. Methodology approach
            3. Key areas to investigate
            4. Expected outcomes
            5. Initial draft structure

            Generate a detailed research plan that can be immediately implemented.`,
            task: 'generate-research-plan'
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to generate session ${index + 1}`);
        }

        const result = await response.json();

        return supabase
          .from('research_sessions')
          .insert([{
            user_id: user.id,
            title: `Research: ${topic}`,
            metadata: {
              aiGenerated: true,
              researchTopic: topic,
              plan: result.result,
              generatedAt: new Date().toISOString()
            }
          }])
          .select()
          .single();
      });

      const createdSessions = await Promise.all(sessionPromises);
      
      alert(`Successfully created ${createdSessions.length} research sessions`);
      setSelectedTopics([]);
      setBatchCreation(false);
      
      // Navigate to first created session
      if (createdSessions.length > 0 && createdSessions[0].data) {
        router.push(`/session/${createdSessions[0].data.id}`);
      }
      
    } catch (error) {
      console.error('Batch session creation failed:', error);
      alert('Failed to create research sessions');
      setBatchCreation(false);
    }
  };

  const addResearchSource = async (source: string) => {
    if (!source.trim()) return;

    try {
      // Add to research sources list
      setResearchSources(prev => [...prev, source.trim()]);
      
      // Optionally analyze the source
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: source, task: 'scrape-single' })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.result.success) {
          alert(`Source analyzed successfully: ${result.result.content?.title || 'Untitled'}`);
        }
      }
    } catch (error) {
      console.error('Failed to analyze source:', error);
      alert('Failed to analyze research source');
    }
  };

  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Research</h1>
            <p className="text-gray-600 mt-2">All your research sessions in one place.</p>
          </div>
          <button
            onClick={createNewSession}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center space-x-2 shadow-md"
          >
            <FiPlus className="w-5 h-5" />
            <span>New Session</span>
          </button>
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <FiBook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No research sessions yet.</p>
              <button
                onClick={createNewSession}
                className="text-blue-600 hover:underline mt-2 font-medium"
              >
                Create your first session
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
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
      </div>
    </Layout>
  );
}