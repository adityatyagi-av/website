import React from "react";
import Image from "next/image";
import Link from "next/link";

const TeamSection = () => {
  const TeamData = [
    {
      id: 1,
      imgSrc: "/idea.png",
      name: "Lara Benett",
      role: "lara.bennett@example.com",
      linkedin: "",
      twitter: "",
      github: "",
    },
    {
      id: 2,
      imgSrc: "/idea.png",
      name: "Lara Benett",
      role: "lara.bennett@example.com",
      linkedin: "",
      twitter: "",
      github: "",
    },
    {
      id: 3,
      imgSrc: "/idea.png",
      name: "Lara Benett",
      role: "lara.bennett@example.com",
      linkedin: "",
      twitter: "",
      github: "",
    },
    {
      id: 4,
      imgSrc: "/idea.png",
      name: "Lara Benett",
      role: "lara.bennett@example.com",
      linkedin: "",
      twitter: "",
      github: "",
    },
  ];
  return (
    <div className="max-w-[1200px] mx-auto my-8 sm:my-14 lg:my-20 px-4 sm:px-6 lg:px-0">
      <div className="flex justify-center">
        <h1 className="w-full max-w-[460px] text-[#076EFF] font-semibold text-[32px] sm:text-[44px] lg:text-[60px] text-center leading-[1.1] lg:leading-[60px] pb-6 sm:pb-10 lg:pb-14">
          Our Team
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-0 lg:space-x-4">
        {TeamData?.map((team) => {
          return (
            <div
              key={team.id}
              className={`flex flex-col ${team.id % 2 === 0 ? "mt-6 sm:mt-8 md:mt-12" : "mt-0"}`}
            >
              <Image
                src={team.imgSrc}
                width={257}
                height={275}
                className="rounded-xl h-[12rem] sm:h-[15rem] lg:h-[18rem] w-full object-cover"
                alt={team.name}
              />
              <h4 className="text-[#7D7D7D] text-[14px] sm:text-base lg:text-lg pt-3 sm:pt-4 md:pb-2 font-semibold">
                {team.name}
              </h4>
              <h5 className="text-[#7D7D7D] text-[11px] sm:text-xs md:text-sm pt-2 sm:pt-4 pb-2 font-semibold break-all sm:break-normal">
                {team.role}
              </h5>
              <div className="w-3/4 h-[0.83px] bg-[#E3E3E3] my-2"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamSection;