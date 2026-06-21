const siteConfig = {
  name: "Ecosync By Opernova ",
  url: "https://ecosync.co.in",
  description:
    "EcoSync connects startups, mentors, investors, freelancers, and incubators in a unified platform designed to accelerate innovation, collaboration, and growth",
  creator: "OPERNOVA TECHNOLOGIES LLP",
  ogImage: "/blackicon.png",
};

export function generateSEO({
  title,
  description,
  keywords = [],
  path = "",
  image,
  noIndex = false,
}) {
  const url = `${siteConfig.url}${path}`;
  const ogImage = image || siteConfig.ogImage;

  return {
    metadataBase: new URL(siteConfig.url),

    title: `${title} | ${siteConfig.name}`,

    description,

    applicationName: siteConfig.name,

    authors: [{ name: siteConfig.creator }],

    creator: siteConfig.creator,

    publisher: siteConfig.name,

    keywords,

    alternates: {
      canonical: url,
    },

    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: "@opernova",
    },

    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },

    category: "technology",
  };
}
