import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface DocumentStatus {
  status: string | null;
  error: string | null;
  processedAt: string | null;
}

export function useDocumentStatus(documentId: string | null): DocumentStatus {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processedAt, setProcessedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    // Subscribe to realtime changes
    const channel = supabase
      .channel('documents-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          setStatus((payload.new as any)?.processing_status ?? null);
          setError((payload.new as any)?.error_message ?? null);
          setProcessedAt((payload.new as any)?.processed_at ?? null);
        }
      )
      .subscribe();

    // Fetch initial status
    supabase
      .from('documents')
      .select('processing_status, error_message, processed_at')
      .eq('id', documentId)
      .single()
      .then(({ data }) => {
        setStatus((data as any)?.processing_status ?? null);
        setError((data as any)?.error_message ?? null);
        setProcessedAt((data as any)?.processed_at ?? null);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  return { status, error, processedAt };
} 