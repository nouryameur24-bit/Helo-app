import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export function useProfileStats(userId: string | null, isPartner: boolean) {
  const [contributionCount, setContributionCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [safeCount, setSafeCount] = useState(0);

  useEffect(() => {
    if (!userId || isPartner || !isSupabaseConfigured) return;
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const { count: contributions } = await supabase
          .from('community_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['approved', 'auto_captured', 'community_verified']);
        if (!cancelled && contributions !== null) setContributionCount(contributions);

        const { count: scans } = await supabase
          .from('scan_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (!cancelled && scans !== null) setScanCount(scans);

        const { count: safe } = await supabase
          .from('scan_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('safety_level', 'safe');
        if (!cancelled && safe !== null) setSafeCount(safe);
      } catch {
        // Stats are non-critical — profile still renders without them
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [userId, isPartner]);

  return { contributionCount, scanCount, safeCount };
}
