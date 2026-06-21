"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Reference", href: "/reference" },
  { label: "Blog", href: "/blog" },
  { label: "Contact us", href: "/contact" },
];

export default function ReferenceNavbar({ onMenuToggle }: { onMenuToggle: () => void }){
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-4 xl:px-8">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
            onClick={onMenuToggle}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <Link href="/" className="flex-shrink-0">
            <div className="relative w-[140px] h-[22px]">
              <Image
                src="/openveraIcon.png"
                alt="OpenVera"
                fill
                className="object-contain object-left"
              />
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-gray-700 hover:text-[#076EFF] transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center">
          <button className="px-5 py-2 text-sm font-bold text-white bg-[#076EFF] hover:bg-[#0558cc] rounded-lg transition-colors duration-150">
            Sign up
          </button>
        </div>

        <button
          className="md:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
          onClick={() => setMobileNavOpen((p) => !p)}
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 pb-4">
          <nav className="flex flex-col gap-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="text-sm font-semibold text-gray-700 hover:text-[#076EFF] transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
