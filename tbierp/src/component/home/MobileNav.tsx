"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

const portals = [
  { name: "Startup Portal", image: "/home/dum.svg", href: "/reference/startup-profile" },
  { name: "Freelance Portal", image: "/home/dum3.svg", href: "/reference/talent-marketplace" },
  { name: "Mentor Portal", image: "/home/dum4.svg", href: "/reference/mentorship-marketplace" },
  { name: "Incubator Portal", image: "/home/dum5.svg", href: "/reference/startup-applications" },
  { name: "Investor Portal", image: "/home/dum.svg", href: "/reference/startup-discovery" },
];

const MobileNavContent = () => {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <nav className="flex flex-col py-4 space-y-1">
      <Link href="/" className="px-4 py-3 rounded-xl text-[15px] font-medium text-[#2B2B2B] hover:bg-[#F5F7FF] hover:text-[#076EFF] transition-colors">
        Home
      </Link>
      <Link href="/about" className="px-4 py-3 rounded-xl text-[15px] font-medium text-[#2B2B2B] hover:bg-[#F5F7FF] hover:text-[#076EFF] transition-colors">
        About
      </Link>

      {/* Portals Accordion */}
      <div>
        <button
          onClick={() => setPortalOpen(!portalOpen)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium text-[#2B2B2B] hover:bg-[#F5F7FF] transition-colors"
        >
          Portals
          {portalOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {portalOpen && (
          <div className="ml-2 mt-1 space-y-1">
            {portals.map((portal) => (
              <Link
                key={portal.name}
                href={portal.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[#F5F7FF] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#F0F0F0] overflow-hidden flex-shrink-0 relative">
                  <Image src={portal.image} alt={portal.name} fill className="object-cover" />
                </div>
                <span className="text-[13px] font-semibold text-[#076EFF]">
                  {portal.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link href="/blog" className="px-4 py-3 rounded-xl text-[15px] font-medium text-[#2B2B2B] hover:bg-[#F5F7FF] hover:text-[#076EFF] transition-colors">
        Blog
      </Link>
      <Link href="/contact" className="px-4 py-3 rounded-xl text-[15px] font-medium text-[#2B2B2B] hover:bg-[#F5F7FF] hover:text-[#076EFF] transition-colors">
        Contact us
      </Link>

      <div className="px-4 pt-4">
        <button className="w-full py-3 bg-[#076EFF] text-white rounded-xl text-[15px] font-semibold hover:bg-[#0558d4] transition-colors">
          Sign up
        </button>
      </div>
    </nav>
  );
};

export default MobileNavContent;