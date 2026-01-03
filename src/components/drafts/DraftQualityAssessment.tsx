import React from 'react';
import { FiBarChart2, FiTrendingUp, FiTarget, FiAward, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface QualityMetrics {
  overall: number;
  clarity: number;
  coherence: number;
  academicTone: number;
  grammar: number;
  structure: number;
  originality: number;
  readingLevel: 'easy' | 'medium' | 'hard';
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
}

interface DraftQualityAssessmentProps {
  metrics: QualityMetrics;
  suggestions: string[];
  improvements: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  onApplyImprovement?: (improvement: any) => void;
  isAnalyzing?: boolean;
}

const DraftQualityAssessment: React.FC<DraftQualityAssessmentProps> = ({
  metrics,
  suggestions,
  improvements,
  onApplyImprovement,
  isAnalyzing = false
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <FiAlertTriangle className="text-red-500" />;
      case 'medium':
        return <FiTarget className="text-yellow-500" />;
      case 'low':
        return <FiCheckCircle className="text-green-500" />;
      default:
        return <FiTarget className="text-gray-500" />;
    }
  };

  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analyzing content quality...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiAward className="mr-2 text-blue-600" />
            Quality Assessment
          </h3>
          <div className={`text-3xl font-bold ${getScoreColor(metrics.overall)}`}>
            {metrics.overall}/100
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-3 rounded-lg ${getScoreBgColor(metrics.clarity)}`}>
            <div className="text-sm text-gray-600">Clarity</div>
            <div className={`text-xl font-semibold ${getScoreColor(metrics.clarity)}`}>
              {metrics.clarity}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${getScoreBgColor(metrics.coherence)}`}>
            <div className="text-sm text-gray-600">Coherence</div>
            <div className={`text-xl font-semibold ${getScoreColor(metrics.coherence)}`}>
              {metrics.coherence}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${getScoreBgColor(metrics.academicTone)}`}>
            <div className="text-sm text-gray-600">Academic Tone</div>
            <div className={`text-xl font-semibold ${getScoreColor(metrics.academicTone)}`}>
              {metrics.academicTone}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${getScoreBgColor(metrics.originality)}`}>
            <div className="text-sm text-gray-600">Originality</div>
            <div className={`text-xl font-semibold ${getScoreColor(metrics.originality)}`}>
              {metrics.originality}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiBarChart2 className="mr-2 text-blue-600" />
          Detailed Metrics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Grammar & Syntax</span>
              <span className={`font-semibold ${getScoreColor(metrics.grammar)}`}>
                {metrics.grammar}/100
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Structure</span>
              <span className={`font-semibold ${getScoreColor(metrics.structure)}`}>
                {metrics.structure}/100
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reading Level</span>
              <span className={`font-semibold capitalize ${getScoreColor(
                metrics.readingLevel === 'easy' ? 80 : 
                metrics.readingLevel === 'medium' ? 60 : 40
              )}`}>
                {metrics.readingLevel}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Word Count</span>
              <span className="font-semibold text-gray-900">
                {metrics.wordCount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sentence Count</span>
              <span className="font-semibold text-gray-900">
                {metrics.sentenceCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Sentence Length</span>
              <span className="font-semibold text-gray-900">
                {metrics.avgSentenceLength}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiTrendingUp className="mr-2 text-blue-600" />
            AI Suggestions
          </h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span className="text-gray-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Recommendations */}
      {improvements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiTarget className="mr-2 text-blue-600" />
            Improvement Recommendations
          </h3>
          <div className="space-y-3">
            {improvements.map((improvement, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {getPriorityIcon(improvement.priority)}
                      <span className="ml-2 font-medium text-gray-900 capitalize">
                        {improvement.type}
                      </span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                        improvement.priority === 'high' ? 'bg-red-100 text-red-800' :
                        improvement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {improvement.priority}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{improvement.description}</p>
                  </div>
                  {onApplyImprovement && (
                    <button
                      onClick={() => onApplyImprovement(improvement)}
                      className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftQualityAssessment;