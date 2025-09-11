// pages/index.jsx
import Head from "next/head";
import Script from "next/script";
import SpeedTestApp from "../SpeedTestApp";

export default function Home() {
  return (
    <>
      {/* SEO / Open Graph / Twitter */}
      <Head>
        <title>
          Internet Speed Test — Fast Download, Upload, Ping &amp; Jitter | NetworkSpeed
        </title>

        <meta
          name="description"
          content="Run a fast, accurate internet speed test in your browser. Measure download, upload, ping and jitter. No login, no tracking."
        />
        <link rel="canonical" href="https://www.networkspeed.online/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Internet Speed Test — Fast Download, Upload, Ping & Jitter"
        />
        <meta
          property="og:description"
          content="Run a fast, accurate internet speed test in your browser. Measure download, upload, ping and jitter."
        />
        <meta property="og:url" content="https://www.networkspeed.online/" />
        {/* Ha lesz social preview kép, tedd a public mappába pl. /og-image.png */}
        {/* <meta property="og:image" content="https://www.networkspeed.online/og-image.png" /> */}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Internet Speed Test — Fast Download, Upload, Ping & Jitter"
        />
        <meta
          name="twitter:description"
          content="Run a fast, accurate internet speed test in your browser. Measure download, upload, ping and jitter."
        />
        {/* <meta name="twitter:image" content="https://www.networkspeed.online/og-image.png" /> */}

        {/* Extra ajánlott meta */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="theme-color" content="#000000" />
      </Head>

      {/* JSON-LD struktúrált adatok */}
      <Script id="ld-json-website" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "NetworkSpeed",
          url: "https://www.networkspeed.online/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.networkspeed.online/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        })}
      </Script>

      <Script id="ld-json-webpage" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Internet Speed Test",
          url: "https://www.networkspeed.online/",
          description:
            "Run a fast, accurate internet speed test in your browser. Measure download, upload, ping and jitter. No login, no tracking.",
          isPartOf: { "@type": "WebSite", url: "https://www.networkspeed.online/" },
          inLanguage: "en",
        })}
      </Script>

      {/* A tényleges alkalmazás */}
      <SpeedTestApp />
    </>
  );
}
