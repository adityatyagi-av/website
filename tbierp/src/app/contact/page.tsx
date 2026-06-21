import ContactPage from "@/component/home/contact/Contact";
import ScrollFadeUp from "@/component/home/ScrollFadeUp";
import { ecosyncContactKeywords } from "@/lib/keyword";
import { generateSEO } from "@/lib/seo";
import React from "react";

export const metadata = generateSEO({
  title: "Contact EcoSync — Get in Touch With Our Team",
  description:
    "Have questions about EcoSync? Reach out to our team for platform support, partnership inquiries, demo requests, or onboarding assistance.",
  keywords: ecosyncContactKeywords,
  path: "/contact",
  image: "/blackicon.png",
});

const page = () => {
  return (
    <div>
      <ScrollFadeUp>
        <ContactPage />
      </ScrollFadeUp>
    </div>
  );
};

export default page;
