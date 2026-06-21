"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  X,
  Layers,
  Building2,
  Rocket,
  GraduationCap,
  Globe,
} from "lucide-react";
import { referenceCategories, referencePages } from "@/lib/reference/data";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, any> = {
  "Portal Overview": Layers,
  "Incubation Portal": Building2,
  "Startup Portal": Rocket,
  "Mentor Portal": GraduationCap,
  "EcoSync Platform": Globe,
};

const categoryColors: Record<string, { active: string; bg: string; border: string }> = {
  "Portal Overview": { active: "text-[#076EFF]", bg: "bg-blue-50", border: "border-[#076EFF]" },
  "Incubation Portal": { active: "text-[#0D9488]", bg: "bg-teal-50", border: "border-[#0D9488]" },
  "Startup Portal": { active: "text-[#E85D04]", bg: "bg-orange-50", border: "border-[#E85D04]" },
  "Mentor Portal": { active: "text-[#7C3AED]", bg: "bg-violet-50", border: "border-[#7C3AED]" },
  "EcoSync Platform": { active: "text-[#076EFF]", bg: "bg-blue-50", border: "border-[#076EFF]" },
};

function getPageTitle(slug: string) {
  const page = referencePages.find((p) => p.slug === slug);
  return page?.title || slug;
}

function SidebarNav({
  currentSlug,
  openCategories,
  toggleCategory,
  onClose,
}: {
  currentSlug: string | undefined;
  openCategories: Record<string, boolean>;
  toggleCategory: (label: string) => void;
  onClose: () => void;
}) {
  return (
    <nav className="py-4 px-3">
      <div className="px-3 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Documentation
        </span>
      </div>
      {referenceCategories.map((cat) => {
        const isOpen = openCategories[cat.label] ?? false;
        const hasActive = cat.pages.includes(currentSlug || "");
        const Icon = categoryIcons[cat.label] || Layers;
        const colors = categoryColors[cat.label] || categoryColors["Portal Overview"];

        return (
          <div key={cat.label} className="mb-1">
            <button
              onClick={() => toggleCategory(cat.label)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 group",
                hasActive
                  ? `${colors.active} ${colors.bg}`
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "flex-shrink-0 transition-colors duration-200",
                  hasActive ? colors.active : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              <span className="text-left leading-snug flex-1">{cat.label}</span>
              <ChevronRight
                size={12}
                className={cn(
                  "transition-transform duration-200 flex-shrink-0",
                  isOpen ? "rotate-90" : "rotate-0",
                  hasActive ? colors.active : "text-gray-400"
                )}
              />
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <ul className="mt-1 ml-[22px] border-l border-gray-200 pl-3 pb-1.5 space-y-0.5">
                {cat.pages.map((slug) => {
                  const isActive = slug === currentSlug;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/reference/${slug}`}
                        onClick={onClose}
                        className={cn(
                          "block px-3 py-[7px] rounded-md text-[12.5px] leading-snug transition-all duration-150",
                          isActive
                            ? `${colors.bg} ${colors.active} font-semibold border-l-2 ${colors.border} -ml-[14px] pl-[22px]`
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium"
                        )}
                      >
                        {getPageTitle(slug)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default function ReferenceSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop();

  const initialOpen = referenceCategories.reduce<Record<string, boolean>>((acc, cat) => {
    acc[cat.label] = cat.pages.includes(currentSlug || "");
    return acc;
  }, {});

  const [openCategories, setOpenCategories] = useState(initialOpen);

  function toggleCategory(label: string) {
    setOpenCategories((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <>
      <aside className="hidden lg:block w-[270px] xl:w-[290px] flex-shrink-0 border-r border-gray-100 bg-[#FAFBFC]">
        <div className="sticky top-16 h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin">
          <SidebarNav
            currentSlug={currentSlug}
            openCategories={openCategories}
            toggleCategory={toggleCategory}
            onClose={onClose}
          />
        </div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <aside className="relative z-10 w-[290px] max-w-[85vw] h-full bg-[#FAFBFC] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
              <span className="font-bold text-gray-900 text-sm tracking-wide">
                Documentation
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav
                currentSlug={currentSlug}
                openCategories={openCategories}
                toggleCategory={toggleCategory}
                onClose={onClose}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
