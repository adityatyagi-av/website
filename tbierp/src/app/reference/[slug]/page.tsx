import { notFound } from "next/navigation";
import { getPageBySlug, referencePages } from "@/lib/reference/data";
import ReferenceLayout from "@/component/reference/ReferenceLayout";
import ReferenceContent from "@/component/reference/ReferenceContent";
import { allReferencePages, ecosyncReferenceKeywords } from "@/lib/keyword";
import { generateSEO } from "@/lib/seo";

export async function generateStaticParams() {
  return referencePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const page = allReferencePages.find((p) => p.slug === slug);

  if (!page) {
    return { title: "Page Not Found — EcoSync" };
  }

  const combinedKeywords = [
    ...(page.keywords || []),
    ...ecosyncReferenceKeywords,
  ];

  return generateSEO({
    title: page.title,
    description: page.description,
    keywords: combinedKeywords,
    path: `/reference/${slug}`,
    image: page.image,
  });
}

export default async function ReferenceSlugPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const page = getPageBySlug(slug);

  if (!page) notFound();

  return (
    <>
      <ReferenceLayout>
        <ReferenceContent page={page} />
      </ReferenceLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: page.title,
            description: page.description,
            image: (page as any).image,
            author: {
              "@type": "Organization",
              name: "EcoSync by Opernova Technologies",
            },
            publisher: {
              "@type": "Organization",
              name: "EcoSync — OPERNOVA TECHNOLOGIES LLP",
              logo: {
                "@type": "ImageObject",
                url: "https://ecosync.co.in/logo.png",
              },
            },
            datePublished: (page as any).datePublished,
            dateModified: (page as any).dateModified || (page as any).datePublished,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://ecosync.co.in/reference/${slug}`,
            },
            about: {
              "@type": "SoftwareApplication",
              name: "EcoSync",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
            },
          }),
        }}
      />
    </>
  );
}
