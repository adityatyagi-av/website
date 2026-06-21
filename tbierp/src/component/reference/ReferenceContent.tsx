import ReferenceSection from "./ReferenceSection";
import { BookOpen } from "lucide-react";

export default function ReferenceContent({ page }: { page: any }) {
  return (
    <article className=" mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
      <div className="mb-2">
        <span className="text-xs font-semibold text-[#076EFF] uppercase tracking-widest">
          {page.category}
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
        {page.title}
      </h1>

      <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-8">
        {page.description}
      </p>

      {page.learn && page.learn.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-10">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-[#076EFF]" />
            <h3 className="font-semibold text-gray-900 text-sm">
              You will learn
            </h3>
          </div>
          <ul className="space-y-1.5 pl-1">
            {page.learn.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#076EFF] font-bold text-sm mt-0.5">
                  •
                </span>
                <span className="text-gray-700 text-sm leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        {page.sections.map((section, i) => (
          <ReferenceSection key={i} section={section} />
        ))}
      </div>
    </article>
  );
}
