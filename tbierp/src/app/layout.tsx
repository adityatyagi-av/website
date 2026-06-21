import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/component/home/Navbar";
import Footer from "@/component/footer/Fotter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://ecosync.co.in"),

  title: {
    default: "EcoSync — The Unified Startup Ecosystem Platform",
    template: "%s | EcoSync — The Unified Startup Ecosystem Platform",
  },

  description:
    "EcoSync connects founders, mentors, investors, freelancers, and incubators in one platform. Discover opportunities, collaborate, and accelerate startup growth with role-based portals.",

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ecosync.co.in",
    siteName: "EcoSync",
    images: [
      {
        url: "/blackicon.png",
        width: 1200,
        height: 630,
        alt: "EcoSync — The Unified Startup Ecosystem Platform",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    creator: "@opernova",
    images: ["/blackicon.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EcoSync — The Unified Startup Ecosystem Platform",
    url: "https://ecosync.co.in",
    logo: "https://ecosync.co.in/logo.png",
    sameAs: ["https://www.linkedin.com/company/opernova"],
  };
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="absolute z-50 w-full fixed ">
          <Navbar />
        </div>
        {children}
        <Footer />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </body>
    </html>
  );
}
