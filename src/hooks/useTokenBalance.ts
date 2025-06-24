import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface TokenBalance {
  tokensAvailable: number;
  tokensUsed: number;
}

export function useTokenBalance(userId: string | null): TokenBalance {
  const [tokensAvailable, setTokensAvailable] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to realtime changes
    const channel = supabase
      .channel('user-tokens-balance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tokens',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setTokensAvailable((payload.new as any)?.tokens_available ?? 0);
          setTokensUsed((payload.new as any)?.tokens_used ?? 0);
        }
      )
      .subscribe();

    // Fetch initial balance
    supabase
      .from('user_tokens')
      .select('tokens_available, tokens_used')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        setTokensAvailable((data as any)?.tokens_available ?? 0);
        setTokensUsed((data as any)?.tokens_used ?? 0);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { tokensAvailable, tokensUsed };
} 