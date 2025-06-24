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
    let mounted = true;
    // Fetch initial balance (one-time, no realtime)
    supabase
      .from('user_tokens')
      .select('tokens_available, tokens_used')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (!mounted) return;
        setTokensAvailable((data as any)?.tokens_available ?? 0);
        setTokensUsed((data as any)?.tokens_used ?? 0);
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  return { tokensAvailable, tokensUsed };
} 