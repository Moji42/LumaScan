import { useState } from 'react';
import Head from 'next/head';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ResumeDropzone from '../components/ResumeDropzone';
import Auth from '../components/Auth';
import ProfileDashboard from '../components/ProfileDashboard';

export default function Home() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [selectedResume, setSelectedResume] = useState<any>(null);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.log('Error: ', error);
    setSelectedResume(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>Lumascan - Resume Skills Analyzer</title>
        <meta name="description" content="Upload your resume and get instant skills analysis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Lumascan</h1>
          </div>
          <div className="flex gap-2">
            {session ? (
              <button
                onClick={handleLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {showAuth && !session ? (
          <Auth onClose={() => setShowAuth(false)} />
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {session ? 'Welcome Back!' : 'Analyze Your Resume Skills'}
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {session
                  ? 'Manage your saved resumes or analyze a new one.'
                  : 'Upload your resume to analyze your skills. Sign up to save your resumes.'}
              </p>
              {!session && (
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md"
                >
                  Sign Up to Save Resumes
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`${session ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <ResumeDropzone initialResume={selectedResume} />
              </div>
              
              {session && (
                <div className="lg:col-span-1">
                  <ProfileDashboard 
                    onResumeSelect={(resume) => {
                      setSelectedResume(resume);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Lumascan. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}