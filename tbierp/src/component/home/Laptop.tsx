import Image from "next/image";
import React from "react";

const Laptop = () => {
  return (
    <div className="relative w-full px-4 sm:px-6 lg:px-0 lg:mt-5">
      <div className="flex justify-center">
        <h1 className="w-full max-w-[640px] text-[#076EFF] font-bold lg:text-[60px] text-center lg:leading-[60px] pb-10 lg:pb-14">
          One Platform. <br /> Endless Possibilities.
        </h1>
      </div>

      {/* Quote - visible only on mobile, above image */}
      <div className="sm:hidden text-center px-4 pb-6">
        <p className="text-[13px] leading-[1.6] text-[#4C4C4C] italic">
          "Building the digital infrastructure that powers modern startup
          ecosystems."
        </p>
        <p className="mt-2 text-[12px] font-semibold text-[#4C4C4C]">
          -EcoSync
        </p>
      </div>

      {/* Container */}
      <div className="relative h-[300px] sm:h-[500px] md:h-[680px] lg:h-[820px]">
        <Image
          src="/home/laptop.png"
          alt="portal"
          fill
          className="object-cover object-left"
        />

        {/* Quote text - hidden on mobile, visible sm+ */}
        <div className="absolute italic right-[4%] sm:right-[8%] lg:right-[14%] top-[20%] sm:top-[25%] lg:top-[30%] max-w-[140px] sm:max-w-[200px] lg:max-w-[280px] hidden sm:block">
          <p className="text-[11px] sm:text-[15px] lg:text-[20px] leading-[1.6] text-[#4C4C4C] italic">
            "Building the digital infrastructure that powers modern startup
            ecosystems."
          </p>
          <p className="mt-3 sm:mt-4 lg:mt-6 text-[11px] sm:text-[14px] lg:text-[18px] font-semibold text-[#4C4C4C]">
            -EcoSync
          </p>
        </div>
      </div>
    </div>
  );
};

export default Laptop;
