'use client';

import React, { useState } from 'react';
import { 
  FiLink, 
  FiSearch, 
  FiZap, 
  FiCopy, 
  FiExternalLink, 
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiInfo,
  FiTrendingUp
} from 'react-icons/fi';
import useAIAnalysis from '@/hooks/useAIAnalysis';

interface LinkAnalysisComponentProps {
  onAnalysisComplete?: (result: any) => void;
  onAddToSession?: (tab: any) => void;
}

const LinkAnalysisComponent: React.FC<LinkAnalysisComponentProps> = ({
  onAnalysisComplete,
  onAddToSession
}) => {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const {
    analyzeLink,
    extractInsights,
    enhanceContent,
    isLoading,
    isLocalAIAvailable
  } = useAIAnalysis();

  const handleAnalyze = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeLink(url.trim());
      setAnalysis(result);
      onAnalysisComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExtractInsights = async () => {
    if (!analysis) return;

    try {
      const insights = await extractInsights(analysis.url, analysis.summary || '');
      setAnalysis((prev: any) => ({
        ...prev,
        insights: insights.insights,
        insightsSource: insights.source
      }));
    } catch (err) {
      setError('Failed to extract insights');
    }
  };

  const handleEnhanceSummary = async (style: 'academic' | 'simple' | 'formal' = 'academic') => {
    if (!analysis?.summary) return;

    try {
      const enhanced = await enhanceContent(analysis.summary, style);
      setAnalysis((prev: any) => ({
        ...prev,
        enhancedSummary: enhanced,
        enhancementStyle: style
      }));
    } catch (err) {
      setError('Failed to enhance content');
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const addToSession = () => {
    if (analysis && onAddToSession) {
      onAddToSession({
        url: analysis.url,
        title: analysis.title,
        content: analysis.summary,
        metadata: analysis.metadata,
        ai_analyzed: analysis.aiEnhanced,
        key_points: analysis.keyPoints
      });
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string.startsWith('http') ? string : 'https://' + string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiLink className="w-5 h-5 mr-2 text-blue-600" />
            AI Link Analysis
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Analyze web content with AI for research insights
          </p>
        </div>
        {isLocalAIAvailable && (
          <div className="flex items-center text-green-600 text-sm">
            <FiZap className="w-4 h-4 mr-1" />
            Local AI Active
          </div>
        )}
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleAnalyze} className="space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          <button
            type="submit"
            disabled={!url.trim() || isAnalyzing || !isValidUrl(url)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center transition-colors"
          >
            {isAnalyzing ? (
              <>
                <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FiZap className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <FiXCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}
      </form>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6 border-t border-gray-200 pt-6">
          {/* Title and Basic Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-lg mb-2">{analysis.title}</h4>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <a 
                    href={analysis.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-blue-600 transition-colors"
                  >
                    <FiExternalLink className="w-3 h-3 mr-1" />
                    {new URL(analysis.url).hostname}
                  </a>
                  <span className="flex items-center">
                    {analysis.aiEnhanced ? (
                      <><FiZap className="w-3 h-3 mr-1 text-green-600" /> AI Enhanced</>
                    ) : (
                      <><FiInfo className="w-3 h-3 mr-1 text-gray-400" /> Basic Analysis</>
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={addToSession}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm flex items-center transition-colors"
              >
                <FiCheckCircle className="w-4 h-4 mr-2" />
                Add to Session
              </button>
            </div>
          </div>

          {/* Summary Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900 flex items-center">
                <FiInfo className="w-4 h-4 mr-2 text-blue-600" />
                Summary
              </h5>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(analysis.summary, 'summary')}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded"
                  title="Copy summary"
                >
                  {copiedSection === 'summary' ? <FiCheckCircle className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded"
                  title={showFullContent ? 'Show less' : 'Show more'}
                >
                  {showFullContent ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className={`text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 ${
              !showFullContent && analysis.summary.length > 300 ? 'max-h-32 overflow-hidden relative' : ''
            }`}>
              {showFullContent || analysis.summary.length <= 300 ? (
                analysis.summary
              ) : (
                <>
                  {analysis.summary.substring(0, 300)}...
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
                </>
              )}
            </div>
          </div>

          {/* Enhanced Summary */}
          {analysis.enhancedSummary && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 flex items-center">
                  <FiTrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                  Enhanced Summary ({analysis.enhancementStyle})
                </h5>
                <button
                  onClick={() => copyToClipboard(analysis.enhancedSummary, 'enhanced')}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded"
                  title="Copy enhanced summary"
                >
                  {copiedSection === 'enhanced' ? <FiCheckCircle className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed bg-purple-50 rounded-lg p-4">
                {analysis.enhancedSummary}
              </div>
            </div>
          )}

          {/* Key Points */}
          {analysis.keyPoints && analysis.keyPoints.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                <FiCheckCircle className="w-4 h-4 mr-2 text-green-600" />
                Key Points
              </h5>
              <ul className="space-y-2">
                {analysis.keyPoints.map((point: string, index: number) => (
                  <li key={index} className="flex items-start text-sm text-gray-700">
                    <span className="text-blue-600 mr-2 mt-1">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 flex items-center">
                  <FiZap className="w-4 h-4 mr-2 text-yellow-600" />
                  AI Insights
                </h5>
                <span className="text-xs text-gray-500">
                  Source: {analysis.insightsSource}
                </span>
              </div>
              <ul className="space-y-2">
                {analysis.insights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start text-sm text-gray-700 bg-yellow-50 rounded-lg p-3">
                    <span className="text-yellow-600 mr-2 mt-1">💡</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleExtractInsights}
              disabled={isLoading}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 text-sm flex items-center transition-colors"
            >
              <FiTrendingUp className="w-4 h-4 mr-2" />
              Extract Insights
            </button>
            <button
              onClick={() => handleEnhanceSummary('academic')}
              disabled={isLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm flex items-center transition-colors"
            >
              <FiZap className="w-4 h-4 mr-2" />
              Academic Style
            </button>
            <button
              onClick={() => handleEnhanceSummary('simple')}
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm flex items-center transition-colors"
            >
              <FiZap className="w-4 h-4 mr-2" />
              Simplify
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isLoading || isAnalyzing) && (
        <div className="flex items-center justify-center py-8 border-t border-gray-200">
          <div className="flex items-center space-x-3 text-blue-600">
            <FiLoader className="w-6 h-6 animate-spin" />
            <span>AI is processing the content...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkAnalysisComponent;