import { ArrowIcon, ButtonHome } from "@/lib/Svg";
import Image from "next/image";
import React from "react";

const HeroSection = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background image - covers full section */}
      <div className="absolute inset-0 -z-50 pointer-events-none overflow-hidden h-[68%] top-0 -left-30 ">
        <Image
          src="/product/left.png"
          alt="bg"
          fill
          priority
          className="object-cover scale-[1.4] sm:scale-[1.3] lg:scale-[1.15] opacity-[0.55] grayscale"
        />
        {/* White radial fade - hides background behind center content */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 65% at 50% 50%, rgba(255,255,255,1) 40%, rgba(255,255,255,0.95) 60%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>
      <div className="flex justify-center ">
        <div className="flex flex-col justify-center relative items-center w-full max-w-[720px] mx-10 z-10">
          <div className="h-[220px]">
            <Image
              src="/ecosync.png"
              alt="ecosync"
              width={350}
              height={134}
              className="w-[20.875rem] h-[15.75rem] sm:h-[17.75rem] p-1"
            />
          </div>
          <h1 className="text-[#595959] text-[18px] text-center">
            EcoSync connects startups, mentors, investors, freelancers, and
            incubators in a unified platform designed to accelerate innovation,
            collaboration, and growth.
          </h1>
          <div className="flex items-center justify-center space-x-3 sm:space-x-5 my-8 sm:my-10 lg:my-14 overflow-hidden  lg:mb-20">
            <div className="sm:hidden ml-18 overflow-hidden">
              <ButtonHome size={"270"} />
            </div>
            <div className="hidden rounded-2xl sm:block py-1 ">
              {/* <BtnIcon /> */}
              <ButtonHome size={"270"}  />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center pb-20 items-center px-4 sm:px-6 lg:px-0 relative z-10">
        <div className="relative w-full max-w-[890px] aspect-[890/612] shadow-[0px_20px_68px_0px_#00000040,0px_6.38px_21.7px_0px_#00000014,0px_2.41px_8.21px_0px_#00000008,0px_0.8px_2.71px_0px_#00000003] rounded-xl sm:rounded-2xl lg:rounded-3xl">
          {/* Second (Above) Image */}
          <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[94.4%] h-[92.3%]">
            <Image
              src="/product/social.png"
              alt="Product 2"
              fill
              className="object-cover"
            />
          </div>

          {/* Right floating card */}
          <div className="absolute top-[34%] -right-[10%] sm:-right-[10%] w-[18.5%] h-[32.5%] hidden sm:block">
            <Image
              src="/product/social4.svg"
              alt="Product 3"
              fill
              className="object-content rounded-md"
            />
          </div>

          {/* Top left card */}
          <div className="absolute top-[3.5%] -left-[5%] -translate-x-1/2 w-[19.8%] h-[35.1%] hidden md:block">
            <Image
              src="/product/social3.svg"
              alt="Product 5"
              fill
              className="object-content rounded-md"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
