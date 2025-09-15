// pages/_app.jsx
import '../styles/globals.css';
import Script from 'next/script';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // asPath -> levágjuk a queryt és a hash-t
  const rawPath = router.asPath.split('#')[0].split('?')[0] || '/';

  // Ha nem fájl (nem tartalmaz pontot a legutolsó szegmensben), tegyünk végére "/"
  const lastSeg = rawPath.split('/').pop();
  const isFile = lastSeg && lastSeg.includes('.');
  const normalizedPath =
    isFile ? rawPath : (rawPath === '/' ? '/' : (rawPath.endsWith('/') ? rawPath : `${rawPath}/`));

  // Válassz egy kanonikus domaint és tartsd konzisztensen (itt: nem-www)
  const canonicalUrl = `https://networkspeed.online${normalizedPath}`;

  return (
    <>
      {/* Canonical minden oldalra, a saját útvonalával */}
      <Head>
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      {/* Google Analytics */}
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-SFBDE1TW2H"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-SFBDE1TW2H', { anonymize_ip: true });
        `}
      </Script>

      <Component {...pageProps} />
    </>
  );
}
