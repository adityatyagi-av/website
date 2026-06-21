"use client";
import React from "react";
import Image from "next/image";

const Explore = () => {
  return (
    <>
      <div className="flex justify-center px-3 sm:px-5 mb-4 sm:mb-8 lg:mb-10 lg:mt-10">
        <div className="flex flex-col md:flex-row w-full  max-w-[1200px] justify-between gap-2 sm:gap-8">
          <h1 className="text-[#076EFF] font-bold lg:text-[52px] lg:leading-[60px] max-w-[477px]">
            Explore the <br className="hidden sm:block"/> EcoSync Ecosystem
          </h1>

          <p className="text-[#076EFF] lg:text-[24px] max-w-[600px] text-left">
            Discover how EcoSync’s unified platform helps you manage profiles,
            collaborate with your network, access opportunities, and grow your
            startup - all in one place.
          </p>
        </div>
      </div>
      <div className="bg-[radial-gradient(80%_80%_at_50%_50%,#1370F2_0%,#FFFFFF_100%)]">
        <section className="w-full px-4 sm:px-6 lg:px-10 py-10 sm:py-14 lg:py-20 ">
          <div className="max-w-[1200px] mx-auto space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {/* 1 - Centralized Startup Workspace (col 1-2, row 1) */}
              <div className="sm:col-span-2 relative lg:col-span-2 lg:row-start-1 lg:col-start-1 bg-[#1370F2] rounded-2xl sm:rounded-3xl overflow-hidden">
                <div className="p-5 sm:p-7 lg:p-8">
                  <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-white leading-tight">
                    Centralized Startup Workspace
                  </h3>
                  <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-white/80 max-w-[440px]">
                    Manage your organizations, startup profiles, documents, team
                    information, and progress updates in one structured
                    workspace designed for growing startups.
                  </p>
                </div>
                <div className="absolute w-full z-50 h-[50px] sm:h-[100px] bottom-0 bg-gradient-to-t from-[rgba(114,0,239,0.2)] to-[rgba(138,0,253,0)]"></div>
                <div className="relative w-full h-[200px] sm:h-[260px] lg:h-[300px] rounded-t-2xl sm:rounded-t-3xl overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:ml-6">
                  <Image
                    src="/home/works.svg"
                    alt="Workspaces"
                    fill
                    className="object-contain object-top"
                  />
                </div>
              </div>

              {/* 2 - Opportunity Marketplace (col 3, rows 1-2) */}
              <div className="lg:col-start-3 lg:row-start-1 lg:row-span-2 flex flex-col rounded-2xl sm:rounded-3xl bg-[linear-gradient(315deg,#FFFFFF_0%,rgba(255,255,255,0.4)_100%)]">
                <div className="p-5 sm:p-7 lg:p-8">
                  <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-[#1D1D1D] leading-tight">
                    Opportunity Marketplace
                  </h3>
                  <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-[#595959]">
                    Discover freelance projects, investment opportunities,
                    startup roles, and collaborations in real time through
                    EcoSync’s ecosystem marketplace.
                  </p>
                </div>
                <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[340px] rounded-2xl sm:rounded-3xl overflow-hidden">
                  <Image
                    src="/portal/activity.svg"
                    alt="Activity"
                    fill
                    className="object-cover object-center"
                  />
                </div>
              </div>

              {/* 3 - Role-Adaptive Portal (col 1, rows 2-3) */}
              <div className="lg:col-start-1 lg:row-start-2 lg:row-span-2 flex flex-col bg-white rounded-2xl sm:rounded-3xl">
                <div className="p-5 sm:p-7 lg:p-8 lg:px-0">
                  <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-[#1D1D1D] leading-tight lg:px-5">
                    Role-Adaptive Portal
                  </h3>
                  <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-[#595959] lg:px-5">
                    EcoSync automatically personalizes your experience based on
                    your role - whether you're a founder, mentor, investor,
                    freelancer, or incubator.
                  </p>
                </div>
                <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[340px] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#EBF3FF] ">
                  <Image
                    src="/portal/frame.svg"
                    alt="Role Network"
                    fill
                    className="object-cover lg:object-contain object-center"
                  />
                </div>
              </div>

              {/* 4 - Collaboration Rooms (col 2, row 2) */}
              <div className="lg:col-start-2 lg:row-start-2 bg-[linear-gradient(315deg,#FFFFFF_0%,rgba(255,255,255,0.4)_100%)] rounded-2xl sm:rounded-3xl flex flex-col">
                <div className="p-5 sm:p-7 lg:p-8">
                  <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-[#1D1D1D] leading-tight">
                    Collaboration Rooms
                  </h3>
                  <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-[#595959]">
                    Create shared spaces for teams, cohorts, mentors, and
                    startups to collaborate, exchange files, brainstorm ideas,
                    and manage discussions.
                  </p>
                </div>
                <div className="relative w-full flex-1 min-h-[180px] sm:min-h-[210px] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#EBF3FF]">
                  <Image
                    src="/portal/portals.png"
                    alt="Portals"
                    fill
                    className="object-contain object-center"
                  />
                </div>
              </div>

              {/* 5 - Mentor & Investor Connect (col 2-3, row 3) */}
              <div className="sm:col-span-2 lg:col-start-2 lg:col-span-2 lg:row-start-3 bg-[linear-gradient(315deg,#FFFFFF_0%,rgba(255,255,255,0.4)_100%)] rounded-2xl sm:rounded-3xl pl-5 pt-5 sm:pt-7 lg:pt-8 sm:pl-7 lg:pl-8">
                <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-[#1D1D1D] leading-tight">
                  Mentor & Investor Connect
                </h3>
                <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-[#595959] max-w-[520px]">
                  Book mentorship sessions, submit startups for review, and
                  connect with investors to receive guidance, feedback, and
                  funding opportunities.
                </p>
                <div className="relative w-full h-[200px] sm:h-[260px] lg:h-[300px] mt-4 rounded-t-2xl sm:rounded-t-3xl overflow-hidden bottom-0 right-0">
                  <Image
                    src="/portal/mentor.png"
                    alt="Mentor"
                    fill
                    className="object-cover scale-[1.1] object-top-left"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-6 ">
              {/* Left Column */}
              <div className="flex-2 flex flex-col gap-4 sm:gap-5 lg:gap-6 rounded-2xl">
                <div className="bg-gradient-to-tr overflow-hidden from-black to-[#555555] rounded-2xl sm:rounded-3xl">
                  <div className="p-5 sm:p-7 lg:p-8">
                    <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-white leading-tight">
                      Smart Communication Centre
                    </h3>
                    <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-white/70 max-w-[400px]">
                      All chats, announcements, discussions, and notifications
                      are unified into a single communication hub to keep your
                      ecosystem connected.
                    </p>
                  </div>
                  <div className="relative w-full h-[220px] sm:h-[300px] lg:h-[330px] rounded-t-2xl sm:rounded-t-3xl overflow-hidden bg-white ml-20">
                    <Image
                      src="/portal/messages.png"
                      alt="Messages"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>

                <div className="rounded-2xl sm:rounded-3xl bg-[linear-gradient(315deg,#FFFFFF_0%,rgba(255,255,255,0.4)_100%)]">
                  <div className=" p-5 sm:p-7 lg:p-8 rounded-2xl sm:rounded-3xl">
                    <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-[#1D1D1D] leading-tight">
                      Start Your Company
                    </h3>
                    <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-[#595959] max-w-[440px]">
                      Turn ideas into startups with access to resources, expert
                      mentorship, co-founder discovery, and structured
                      incubation pathways.
                    </p>
                  </div>
                  <div className="flex justify-center w-full h-[220px] sm:h-[300px] lg:h-[340px] overflow-hidden bg-[#F6F7FB] rounded-b-2xl lg:rounded-b-3xl">
                    <Image
                      src="/portal/company.png"
                      alt="Start Your Company"
                      width={400}
                      height={300}
                      className=" sm:h-[20rem]"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex-1 flex flex-col gap-4 sm:gap-5 lg:gap-6 bg-[linear-gradient(315deg,#FFFFFF_0%,rgba(255,255,255,0.4)_100%)] rounded-2xl sm:rounded-3xl">
                <div className="p-5 sm:p-7 lg:p-8">
                  <h3 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-[#1D1D1D] leading-tight">
                    Communities For You
                  </h3>
                  <p className="mt-2 sm:mt-3 text-[12px] sm:text-[14px] lg:text-[15px] leading-[1.65] text-[#595959] max-w-[400px]">
                    Join communities aligned with your industry, interests, and
                    startup stage. Share insights, ask questions, and
                    collaborate with peers.
                  </p>
                </div>

                <div className="relative w-full flex-1 min-h-[320px] sm:min-h-[400px] lg:min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                  <Image
                    src="/portal/community.png"
                    alt="Communities"
                    fill
                    className="object-cover md:object-contain object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Explore;
