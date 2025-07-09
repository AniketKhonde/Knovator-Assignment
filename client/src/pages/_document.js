import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/favicon.ico?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico?v=2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico?v=2" />
        
        {/* Meta tags */}
        <meta name="description" content="Knovator Job Importer - Automated job import system with real-time monitoring" />
        <meta name="keywords" content="job importer, xml feeds, queue processing, real-time monitoring" />
        <meta name="author" content="Knovator Team" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Knovator Job Importer" />
        <meta property="og:description" content="Automated job import system with real-time monitoring" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Knovator Job Importer" />
        <meta name="twitter:description" content="Automated job import system with real-time monitoring" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 