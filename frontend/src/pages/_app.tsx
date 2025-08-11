// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css'; // Only if you have global styles

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />; // Just renders the page as-is
}

export default MyApp;