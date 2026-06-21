"use client";
import React from "react";
import Image from "next/image";

const roles = [
  { name: "Founder", image: "/home/dum.svg" },
  { name: "Mentor", image: "/home/dum3.svg" },
  { name: "Student", image: "/home/dum4.svg" },
  { name: "Freelancer", image: "/home/dum5.svg" },
  { name: "Investor", image: "/home/dum3.svg" },
  { name: "Incubator", image: "/home/dum.svg" },
];

const PortalSystem = () => {
  return (
    <section className="w-full overflow-hidden mt-10 sm:mt-28 ">
      <div className="flex justify-center w-full bg-white px-10 sm:px-14 lg:px-0">
        <div className=" flex justify-between w-full max-w-[800px]">
          <div className="px-3 bg-gradient-to-t from-[#1370F2] to-white  h-30 sm:h-44 lg:h-50  shadow-[0px_4px_80.9px_0px_#00000040]"></div>

          <div className="px-3 bg-gradient-to-t from-[#1370F2] to-white  h-30 sm:h-44 lg:h-50  shadow-[0px_4px_80.9px_0px_#00000040]"></div>
        </div>
      </div>
      <div className="relative bg-[#1370F2] ">
        <div className="flex justify-center w-full px-10 sm:px-14 lg:px-0">
          <div className=" flex justify-between w-full max-w-[800px]">
            <div className="px-3 bg-white h-30 sm:h-44 lg:h-50 shadow-[0px_4px_80.9px_0px_#00000040]"></div>

            <div className="px-3 bg-white  h-30 sm:h-44 lg:h-50  shadow-[0px_4px_80.9px_0px_#00000040]"></div>
          </div>
        </div>

        <div className="mx-4 sm:mx-8 lg:mx-auto max-w-[1200px] bg-white rounded-2xl sm:rounded-2xl px-6 sm:px-10 lg:px-14 py-8 sm:py-10 lg:py-24 shadow-[0_20px_60px_rgba(0,0,0,0.1)] text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="relative w-[120px] h-[40px] sm:w-[150px] sm:h-[50px] lg:w-[180px] lg:h-[56px]">
              <Image
                src="/ecosync.png"
                alt="EcoSync"
                fill
                className="object-cover"
              />
            </div>
          </div>
          <h1 className="text-[28px] sm:text-[40px] lg:text-[52px] xl:text-[62px] font-semibold text-[#1D1D1D] tracking-tight leading-[1.1]">
            Role-Based Portal System
          </h1>
          <p className="mt-3 sm:mt-4 lg:mt-5 text-[13px] sm:text-[15px] lg:text-[17px] leading-[1.65] text-[#616161] max-w-[680px] mx-auto">
            EcoSync provides personalized portals designed for every participant
            in the startup ecosystem. Access tools, opportunities, and insights
            tailored specifically to your role.
          </p>
        </div>

        <div className="px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 lg:pt-18">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-center text-[18px] sm:text-[22px] lg:text-[28px] font-bold text-white mb-6 sm:mb-8 lg:mb-10">
              Choose Your Role in the Ecosystem
            </h2>

            {/* Role cards */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
              {roles.map((role, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center ${
                    i >= 3 ? "col-span-1 sm:col-span-1" : ""
                  } ${i === 3 ? "col-start-1 sm:col-start-auto" : ""}`}
                >
                  <div className="relative w-full bg-white rounded-t-xl  pt-3 sm:pt-4 pb-4 sm:pb-5 flex flex-col items-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                    {/* Avatar */}
                    <div className="relative w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] lg:w-[100px] lg:h-[100px]  mb-2 sm:mb-3">
                      <div className="w-full h-full rounded-full bg-[#F0F0F0] overflow-hidden  shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                        <Image
                          src={role.image}
                          alt={role.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <span className="text-[12px] sm:text-[14px] lg:text-[16px] font-semibold text-[#1D1D1D]">
                      {role.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom white space */}
      <div className="h-10 sm:h-14 lg:h-20 bg-white" />
    </section>
  );
};

export default PortalSystem;
