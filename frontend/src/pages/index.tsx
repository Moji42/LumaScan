// src/pages/index.tsx
import type { NextPage } from "next";
import Head from "next/head";
import ResumeDropzone from "../components/ResumeDropzone";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Head>
        <title>Lumascan</title>
        <meta name="description" content="Lumascan Application" />
      </Head>

      <main className="w-full max-w-3xl text-center">
        <h1 className="text-6xl font-bold text-indigo-600 mb-4">Lumascan</h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload your resume and let Lumascan analyze your skills instantly.
        </p>

        {/* Drag & Drop Resume Upload */}
        <ResumeDropzone />
      </main>

      <footer className="mt-8 text-gray-500">
        <p>© {new Date().getFullYear()} Lumascan. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;


