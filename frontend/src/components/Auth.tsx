// src/components/Auth.tsx
import { useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export default function Auth() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleLogin = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
      });
      if (error) throw error;
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {!session ? (
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => handleLogin(email)}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {loading ? 'Loading...' : 'Sign In with GitHub'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => supabase.auth.signOut()}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
        >
          Sign Out
        </button>
      )}
    </div>
  );
}