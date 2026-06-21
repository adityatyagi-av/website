import Image from "next/image";
import React from "react";
import { ChevronRight } from "lucide-react";

const EcoSyncHero = () => {
  return (
    <section className="w-full px-2 sm:px-6 lg:px-0 lg:pl-10 xl:pl-14 py-10 sm:py-14 lg:py-24 overflow-hidden">
      <div className="mx-auto">
        <div className="relative">
          {/* Blue Card */}
          <div
            className="relative z-0 w-full lg:w-[78%] rounded-2xl sm:rounded-3xl px-6 sm:px-10 lg:px-14 py-10 sm:py-14 lg:py-16 flex flex-col justify-center"
            style={{
              background: `linear-gradient(0deg, #076EFF, #076EFF), radial-gradient(100% 100% at 50% 50%, rgba(255, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0) 100%)`,
            }}
          >
            <p className="text-white/70 text-[13px] sm:text-[14px] lg:text-[16px] font-medium tracking-wide">
              EcoSync Incubator OS
            </p>

            <h2 className="mt-4 sm:mt-6 text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-[1.15] tracking-tight text-[#DEDCFFCC] max-w-[420px]">
              The Operating System for{" "}
              <span className="text-white">Incubators</span>
            </h2>

            <p className="mt-4 sm:mt-6 lg:mt-8 text-[13px] sm:text-[14px] lg:text-[16px] leading-[1.75] text-white/80 max-w-[440px]">
              EcoSync enables incubators and accelerators to manage startup applications, mentorship networks, evaluations, and funding workflows in one unified platform.
            </p>

            <div className="mt-6 sm:mt-8 lg:mt-10">
              <a
                href="#"
                className="inline-flex items-center gap-1 text-[14px] sm:text-[15px] font-semibold text-white hover:text-white/90 transition-colors"
              >
                Explore Incubator Platform
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* App Screenshot - overlapping, no right gap */}
          <div className="relative lg:absolute lg:right-0 lg:top-[10%] z-10 w-full lg:w-[55%] sm:-mt-6 lg:mt-0 pr-0 flex justify-center lg:block">
            <div className="relative w-full h-[280px] sm:h-[400px] md:h-[500px] lg:h-[660px] rounded-l-2xl sm:rounded-l-3xl overflow-hidden">
              <Image
                src="/home/frame2.svg"
                alt="EcoSync Platform"
                fill
                className="object-cover object-top-left rounded-l-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EcoSyncHero;