import BlogSection from "@/component/Blog/BlogSection";
import { ecosyncBlogKeywords } from "@/lib/keyword";
import { generateSEO } from "@/lib/seo";

import React from "react";

export const metadata = generateSEO({
  title: "EcoSync Blog — Startup Insights, Updates & Ecosystem Trends",
  description:
    "Read the latest articles on startup ecosystems, founder stories, mentorship tips, investment strategies, and EcoSync platform updates.",
  keywords: ecosyncBlogKeywords,
  path: "/blog",
  image: "/blackicon.png",
});

const page = () => {
  return (
    <div className="px-2">
      <div className="flex justify-center items-center mb-10 sm:mb-14 px-4 sm:px-6 md:px-0">
        <div className="w-full max-w-200 space-y-3 sm:space-y-5 pt-28">
          <h2 className="text-[#666666] text-sm sm:text-[16px] text-center">
            OUR BLOGS
          </h2>
          <h1 className="text-[#076EFF] text-2xl sm:text-4xl md:text-[48px] font-semibold text-center leading-tight">
            Find our all blogs from here
          </h1>
          <p className="text-[#666666] text-sm sm:text-[16px] text-center">
            Stay updated with insightful articles on technology, software
            development, and digital transformation-designed to inform, educate,
            and inspire.
          </p>
        </div>
      </div>

      <BlogSection blogpage={true} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "EcoSync",
            url: "https://ecosync.co.in",
            description:
              "Stay updated with EcoSync blogs on technology, software development, digital transformation, startup platforms, and innovation ecosystems.",
            publisher: {
              "@type": "Organization",
              name: "EcoSync",
              logo: {
                "@type": "ImageObject",
                url: "https://ecosync.co.in/logo.png",
              },
            },
          }),
        }}
      />
    </div>
  );
};

export default page;
