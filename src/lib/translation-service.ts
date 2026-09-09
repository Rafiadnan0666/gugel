import { aiService } from './ai-service';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'pt' | 'ar' | 'hi' | 'id' | 'ko' | 'ru' | 'it' | 'nl' | 'sv';

export interface TranslationConfig {
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  preserveFormatting: boolean;
  academicTerminology: boolean;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, { en: string; native: string }> = {
  en: { en: 'English', native: 'English' },
  es: { en: 'Spanish', native: 'Español' },
  fr: { en: 'French', native: 'Français' },
  de: { en: 'German', native: 'Deutsch' },
  zh: { en: 'Chinese', native: '中文' },
  ja: { en: 'Japanese', native: '日本語' },
  pt: { en: 'Portuguese', native: 'Português' },
  ar: { en: 'Arabic', native: 'العربية' },
  hi: { en: 'Hindi', native: 'हिन्दी' },
  id: { en: 'Indonesian', native: 'Bahasa Indonesia' },
  ko: { en: 'Korean', native: '한국어' },
  ru: { en: 'Russian', native: 'Русский' },
  it: { en: 'Italian', native: 'Italiano' },
  nl: { en: 'Dutch', native: 'Nederlands' },
  sv: { en: 'Swedish', native: 'Svenska' },
};

export async function translateSection(
  content: string,
  config: TranslationConfig
): Promise<string> {
  const sourceName = LANGUAGE_NAMES[config.sourceLanguage]?.en || 'English';
  const targetName = LANGUAGE_NAMES[config.targetLanguage]?.en || 'English';

  const prompt = `Translate the following academic content from ${sourceName} to ${targetName}.

Rules:
- Maintain academic tone and formal language
- Preserve all technical terminology accurately
- Keep citation formats unchanged (e.g., (Smith, 2024) stays as is)
- Preserve all figure/table references
- Maintain paragraph structure
- Use ${config.academicTerminology ? 'standard academic terminology' : 'natural, fluent translation'}
- Do NOT add or remove any content
- Return ONLY the translated text, no explanations

Content to translate:
${content}`;

  const result = await aiService.generate(prompt, {
    preferredProvider: 'openrouter',
    maxTokens: 8000,
    temperature: 0.3,
  });

  return result.text;
}

export async function translateFullPaper(
  paper: { sections: { title: string; content: string }[]; references: any[] },
  config: TranslationConfig
): Promise<{ sections: { title: string; content: string }[]; references: any[] }> {
  const translatedSections = [];

  for (const section of paper.sections) {
    if (!section.content) {
      translatedSections.push(section);
      continue;
    }

    const translatedContent = await translateSection(section.content, config);

    // Also translate section title
    const translatedTitle = await translateSection(section.title, {
      ...config,
      academicTerminology: false,
    });

    translatedSections.push({
      title: translatedTitle.trim() || section.title,
      content: translatedContent,
    });
  }

  // References typically stay in original language, but translate if needed
  return {
    sections: translatedSections,
    references: paper.references,
  };
}

export function getSupportedLanguages(): { code: SupportedLanguage; name: string; nativeName: string }[] {
  return Object.entries(LANGUAGE_NAMES).map(([code, names]) => ({
    code: code as SupportedLanguage,
    name: names.en,
    nativeName: names.native,
  }));
}

export async function rewriteInLanguage(
  content: string,
  targetLanguage: SupportedLanguage,
  style: 'formal' | 'academic' | 'simplified' = 'academic'
): Promise<string> {
  const targetName = LANGUAGE_NAMES[targetLanguage]?.en || 'English';

  const prompt = `Rewrite the following content in ${targetLanguage === 'en' ? 'English' : targetName} with a ${style} style.

Rules:
- Maintain the core meaning and all key points
- Use natural, fluent ${targetName} language
- Apply ${style} writing conventions
- Keep all citations and references unchanged
- Preserve paragraph structure
- Return ONLY the rewritten content

Content:
${content}`;

  const result = await aiService.generate(prompt, {
    preferredProvider: 'mistral',
    maxTokens: 8000,
    temperature: 0.5,
  });

  return result.text;
}
