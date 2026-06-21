import { redirect } from "next/navigation";
import { getDefaultSlug } from "@/lib/reference/data";
import { generateSEO } from "@/lib/seo";
import { ecosyncReferenceKeywords } from "@/lib/keyword";

export const metadata = generateSEO({
  title: "EcoSync Portal Documentation — Platform Reference Guide",
  description:
    "Explore EcoSync's complete documentation. Learn about role-based portals, ecosystem architecture, networking, mentorship, investment tools, and more.",
  keywords: ecosyncReferenceKeywords,
  path: "/reference",
  image: "/blackicon.png",
});

export default function ReferencePage() {
  redirect(`/reference/${getDefaultSlug()}`);
}
