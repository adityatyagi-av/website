"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import { referenceCategories, referencePages } from "@/lib/reference/data";
import { cn } from "@/lib/utils";

function getPageTitle(slug) {
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
    <nav className="py-5 px-3">
      {referenceCategories.map((cat) => {
        const isOpen = openCategories[cat.label] ?? false;
        const hasActive = cat.pages.includes(currentSlug);

        return (
          <div key={cat.label} className="mb-0.5">
            <button
              onClick={() => toggleCategory(cat.label)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 group",
                hasActive
                  ? "text-[#076EFF]"
                  : "text-gray-700 hover:text-[#076EFF] hover:bg-blue-50/70"
              )}
            >
              <span className="text-left leading-snug">{cat.label}</span>
              <ChevronRight
                size={13}
                className={cn(
                  "transition-transform duration-200 flex-shrink-0 ml-1",
                  isOpen ? "rotate-90" : "rotate-0",
                  hasActive ? "text-[#076EFF]" : "text-gray-400 group-hover:text-[#076EFF]"
                )}
              />
            </button>

            {isOpen && (
              <ul className="mt-0.5 ml-3 border-l-2 border-gray-100 pl-3 pb-1 space-y-0.5">
                {cat.pages.map((slug) => {
                  const isActive = slug === currentSlug;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/reference/${slug}`}
                        onClick={onClose}
                        className={cn(
                          "block px-3 py-1.5 rounded-md text-[13px] leading-snug transition-all duration-150",
                          isActive
                            ? "bg-blue-50 text-[#076EFF] font-semibold border-l-2 border-[#076EFF] -ml-[2px] pl-[10px]"
                            : "text-gray-500 hover:text-[#076EFF] hover:bg-blue-50/60 font-medium"
                        )}
                      >
                        {getPageTitle(slug)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
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
      <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 border-r border-gray-200 bg-white lg:pt-6">
        <div className="sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
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
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-white overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 flex-shrink-0">
              <span className="font-bold text-gray-900 text-sm tracking-wide uppercase">
                Reference
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
