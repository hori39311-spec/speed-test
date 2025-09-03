// pages/_document.jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Ide kell a Google AdSense meta tag */}
        <meta name="google-adsense-account" content="ca-pub-1778433750705975" />
      </Head>
      <body>
        <Main /> {/* Itt jelenik meg a SpeedTestApp tartalma */}
        <NextScript /> {/* Next.js scriptjei */}
      </body>
    </Html>
  );
}
