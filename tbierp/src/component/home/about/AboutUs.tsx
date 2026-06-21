import React from "react";
import Image from "next/image";
import ScrollFadeUp from "../ScrollFadeUp";

const AboutUs = () => {
  const logos = [
    "/icons/company1.svg",
    "/icons/company2.svg",
    "/icons/company3.svg",
    "/icons/company44.svg",
    "/icons/company5.png",
    "/icons/company6.png",
  ];

  return (
    <section className="w-full px-4 sm:px-8 lg:px-10 py-16 sm:py-18 lg:py-24">
      <div className="max-w-[1200px] mx-auto text-center">
        <h2 className="text-[32px] sm:text-[44px] lg:text-[68px] xl:text-[84px] font-semibold tracking-tight text-[#076EFF]">
        About EcoSync
        </h2>

        <p
          className="mt-4 sm:mt-6 lg:mt-8 text-[15px] sm:text-[20px] lg:text-[24px] leading-[26px] sm:leading-[33px] lg:leading-[39px] text-[#7D7D7D] capitalize"
          style={{
            fontFamily: "DM Sans, sans-serif",
            letterSpacing: "-0.87px",
          }}
        >
          EcoSync is a unified digital ecosystem designed to connect founders, mentors, investors, freelancers, and incubators on a single collaborative platform. Our mission is to simplify how innovation communities operate by providing the infrastructure needed to build startups, share knowledge, and unlock new opportunities. <br />
          Developed by Opernova Technologies, EcoSync empowers startup ecosystems with role-based portals, collaboration tools, and incubation management systems that accelerate innovation and growth.

        </p>

        {/* Logos */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 lg:gap-8 mt-8 sm:mt-10 lg:mt-14 pt-2">
          <div className="relative w-[120px] h-[36px] sm:w-[180px] sm:h-[48px] lg:w-[220px] lg:h-[76px]">
            <Image
              src="/home/opern.png"
              alt="Opernova"
              fill
              className="object-cover scale-[1.1]"
            />
          </div>
          <span className="text-[14px] sm:text-[18px] lg:text-[22px] text-[#7D7D7D] font-light">
            x
          </span>

          <div className="relative w-[120px] h-[36px] sm:w-[180px] sm:h-[48px] lg:w-[220px] lg:h-[56px]">
            <Image
              src="/ecosync.png"
              alt="EcoSync"
              fill
              className="object-cover mb-1"
            />
          </div>
        </div>
      </div>

      {/* trusted by section */}
      {/* <ScrollFadeUp>
        <div className="mt-20  px-4 sm:px-0 max-w-[1200px] mx-auto text-center">
          <h2 className="text-[#545454] font-medium text-lg">
            Incubation’s Working with us
          </h2>
          <div className="flex justify-center items-center">
            <div className="justify-center items-center gap-10 lg:gap-32 grid mt-12 grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
              {logos?.map((logo, index) => (
                <Image key={index} src={logo} width={100} height={100} alt="" />
              ))}
            </div>
          </div>
        </div>
      </ScrollFadeUp> */}

      <section className="w-full px-5 sm:px-8 lg:px-16 py-10 sm:py-14 lg:py-20 ">
        <div className="mx-auto max-w-[1200px]">
          {/* Why ECOSYNC */}
          <h2 className="text-[24px] sm:text-[32px] lg:text-[40px] font-semibold tracking-tight text-[#076EFF]">
            Why EcoSync
          </h2>
          <p className="mt-3 sm:mt-4 lg:mt-5 text-[13px] sm:text-[15px] lg:text-[16px] leading-[1.75] text-[#4a4a4a]">
            Startup ecosystems are often fragmented across multiple tools, disconnected communities, and inefficient processes. EcoSync solves this by bringing the entire ecosystem into one unified platform.
          </p>
          <p className="mt-3 sm:mt-4 text-[13px] sm:text-[15px] lg:text-[16px] leading-[1.75] text-[#4a4a4a]">
            From startup networking and mentorship to incubator program management and investment discovery, EcoSync provides the digital infrastructure needed to accelerate innovation and collaboration.
          </p>

          {/* Privacy-focused */}
          <h2 className="mt-10 sm:mt-14 lg:mt-16 text-[24px] sm:text-[32px] lg:text-[40px] font-semibold tracking-tight text-[#076EFF]">
            Our Vision
          </h2>
          <p className="mt-3 sm:mt-4 lg:mt-5 text-[13px] sm:text-[15px] lg:text-[16px] leading-[1.75] text-[#4a4a4a]">
           We believe the future of innovation depends on strong, connected startup ecosystems. Our vision is to create a global platform where founders, mentors, investors, and innovators collaborate seamlessly to transform ideas into impactful businesses.
          </p>
        </div>
      </section>
    </section>
  );
};

export default AboutUs;
