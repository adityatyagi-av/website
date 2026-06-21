"use client";
import React from "react";
import Image from "next/image";

const Possibilty = () => {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-10 py-10 sm:py-14 lg:py-20">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex justify-center">
          <h1 className="w-full max-w-[540px] text-[#076EFF] font-bold lg:text-[60px] text-center lg:leading-[60px] pb-10 lg:pb-14">
            Explore the EcoSync Platform
          </h1>
        </div>
        {/* Mobile: stacked, Desktop: bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 auto-rows-auto lg:grid-rows-[320px_320px_320px]">
          {/* 1 - Smart Networking (tall left card, spans 2 rows on lg) */}
          <div className="shadow-[0px_4px_40px_0px_#0000001A] rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col justify-between overflow-hidden lg:row-span-2 order-1">
            <h3 className="text-[22px] sm:text-[26px] lg:text-[28px] font-bold text-[#1D1D1D] leading-tight">
              Smart Networking
            </h3>
            <div className="relative w-full h-[200px] sm:h-[240px] lg:h-[280px] my-4 lg:my-0">
              <Image
                src="/home/possibility1.png"
                alt="Smart Networking"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-[13px] sm:text-[14px] lg:text-[15px] leading-[1.7] text-[#232323]">
              Connect with founders, mentors, investors, and professionals
              across the ecosystem. Discover relevant people, build meaningful
              relationships, and grow your network faster.
            </p>
          </div>

          {/* 2 - Social Feed & Communities (top right wide card) */}
          <div className="shadow-[0px_4px_40px_0px_#0000001A] rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col sm:flex-row items-start lg:items-end gap-4 overflow-hidden sm:col-span-1 lg:col-span-2 order-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-[22px] sm:text-[24px] lg:text-[28px] font-bold text-[#1D1D1D] leading-tight">
                Social Feed &<br />
                Communities
              </h3>
              <p className="mt-3 text-[13px] sm:text-[14px] lg:text-[15px] leading-[1.7] text-[#232323]">
                Share updates, join focused communities, and collaborate with
                peers. Stay informed about startup activity, industry insights,
                and opportunities in real time.
              </p>
            </div>
            <div className="relative w-full sm:w-[45%] lg:w-[40%] h-[180px] sm:h-[200px] lg:h-full flex-shrink-0">
              <Image
                src="/home/possibility2.png"
                alt="Social Feed"
                fill
                className="object-contain object-right-top"
              />
            </div>
          </div>

          {/* 3 - EcoSync Center Logo */}
          <div className="bg-white shadow-[0px_4px_40px_0px_#076EFF66] min-h-[200px] rounded-3xl border-2 border-[#076EFF] flex items-center justify-center overflow-hidden order-4 lg:order-3">
            <div className="relative w-[60%] h-[60%] sm:w-[85%] sm:h-[75%]">
              <Image
                src="/ecosync.png"
                alt="EcoSync"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* 4 - Events & Hackathons */}
          <div className="shadow-[0px_4px_40px_0px_#0000001A] rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col overflow-hidden order-3 lg:order-4">
            <h3 className="text-[22px] sm:text-[24px] lg:text-[28px] font-bold text-[#1D1D1D] leading-tight">
              Events &<br className="hidden lg:block" /> Hackathons
            </h3>
            <div className="relative w-full flex-1 min-h-[160px] sm:min-h-[200px] mt-3 lg:mt-12">
              <Image
                src="/home/events.png"
                alt="Events"
                fill
                className="object-contain object-top rounded-2xl"
              />
            </div>
          </div>

          {/* 5 - Endless Opportunities (bottom left wide card) */}
          <div className="shadow-[0px_4px_40px_0px_#0000001A] rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col overflow-hidden sm:col-span-2 order-5">
            <div className="flex flex-row-reverse items-end">
              <div className="relative w-full h-[180px] sm:h-[200px] lg:h-[220px]">
                <Image
                  src="/home/possibility4.png"
                  alt="Endless Opportunities"
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="text-[22px] sm:text-[24px] lg:text-[28px] font-bold text-[#1D1D1D] leading-tight mt-4">
                Endless Opportunities
              </h3>
            </div>
            <p className="mt-2 text-[13px] sm:text-[14px] lg:text-[15px] leading-[1.7] text-[#232323]">
              Explore startup jobs, freelance projects, collaborations, and
              mentorship sessions. EcoSync helps you find opportunities that
              accelerate your growth.
            </p>
          </div>

          {/* 6 - Unified Messaging (bottom right, image overflows) */}
          <div className="shadow-[0px_4px_40px_0px_#0000001A] rounded-3xl p-5 sm:p-6 lg:py-7 lg:pl-5 lg:px-0 flex flex-col overflow-hidden order-6">
            <h3 className="text-[22px] sm:text-[24px] lg:text-[28px] font-bold text-[#1D1D1D] leading-tight">
              Unified
              <br />
              Messaging
            </h3>
            <p className="mt-2 text-[13px] sm:text-[14px] lg:text-[15px] leading-[1.7] text-[#232323]">
              Communicate instantly with founders, mentors, investors, and
              collaborators through a built-in messaging system designed for the
              startup ecosystem.
            </p>
            <div className="relative w-full flex-1 min-h-[240px] sm:min-h-[300px] mt-3">
              <Image
                src="/home/possibility5.png"
                alt="Unified Messaging"
                fill
                className="object-contain object-bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Possibilty;
