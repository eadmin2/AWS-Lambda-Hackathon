import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface TokenBalance {
  tokensAvailable: number;
  tokensUsed: number;
  connectionState: 'connecting' | 'open' | 'closed' | 'error';
}

export function useTokenBalance(userId: string | null): TokenBalance {
  const [tokensAvailable, setTokensAvailable] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    let retryCount = 0;
    let channel: any = null;
    let retryTimeout: any = null;

    const subscribe = () => {
      setConnectionState('connecting');
      channel = supabase
        .channel(`user-tokens-balance-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_tokens',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!mounted) return;
            setTokensAvailable((payload.new as any)?.tokens_available ?? 0);
            setTokensUsed((payload.new as any)?.tokens_used ?? 0);
          }
        )
        .subscribe((status: any) => {
          if (!mounted) return;
          if (status === 'SUBSCRIBED') {
            setConnectionState('open');
            retryCount = 0;
          } else if (status === 'CLOSED') {
            setConnectionState('closed');
            if (retryCount < 3) {
              retryCount++;
              retryTimeout = setTimeout(subscribe, 1000 * retryCount);
            } else {
              setConnectionState('error');
            }
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionState('error');
          }
        });
    };

    subscribe();

    // Fetch initial balance
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
      if (channel) supabase.removeChannel(channel);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [userId]);

  return { tokensAvailable, tokensUsed, connectionState };
} 