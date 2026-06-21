import Link from "next/link";
import Image from "next/image";
import React from "react";

const portals = [
  {
    name: "Startup Portal",
    image: "/home/dum.svg",
    href: "/reference/startup-profile",
  },
  {
    name: "Freelance Portal",
    image: "/home/dum3.svg",
    href: "/reference/talent-marketplace",
  },
  {
    name: "Mentor Portal",
    image: "/home/dum4.svg",
    href: "/reference/mentorship-marketplace",
  },
  {
    name: "Incubator Portal",
    image: "/home/dum5.svg",
    href: "/reference/startup-applications",
  },
  {
    name: "Investor Portal",
    image: "/home/dum.svg",
    href: "/reference/startup-discovery",
  },
];

const NavbarContent = () => {
  return (
    <div className="">
      <ul className="flex lg:space-x-8 space-x-4">
        <Link href="/">
          <li className="text-[#2B2B2B] hover:text-[#0097FEDB] font-medium text-[16px] leading-[1.4] text-center">
            Home
          </li>
        </Link>
        <Link href="/about">
          <li className="text-[#2B2B2B] hover:text-[#0097FEDB]  font-medium text-[16px] leading-[1.4] text-center">
            About
          </li>
        </Link>

        {/* Portals with hover dropdown */}
        <li className="relative group">
          <Link
            href="/reference"
            className="text-[#2B2B2B] hover:text-[#0097FEDB] font-medium text-[16px] leading-[1.4] text-center block"
          >
            Portals
          </Link>

          {/* Dropdown */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] p-5 min-w-[420px] grid grid-cols-2 gap-3">
              {portals.map((portal) => (
                <Link
                  key={portal.name}
                  href={portal.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F5F7FF] transition-colors ${
                    portals.indexOf(portal) === portals.length - 1
                      ? "col-span-2 sm:col-span-1"
                      : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#F0F0F0] overflow-hidden flex-shrink-0 relative">
                    <Image
                      src={portal.image}
                      alt={portal.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="text-[14px] font-semibold text-[#076EFF]">
                    {portal.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </li>

        <Link href="/blog">
          <li className="text-[#2B2B2B] hover:text-[#0097FEDB] font-medium text-[16px] leading-[1.4] text-center">
            Blog
          </li>
        </Link>
        <Link href="/contact">
          <li className="text-[#2B2B2B] hover:text-[#0097FEDB] font-medium text-[16px] leading-[1.4] text-center text-nowrap">
            Contact us
          </li>
        </Link>
      </ul>
    </div>
  );
};

export default NavbarContent;
