import React from "react";

const CtaSection = () => {
  return (
    <div className="flex justify-center items-center w-full px-2 mt-6 sm:mt-12 lg:mt-20">
    <div className="flex flex-col max-w-[1200px] w-full justify-center items-center gap-8  px-2 rounded-3xl  bg-[linear-gradient(2.14deg,_#5433FF_1.94%,_#20BDFF_60.04%,_#A5FECB_118.14%)] text-center py-22 lg:mx-6">
      <h1 className="text-2xl sm:text-7xl font-semibold text-[#FFFFFF] text-center ">
        Join the EcoSync 
        <br />
        Ecosystem Today
      </h1>
      <div className="">
        <button className="rounded-4xl flex justify-center items-center text-center p-4 bg-[linear-gradient(180deg,_#1F2321_0%,_#0D2013_100%)] shadow-[inset_0px_1.03px_0px_0px_#ffffff17] text-[#FFFFFF] w-fit">
          Get Started {" "}
          <svg
            className="ml-2"
            width="15"
            height="12"
            viewBox="0 0 15 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.99481 0.657826C8.29775 0.354888 8.78892 0.354999 9.09193 0.657826L13.9199 5.48575C14.0652 5.63123 14.1472 5.82862 14.1472 6.03431C14.1471 6.23996 14.0653 6.43744 13.9199 6.58287L9.09193 11.4098C8.78894 11.7128 8.2978 11.7128 7.99481 11.4098C7.69214 11.1068 7.69195 10.6156 7.99481 10.3127L11.4983 6.81017H0.957503C0.52912 6.81017 0.181826 6.46265 0.181641 6.03431C0.181641 5.60581 0.529006 5.25845 0.957503 5.25845H11.4983L7.99481 1.75494C7.69204 1.45199 7.69204 0.960777 7.99481 0.657826Z"
              fill="#F1F1EF"
            />
          </svg>
        </button>
      </div>
    </div>
    </div>
  );
};

export default CtaSection;
