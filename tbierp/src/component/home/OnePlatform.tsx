import Image from "next/image";
import React from "react";

const OnePlatform = () => {
  return (
    <div className=" my-20 lg:my-22 flex  items-center lg:ml-10 xl:ml-24 ">
      <div className="sm:max-w-[544] max-w-[200px] pl-10 xl:ml-20 ">
        <h1 className="font-dmSans font-medium text-[20px] sm:text-[35px] lg:text-[49px] leading-[20px] sm:leading-[28px]  md:leading-[38px] lg:leading-[52px] text-[#1370F2] tracking-normal">
          One Platform. Multiple Powerful Portals.
        </h1>
        <p className="font-sans font-normal text-[10px] sm:text-[14px] lg:text-[16px] leading-[100%] tracking-[0px] text-[#666666] font-inter sm:my-8 my-5 lg:my-12 ">
          EcoSync powers the entire startup ecosystem through specialized
          portals for founders, mentors, investors, freelancers, and incubators.
          Each portal provides tailored tools and workflows to simplify
          collaboration and accelerate innovation.
        </p>

        <button className="lg:px-[40px]  lg:py-[20px] sm:px-[30px] sm:py-[15px] px-[20px] py-[10px] bg-[#1370F2]   font-[DM Sans] font-semibold text-[9px] sm:text-[14px] lg:text-[20px] text-[white] sm:rounded-2xl rounded-lg leading-[100%] tracking-[0] max-w-[250px]">
          Explore All Portals
        </button>
      </div>
      <div className="lg:h-[526px] sm:h-[300px] h-[180px] w-full sm:max-w-[700px] relative ">
        <Image
          src="/home/future.svg"
          alt="management image"
          layout="fill"
          className="bottom-0 w-full"
        />
      </div>
    </div>
  );
};

export default OnePlatform;
