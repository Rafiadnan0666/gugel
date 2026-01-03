import LanguageModelTest from '@/components/LanguageModelTest';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold text-center mb-8">AI Integration Test</h1>
        <LanguageModelTest />
      </div>
    </div>
  );
}