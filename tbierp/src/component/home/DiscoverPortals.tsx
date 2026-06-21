"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Blocks, Settings, Briefcase, BarChart3 } from "lucide-react";

const portals = [
  {
    id: "mentor",
    label: "Mentor\nPortal",
    image: "/portal/mentorr.png",
    description:
      "Mentors support startups by providing strategic guidance, reviewing progress, and helping founders overcome challenges during their growth journey",
    features: [
      {
        icon: Blocks,
        title: "Guide Startups",
        desc: "Support founders by reviewing their ideas, product development progress, and business strategies.",
      },
      {
        icon: Settings,
        title: "Manage Mentorship Sessions",
        desc: "Schedule and manage mentorship meetings with startups through structured mentoring workflows.",
      },
      {
        icon: Briefcase,
        title: "Evaluate Startup Progress",
        desc: "Track startup growth through milestone reviews, performance metrics, and structured feedback.",
      },
      {
        icon: BarChart3,
        title: "Share Insights & Resources",
        desc: "Provide industry insights, frameworks, and learning resources that help founders make better strategic decisions.",
      },
    ],
  },
  {
    id: "startup",
    label: "Startup\nportal",
    image: "/portal/startupportal.png",
    description:
      "The startup portal provides founders with tools to build their company, collaborate with mentors, connect with investors, and manage their growth journey.",
    features: [
      {
        icon: Blocks,
        title: "Startup Workspace",
        desc: "Manage company profiles, team members, documents, milestones, and startup progress in a centralized workspace.",
      },
      {
        icon: Settings,
        title: "Mentor Collaboration",
        desc: " Connect with mentors, schedule guidance sessions, and receive expert feedback to improve your business strategy.",
      },
      {
        icon: Briefcase,
        title: "Investor Discovery",
        desc: "Explore potential investors, submit your startup for funding review, and connect with VC partners.",
      },
      {
        icon: BarChart3,
        title: "Opportunity Marketplace",
        desc: "Discover startup jobs, freelance talent, partnerships, and ecosystem opportunities.",
      },
    ],
  },
  {
    id: "Incubation",
    label: "Incubation\nportal",
    image: "/portal/vc.png",
    description:
      "The incubation portal is a SaaS platform designed for incubators and accelerators to manage startup programs, cohorts, mentors, and funding workflows efficiently.",
    features: [
      {
        icon: Blocks,
        title: "Startup Application Management",
        desc: "Receive, review, and manage startup applications for incubation programs and cohorts.",
      },
      {
        icon: Settings,
        title: "Evaluation Panels",
        desc: "Create evaluation committees where mentors and experts review startup applications and provide scores and feedback.",
      },
      {
        icon: Briefcase,
        title: "Program Management",
        desc: "Track incubation cohorts, startup milestones, mentorship sessions, and program progress.",
      },
      {
        icon: BarChart3,
        title: "Funding & Resource Allocation",
        desc: "Manage grant disbursement, funding approvals, and resource distribution for incubated startups.",
      },
    ],
  },
  {
    id: "investor",
    label: "Investor\nportal",
    image: "/portal/investorr.png",
    description:
      "Investors and VC partners can discover promising startups, evaluate opportunities, and connect with founders directly through the EcoSync ecosystem.",
    features: [
      {
        icon: Blocks,
        title: "Startup Discovery",
        desc: "Explore startups across industries, stages, and funding needs through curated discovery tools.",
      },
      {
        icon: Settings,
        title: "Deal Flow Management",
        desc: "Track startup investment opportunities and manage deal pipelines efficiently.",
      },
      {
        icon: Briefcase,
        title: "Startup Evaluation",
        desc: "Review startup profiles, pitch decks, traction metrics, and performance insights.",
      },
      {
        icon: BarChart3,
        title: "Founder Collaboration",
        desc: "Communicate directly with founders, schedule discussions, and explore investment opportunities.",
      },
    ],
  },
  {
    id: "freelencer",
    label: "Freelancer\nportal",
    image: "/portal/freelancerr.png",
    description: "Freelancers can connect with startups, find projects, collaborate with founders, and contribute their expertise within the startup ecosystem.",
    features: [
      {
        icon: Blocks,
        title: "Project Marketplace",
        desc: "Browse freelance opportunities posted by startups across various domains.",
      },
      {
        icon: Settings,
        title: "Skill-Based Matching",
        desc: "Get matched with startups and projects based on your skills and expertise.",
      },
      {
        icon: Briefcase,
        title: "Collaboration Tools",
        desc: "Work with startup teams through shared workspaces, communication tools, and project discussions.",
      },
      {
        icon: BarChart3,
        title: "Portfolio & Reputation",
        desc: "Build a professional profile showcasing your experience, completed projects, and community reputation.",
      },
    ],
  },
];

const DiscoverPortals = () => {
  const [active, setActive] = useState(0);
  const current = portals[active];

  return (
    <section className="w-full px-4 sm:px-6 lg:px-10 py-10 sm:py-14 lg:py-20">
      <div className="max-w-[1200px] mx-auto">
        {/* Heading */}
        <div className="text-start">
          <h2 className="text-[28px] sm:text-[36px] lg:text-[52px] xl:text-[62px] font-semibold leading-[1.15] tracking-tight text-[#1B45B4] ">
            Explore All
            <br />
            EcoSync Portals
          </h2>
        </div>

        {/* Tabs */}
        <div className="mt-8 sm:mt-10 lg:mt-14 flex justify-center overflow-x-auto no-scrollbar">
          <div className="flex gap-0 border-b border-gray-200 w-full">
            {portals.map((portal, i) => (
              <button
                key={portal.id}
                onClick={() => setActive(i)}
                className={`flex-1 px-4 sm:px-6 lg:px-10 py-3 sm:py-4 text-center text-[13px] sm:text-[14px] lg:text-[16px] font-medium whitespace-pre-line leading-tight transition-all flex-shrink-0 ${
                  active === i
                    ? "text-[#1D1D1D] font-semibold border-b-[3px] border-[#076EFF]"
                    : "text-[#83939C] hover:text-[#1D1D1D]"
                }`}
              >
                {portal.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div className="mt-8 sm:mt-10 lg:mt-12 bg-[#FFFFFF] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.08)]">
          {/* Feature Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 p-5 sm:p-7 lg:p-10 lg:px-12">
            {current.features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="flex flex-col">
                  <Icon
                    className="w-5 h-5 sm:w-6 sm:h-6 text-[#1D1D1D]"
                    strokeWidth={1.5}
                  />
                  <h3 className="mt-3 sm:mt-4 text-[14px] sm:text-[15px] lg:text-[17px] font-semibold text-[#1D1D1D]">
                    {feat.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] sm:text-[12px] lg:text-[14px] leading-[1.65] text-[#232323]">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Portal Image */}
          <div className=" px-2 md:px-10">
            <div className="relative w-full h-[200px] sm:h-[320px] md:h-[420px] lg:h-[540px] rounded-xl sm:rounded-2xl shadow-[0px_-19.19px_35.98px_0px_rgba(0,0,0,0.25)] overflow-hidden bg-white">
              <Image
                src={current.image}
                alt={current.label}
                fill
                className="sm:object-cover rounded-2xl object-top sm:scale-[1.01]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DiscoverPortals;
