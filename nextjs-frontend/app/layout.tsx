import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Jarvis",
    description: "Search, browse, and ask questions over your ingested documents.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // The theme script below writes `class="dark"` onto this element before React
        // hydrates, so the server's markup and the client's disagree by design.
        <html
            lang="en"
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <head>
                {/* Runs before first paint, so a dark-theme user never sees a white flash.
                    It is inline and dependency-free for that reason — anything imported
                    would arrive too late. The key matches THEME_KEY in lib/theme.ts. */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var p=localStorage.getItem('jarvis.theme');var d=p==='dark'||((!p||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
                    }}
                />
            </head>
            <body className="min-h-full bg-white text-stone-950">
                <Providers>
                    <Nav />
                    {children}
                </Providers>
            </body>
        </html>
    );
}
