import BlogPost from "@/component/Blog/BlogPost";
import allBlogs from "@/lib/blogData";
import { generateSEO } from "@/lib/seo";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return allBlogs.map((blog) => ({
    slug: blog.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } =await params;
  const blog = allBlogs.find((b) => b.slug === slug);

  if (!blog) {
    return { title: "Blog Not Found" };
  }

  const combinedKeywords = [...(blog.tags || [])];

  return generateSEO({
    title: blog.title,
    description: blog.description,
    keywords: combinedKeywords,
    path: `/blogs/${slug}`,
    image: blog.heroImage,
  });
}

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const blog = allBlogs.find((b) => b.slug === slug);

  if (!blog) {
    notFound();
  }

  return (
    <>
      <BlogPost blog={blog} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.title,
            description: blog.description,
            image: blog.heroImage,
            author: {
              "@type": "Organization",
              name: "",
            },
            publisher: {
              "@type": "Organization",
              name: "EcoSync Powered by OPERNOVA TECHNOLOGIES LLP",
              logo: {
                "@type": "ImageObject",
                url: "https://ecosync.co.in/logo.png",
              },
            },
            datePublished: (blog as any).datePublished,
            dateModified: (blog as any).dateModified || (blog as any).datePublished,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://ecosync.co.in/blogs/${slug}`,
            },
          }),
        }}
      />
    </>
  );
}
