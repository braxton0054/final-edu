import type { Metadata, Viewport } from "next";
import "../globals.css";
import "./(marketing)/landing.css";
import "./(auth)/auth.css";

export const viewport: Viewport = {
  themeColor: "#101418",
};

export const metadata: Metadata = {
  title: "MtandaoLabs — Run Your School Smarter",
  description:
    "A complete multi-tenant school management platform: students, CBC academics, fees with M-Pesa, parent portal, WhatsApp and email communication, and report cards.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MtandaoLabs",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme before paint to avoid a light/dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('mtanda-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`,
          }}
        />
        {/* Service worker: production only, never on localhost. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if('serviceWorker' in navigator&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
