import ReferenceSection from "./ReferenceSection";
import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { referenceCategories, referencePages } from "@/lib/reference/data";

function getRelatedPages(currentSlug: string) {
  const category = referenceCategories.find((c) => c.pages.includes(currentSlug));
  if (!category) return [];

  const currentIndex = category.pages.indexOf(currentSlug);
  const related: { slug: string; title: string }[] = [];

  if (currentIndex + 1 < category.pages.length) {
    const nextSlug = category.pages[currentIndex + 1];
    const nextPage = referencePages.find((p) => p.slug === nextSlug);
    if (nextPage) related.push({ slug: nextSlug, title: nextPage.title });
  }
  if (currentIndex - 1 >= 0) {
    const prevSlug = category.pages[currentIndex - 1];
    const prevPage = referencePages.find((p) => p.slug === prevSlug);
    if (prevPage) related.push({ slug: prevSlug, title: prevPage.title });
  }

  return related;
}

const categoryAccent: Record<string, string> = {
  "Portal Overview": "#076EFF",
  "Incubation Portal": "#0D9488",
  "Startup Portal": "#E85D04",
  "Mentor Portal": "#7C3AED",
  "EcoSync Platform": "#076EFF",
};

export default function ReferenceContent({ page }: { page: any }) {
  const accent = categoryAccent[page.category] || "#076EFF";
  const related = getRelatedPages(page.slug);

  return (
    <article className="mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8 lg:py-12 max-w-[860px]">
      <div className="mb-2">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: accent }}
        >
          {page.category}
        </span>
      </div>

      <h1 className="text-[28px] sm:text-[34px] lg:text-[40px] font-extrabold text-gray-900 mb-4 leading-[1.15] tracking-tight">
        {page.title}
      </h1>

      <p className="text-[15px] sm:text-[16px] text-gray-600 leading-[1.7] mb-8">
        {page.description}
      </p>

      {page.learn && page.learn.length > 0 && (
        <div
          className="rounded-xl p-5 sm:p-6 mb-10 border"
          style={{
            backgroundColor: `${accent}08`,
            borderColor: `${accent}20`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} style={{ color: accent }} />
            <h3 className="font-semibold text-gray-900 text-[13px] uppercase tracking-wide">
              What you will learn
            </h3>
          </div>
          <ul className="space-y-2 pl-1">
            {page.learn.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <span className="text-gray-700 text-[14px] leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-0">
        {page.sections.map((section: any, i: number) => (
          <ReferenceSection key={i} section={section} accent={accent} />
        ))}
      </div>

      {related.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-4">
            Continue Reading
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/reference/${r.slug}`}
                className="group flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {r.title}
                </span>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
