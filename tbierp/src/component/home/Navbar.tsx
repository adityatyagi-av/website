"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Hammburger } from "./Hammburger";
import NavbarContent from "./NavbarContent";
import MobileNavContent from "./MobileNav";

const Navbar = () => {
  const [signin, setSignin] = useState(false);
  return (
    <div className="flex justify-center sm:mt-2">
      <div className="flex justify-between items-center py-2 px-2 w-full bg-white md:shadow-[0px_8px_10px_-6px_#0000001A,0px_20px_25px_-5px_#0000001A] max-w-[640px] md:rounded-3xl">
        <div className="text-[#2B2B2B] relative w-[68px] lg:w-[70px] h-[38px] rounded-full hidden md:block">
          <Image
            src="/logoo.svg"
            className="max-w-[144px] mx-auto object-content"
            alt="cover"
            layout="fill"
          />
        </div>

        <div className="md:hidden block ml-auto mr-2 mt-2">
          <Hammburger content={<MobileNavContent />} />
        </div>

        <div className="hidden md:block">
          <NavbarContent />
        </div>
        <div className="items-center md:flex space-x-2 hidden">
          <button
            onClick={() => setSignin(false)}
            className={`font-medium text-[#2B2B2B] text-[16px] leading-[1.4] hover:text-[#0097FEDB] text-center ${
              !signin &&
              "w-[122px] h-[44px] hover:text-[#0097FEDB] hover:bg-[white] transform rotate-0 opacity-100 gap-1 rounded-[10px] px-[30px] text-center font-dmsans font-bold text-[16px] leading-[1.35] tracking-normal bg-[rgba(255,255,255,0.1)]"
            }`}
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

{
  /* <div
        style={{
          background:
            "linear-gradient(109.87deg, rgba(5, 137, 240, 0.6) -15.54%, rgba(177, 78, 223, 0.6) 83.66%)",
          backdropFilter: "blur(1px)",
          filter: "blur(40px)",
          borderRadius: "20%",
        }}
        className="-z-20 right-0 h-[130px] absolute  w-[140px] hidden lg:block"
      ></div>
      <div
        style={{
          background:
            "linear-gradient(101.06deg, rgba(5, 137, 240, 0.7) 7.54%, rgba(5, 137, 240, 0.7) 72.97%)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(246px)", // for Safari support
          borderRadius: "40px", // optional, for rounded corners
          filter: "blur(60px)",
        }}
        className="-z-50 left-0 h-[180px] lg:h-[280px] absolute rounded-full w-[230px] lg:w-[360px]  hidden lg:block"
      ></div>

       <div
        style={{
          background:
            "linear-gradient(101.06deg, rgba(5, 137, 240, 0.7) 7.54%, rgba(5, 137, 240, 0.7) 72.97%)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(246px)", // for Safari support
          borderRadius: "20px", // optional, for rounded corners
          filter: "blur(40px)",
        }}
        className="-z-50 right-50 lg:right-80  h-[80px] w-[80px] lg:h-[180px] absolute rounded-full lg:w-[180px]  hidden lg:block"
      ></div> */
}
