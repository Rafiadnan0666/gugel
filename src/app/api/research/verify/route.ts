import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { EvidenceVerifier } from '@/lib/evidence-verifier';
import { sanitizeInput, checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  const rl = checkRateLimit('ai-generate', RATE_LIMITS['ai-generate']);
  if (!rl.allowed) return createRateLimitResponse(rl.resetAt, RATE_LIMITS['ai-generate'].message || 'Rate limit exceeded');

  const body = await request.json();
  const { references, topic } = body;

  if (!references || !Array.isArray(references) || references.length === 0) {
    return NextResponse.json({ error: 'References array is required' }, { status: 400 });
  }

  if (references.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 references per verification' }, { status: 400 });
  }

  // Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const verifier = new EvidenceVerifier(user.id);

    const sanitizedRefs = references.map((ref: any) => ({
      title: sanitizeInput(ref.title || ''),
      authors: sanitizeInput(ref.authors || ''),
      year: parseInt(ref.year) || 2024,
      doi: ref.doi ? sanitizeInput(ref.doi) : undefined,
    }));

    const results = await verifier.verifyAllReferences(sanitizedRefs);
    const report = await verifier.generateVerificationReport(results);

    const verifiedCount = results.filter(r => r.verified).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0) / Math.max(1, results.length);

    return NextResponse.json({
      success: true,
      results,
      report,
      summary: {
        total: results.length,
        verified: verifiedCount,
        averageConfidence: avgConfidence.toFixed(1),
        allTrusted: verifiedCount === results.length,
      },
    });
  } catch (error: any) {
    console.error('Reference verification error:', error);
    return NextResponse.json({
      error: error.message || 'Verification failed',
    }, { status: 500 });
  }
}
