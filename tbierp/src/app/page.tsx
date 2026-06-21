import ScrollFadeUp from "@/component/home/ScrollFadeUp";
import OnePlatform from "../component/home/OnePlatform";
import Results from "../component/home/Results";
import HeroSection from "@/component/home/HeroSection";
import UnifiedStartupHub from "@/component/home/UnifiedHub";
import Laptop from "@/component/home/Laptop";
import Possibilty from "@/component/home/Possibility";
import DiscoverPortals from "@/component/home/DiscoverPortals";
import EcoSyncHero from "@/component/home/EcosyncHero";
import PortalSystem from "@/component/home/PortalSystem";
import ImageCarousel from "@/component/home/Carousel";
import CtaSection from "@/component/home/Cta";
import Explore from "@/component/home/Explore";

import { generateSEO } from "@/lib/seo";
import { ecosyncHomeKeywords } from "@/lib/keyword";

export const metadata = generateSEO({
  title: "EcoSync — The Unified Startup Ecosystem Platform",
  description:
    "EcoSync connects founders, mentors, investors, freelancers, and incubators in one platform. Discover opportunities, collaborate, and accelerate startup growth with role-based portals.",
  keywords: ecosyncHomeKeywords,
  path: "/",
  image: "/blackicon.png",
});

export default function Home() {
  return (
    <div className="relative pt-3 lg:pt-5">
      <ScrollFadeUp>
        <HeroSection />
      </ScrollFadeUp>
      <ScrollFadeUp>
        <UnifiedStartupHub />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <Results />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <Possibilty />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <Laptop />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <EcoSyncHero />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <PortalSystem />
      </ScrollFadeUp>

      <Explore />

      <ScrollFadeUp>
        <DiscoverPortals />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <OnePlatform />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <ImageCarousel />
      </ScrollFadeUp>

      <ScrollFadeUp>
        <CtaSection />
      </ScrollFadeUp>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "EcoSync",
            url: "https://ecosync.co.in",
            description:
              "EcoSync connects founders, mentors, investors, freelancers, and incubators in one platform. Discover opportunities, collaborate, and accelerate startup growth with role-based portals.",
          }),
        }}
      />
    </div>
  );
}
