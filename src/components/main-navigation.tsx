'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@/lib/types';
import { UserNavigation } from './user-navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function MainNavigation() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUser(profile);
        }
      }
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        getUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  if (!user) {
    return null; // Don't show navigation if user is not logged in
  }

  // Show user navigation for all users
  return <UserNavigation />;
}
