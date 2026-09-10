import type { Metadata } from "next";
import "../globals.css";
import "./(marketing)/landing.css";
import "./(auth)/auth.css";

export const metadata: Metadata = {
  title: "MtandaoLabs — Run Your School Smarter",
  description:
    "A complete multi-tenant school management platform: students, CBC academics, fees with M-Pesa, parent portal, WhatsApp and email communication, and report cards.",
  icons: {
    icon: "/favicon.svg",
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
      </head>
      <body>{children}</body>
    </html>
  );
}
