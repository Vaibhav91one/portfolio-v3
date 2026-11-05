import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Vaibhav Tomar",
  description: "Design Engineer & Software Developer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning // the boot script below sets data-boot before React runs
    >
      <head>
        {/* reloaded while the page was dark: paint dark from the very first frame instead of flashing paper */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("pv3-dark")==="1")document.documentElement.dataset.boot="dark"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
