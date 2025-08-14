import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

interface SavedResume {
  id: string;
  created_at: string;
  resume_text: string;
  skills: string[];
  job_title?: string;
}

export default function ProfileDashboard({ onResumeSelect }: { onResumeSelect: (resume: SavedResume) => void }) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSavedResumes();
    }
  }, [user]);

  const fetchSavedResumes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedResumes(data || []);
    } catch (err) {
      setError('Failed to fetch saved resumes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('resumes').delete().eq('id', id);
      if (error) throw error;
      fetchSavedResumes();
    } catch (err) {
      setError('Failed to delete resume');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your resumes...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Saved Resumes</h2>
        <button 
          onClick={fetchSavedResumes}
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          Refresh
        </button>
      </div>
      
      {savedResumes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          You haven't saved any resumes yet.
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {savedResumes.map((resume) => (
            <div key={resume.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {resume.job_title || 'Untitled Resume'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onResumeSelect(resume)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => deleteResume(resume.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="mt-3">
                <h4 className="text-sm font-medium mb-1">Skills:</h4>
                <div className="flex flex-wrap gap-1">
                  {resume.skills.slice(0, 10).map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                  {resume.skills.length > 10 && (
                    <span className="text-gray-500 text-xs">
                      +{resume.skills.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}