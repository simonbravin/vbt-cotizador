import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import type { Locale } from "@/lib/i18n/translations";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/translations";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VBT Platform",
  description:
    "Vision Building Technologies – Partner platform for distributors: quotes, clients, and sales.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const initialLocale: Locale | null =
    localeCookie === "es" || localeCookie === "en" ? localeCookie : null;
  const lang = initialLocale ?? "en";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${plexSans.variable} ${plexMono.variable} ${plexSans.className}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=document.cookie.match(/NEXT_THEME=([^;]+)/);if(!m||m[1]!=='light')document.documentElement.classList.add('dark');})();`,
          }}
        />
        <Providers initialLocale={initialLocale}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
