// pages/_document.jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Google AdSense meta tag */}
        <meta name="google-adsense-account" content="ca-pub-1778433750705975" />
        
        {/* Faviconok – MIND önzáró tag */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/networkspeed-logo-favicon-32.png" />
        <link rel="apple-touch-icon" href="/networkspeed-logo-favicon-180.png" />
      </Head>
      <body>
        <Main /> {/* Itt jelenik meg a SpeedTestApp tartalma */}
        <NextScript /> {/* Next.js scriptjei */}
      </body>
    </Html>
  );
}
