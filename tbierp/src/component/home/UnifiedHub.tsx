"use client";
import React from "react";
import Image from "next/image";

const avatars = [
  {
    src: "/home/person1.png",
    bg: "bg-[#FFE4E1]",
    className:
      "w-[72px] h-[72px] sm:w-[96px] sm:h-[96px] lg:w-[112px] lg:h-[112px] top-[2%] left-[12%] sm:left-[15%]",
  },
  {
    src: "/home/person2.png",
    bg: "bg-[#E8E0F0]",
    className:
      "w-[56px] h-[56px] sm:w-[76px] sm:h-[76px] lg:w-[92px] lg:h-[92px] top-[3%] left-[55%] sm:left-[60%]",
  },
  {
    src: "/home/person3.png",
    bg: "bg-[#E5E7EB]",
    className:
      "w-[80px] h-[80px] sm:w-[108px] sm:h-[108px] lg:w-[132px] lg:h-[132px] top-[27%] left-[29%] sm:left-[32%]",
  },
  {
    src: "/home/person4.png",
    bg: "bg-[#FDECD0]",
    className:
      "w-[64px] h-[64px] sm:w-[84px] sm:h-[84px] lg:w-[100px] lg:h-[100px] top-[40%] left-[0%] sm:left-[4%]",
  },
  {
    src: "/home/person5.png",
    bg: "bg-[#DBEAFE]",
    className:
      "w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] lg:w-[100px] lg:h-[100px] top-[34%] left-[64%] sm:left-[68%]",
  },
  {
    src: "/home/person6.png",
    bg: "bg-[#FEF3C7]",
    className:
      "w-[72px] h-[72px] sm:w-[100px] sm:h-[100px] lg:w-[116px] lg:h-[116px] top-[60%] left-[28%] sm:left-[36%]",
  },
];

const UnifiedStartupHub = () => {
  return (
    <section className="w-full px-5 sm:px-8 lg:px-16 py-2 pt-10 sm:pt-16 lg:pt-20">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center lg:items-center gap-10 sm:gap-12 lg:gap-16 justify-between">
        {/* Left Side */}
        <div className="flex-1 max-w-[580px] items-center sm:mt-6">
          <h2 className="text-[28px] sm:text-[40px] lg:text-[52px] font-bold leading-[1.1] tracking-tight text-[#076EFF]">
            The Unified
            <br />
            Startup Ecosystem
          </h2>

          <p className="mt-5 sm:mt-8 text-[13px] sm:text-[15px] lg:text-[16px] leading-[1.75] text-[#83939C]">
            EcoSync connects {}
            <span className="font-semibold text-[#076EFF]">
              founders, mentors, investors, freelancers, and professionals
            </span>{" "}
            in one unified platform designed for collaboration and innovation.
          </p>

          <p className="mt-3 sm:mt-5 text-[13px] sm:text-[15px] lg:text-[16px] leading-[1.75] text-[#83939C]">
            Whether you are building a startup or supporting one, { }
            <span className="font-semibold text-[#076EFF]">EcoSync</span>{" "}
            provides the tools, networks, and infrastructure to accelerate
            growth.
          </p>
        </div>

        {/* Right Side */}
        <div className="flex-1 ml-10 sm:ml-0  w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[480px]">
          <div className="relative w-full aspect-square mx-auto">
            {avatars.map((avatar, i) => (
              <div
                key={i}
                className={`absolute rounded-full overflow-hidden ${avatar.bg} ${avatar.className}`}
              >
                <Image
                  src={avatar.src}
                  alt={`Team member ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UnifiedStartupHub;
