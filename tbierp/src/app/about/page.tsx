import BlogSection from "@/component/Blog/BlogSection";
import AboutUs from "@/component/home/about/AboutUs";
import TeamSection from "@/component/home/about/TeamSection";
import ImageCarousel from "@/component/home/Carousel";
import CtaSection from "@/component/home/Cta";
import OnePlatform from "@/component/home/OnePlatform";
import ScrollFadeUp from "@/component/home/ScrollFadeUp";
import { ecosyncAboutKeywords } from "@/lib/keyword";
import { generateSEO } from "@/lib/seo";
import React from "react";


export const metadata = generateSEO({
  title: "About EcoSync — Our Mission to Power Startup Ecosystems",
  description:
    "Built by Opernova Technologies, EcoSync is the unified platform empowering startups, mentors, investors, and incubators to collaborate, innovate, and scale together.",
  keywords: ecosyncAboutKeywords,
  path: "/about",
  image: "/blackicon.png",
});

const page = () => {
  return (
    <div className="">
      <ScrollFadeUp>
        <AboutUs />
      </ScrollFadeUp>
      <ScrollFadeUp>
        <OnePlatform />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <ImageCarousel />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <TeamSection />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <BlogSection />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <CtaSection />
      </ScrollFadeUp>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "EcoSync",
            url: "https://ecosync.co.in",
            logo: "https://ecosync.co.in/logo.png",
            description:
              "Built by Opernova Technologies, EcoSync is the unified platform empowering startups, mentors, investors, and incubators to collaborate, innovate, and scale together.",
            sameAs: ["https://www.linkedin.com/company/opernova"],
          }),
        }}
      />
    </div>
  );
};

export default page;
