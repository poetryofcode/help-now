import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RatingStats {
  average: number;
  count: number;
  loading: boolean;
}

export function useAverageRating(userId: string | undefined): RatingStats {
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRating = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select('rating')
          .eq('to_user_id', userId)
          .not('rating', 'is', null);

        if (error) throw error;

        if (data && data.length > 0) {
          const ratings = (data as { rating: number | null }[])
            .map((f) => f.rating)
            .filter((r): r is number => r !== null);
          
          const avg = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
            : 0;
          
          setAverage(Math.round(avg * 10) / 10);
          setCount(ratings.length);
        } else {
          setAverage(0);
          setCount(0);
        }
      } catch (err) {
        console.error('Failed to fetch rating:', err);
        setAverage(0);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [userId]);

  return { average, count, loading };
}
