'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TeamResearchRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const researchId = params.idr as string;

  useEffect(() => {
    if (researchId) {
      router.replace(`/session/${researchId}`);
    }
  }, [researchId, router]);

  return null;
}
