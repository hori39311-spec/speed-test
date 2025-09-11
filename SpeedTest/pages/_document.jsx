// pages/_document.jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Ide kell a Google AdSense meta tag */}
        <meta name="google-adsense-account" content="ca-pub-1778433750705975" />
        <link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/stopwatch-favicon-32.png">
<link rel="apple-touch-icon" href="/stopwatch-favicon-180.png">

      </Head>
      <body>
        <Main /> {/* Itt jelenik meg a SpeedTestApp tartalma */}
        <NextScript /> {/* Next.js scriptjei */}
      </body>
    </Html>
  );
}
