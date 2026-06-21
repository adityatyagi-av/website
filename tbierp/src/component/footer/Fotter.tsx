import Image from "next/image";
import Link from "next/link";
import React from "react";

const Footer = () => {
  const socialLinks = [
    {
      id: 1,
      link: "",
      name: "Linkedin",
    },
    {
      id: 2,
      link: "",
      name: "Twitter",
    },
    {
      id: 3,
      link: "",
      name: "Instagram",
    },
    {
      id: 4,
      link: "",
      name: "Discord",
    },
    {
      id: 5,
      link: "",
      name: "YouTube",
    },
    {
      id: 6,
      link: "",
      name: "GitHub",
    },
  ];

  const navigationLink = [
    {
      pageName: "Home",
      pageLink: "/",
    },
    {
      pageName: "About",
      pageLink: "/about",
    },
    {
      pageName: "Platform",
      pageLink: "#",
    },
    {
      pageName: "Portals",
      pageLink: "/reference/introduction",
    },
    {
      pageName: "Blog",
      pageLink: "/blogs",
    },
    {
      pageName: "Contact",
      pageLink: "/contact",
    },
  ];
  return (
    <div className="mt-20 mb-0 pb-9 bg-[#FFFFFF] pt-10 px-10 sm:pt-20 sm:px-16 lg:pt-32 lg:px-28">
      {/* upper section */}
      <div className="flex flex-col sm:flex-row justify-between">
        {/* left part */}
        <div className="flex flex-col items-start gap-8">
          <h1 className="font-semibold text-4xl sm:text-8xl bg-[linear-gradient(90deg,_#5433FF_0%,_#20BDFF_50%,_#A5FECB_100%)] bg-clip-text text-transparent sm:leading-9xl">
            Ready to Join
            <br />
            the Ecosystem?
          </h1>
          <button className="mb-4 cursor-pointer shadow-[0px_7.63px_59.15px_0px_#00000040] flex text-center justify-center items-center md:py-2 px-4 rounded-full w-fit gap-6 transition duration-300 hover:scale-105 active:scale-95 hover:shadow-lg">
            <p className="text-center text-lg text-nowrap md:text-3xl font-normal leading-[56px]">
              Join EcoSync
            </p>
            <div className="bg-[linear-gradient(90deg,_#5433FF_0%,_#20BDFF_50%,_#A5FECB_100%)] flex justify-center items-center rounded-full w-8 h-8 md:w-16 md:h-16 transition duration-300 hover:brightness-110 active:scale-90">
              <svg
                width="26"
                height="21"
                viewBox="0 0 26 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.0766 1.10442C15.4541 0.726911 16.0661 0.726911 16.4436 1.10442L25.466 10.1268C25.6474 10.308 25.7492 10.5539 25.7492 10.8103C25.7492 11.0667 25.6474 11.3126 25.466 11.4939L16.4436 20.5164C16.0661 20.8939 15.4541 20.8939 15.0766 20.5164C14.699 20.1389 14.699 19.5268 15.0766 19.1492L22.4487 11.777L1.58193 11.777C1.04804 11.777 0.615234 11.3442 0.615234 10.8103C0.615234 10.2764 1.04804 9.84361 1.58193 9.84361L22.4487 9.84361L15.0766 2.47153C14.699 2.09402 14.699 1.48195 15.0766 1.10442Z"
                  fill="white"
                />
              </svg>
            </div>
          </button>
        </div>
        {/* right part */}
        <div className="flex flex-col sm:pt-8 ">
          {socialLinks.map((link) => {
            return (
              <Link
                key={link.id}
                href={link?.link}
                className="text-[#000000] hover:underline"
              >
                {link?.name}
              </Link>
            );
          })}
        </div>
      </div>
      {/* lower section */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-8 pb-5">
        <Image
          width={200}
          height={200}
          alt="Opernova"
          src="/portal/blackicon.png"
        />
        <div className="grid grid-cols-2  md:flex gap-8">
          {navigationLink.map((page, index) => (
            <Link
              key={index}
              href={page.pageLink}
              className="text-[#000000] hover:underline"
            >
              {page.pageName}
            </Link>
          ))}
        </div>
      </div>
      <div
        className="w-full rounded-full inline-block"
        style={{
          border: "1.5px solid",
          borderImageSource:
            "linear-gradient(90deg, #5433FF 0%, #20BDFF 50%, #A5FECB 100%)",
          borderImageSlice: 1,
        }}
      ></div>
      <div className="mt-6 text-center text-[14px]">
        <h2>
          © 2025 EcoSync. All rights reserved. Powered by Opernova Technologies
          LLP.
        </h2>
      </div>
    </div>
  );
};

export default Footer;
