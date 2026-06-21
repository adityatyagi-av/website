import allBlogs from "@/lib/blogData";

export default function sitemap() {
  const baseUrl = "https://ecosync.co.in";

  const referencePages = [
    "reference/introduction",
    "reference/ecosystem-architecture",
    "reference/startup-profile",
    "reference/applications",
    "reference/networking",
    "reference/mentorship-marketplace",
    "reference/session-scheduling",
    "reference/startup-discovery",
    "reference/investment-opportunities",
    "reference/startup-applications",
    "reference/evaluation-panel",
    "reference/program-management",
    "reference/funding-tracking",
    "reference/talent-marketplace",
    "reference/project-collaboration",
  ];

  const staticPages = [
    "",
    "about",
    "contact",
    "reference",
    "products/ecosync",
    "blog",
  ];

  const blogPages = Array.isArray(allBlogs)
    ? allBlogs.map((blog) => `blogs/${blog.slug}`)
    : [];

  const allUrls = [...staticPages, ...referencePages, ...blogPages];

  return allUrls.map((url) => ({
    url: `${baseUrl}/${url}`,
    lastModified: new Date(),
  }));
}
