import Image from "next/image";
import React from "react";

const Results = () => {
  return (
    <div
      className="relative w-full lg:h-[900px] sm:h-[800px] h-[400px] my-10 overflow-hidden "
      style={{
        background: "#076EFF",
      }}
    >
      {/* SVG tilted shape from bottom, covering entire bottom area */}
      <svg
        className="absolute bottom-0 left-0 w-full h-20 sm:h-40 xl:h-56"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        <polygon points="0,20 100,0 100,20" fill="white" />{" "}
        {/* match the gradient color */}
      </svg>

      <svg
        className="absolute top-0 left-0 w-full h-20 sm:h-40 xl:h-56 outline-none border-none"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        style={{ transform: "rotate(180deg)" }} // rotate the shape for top tilt
      >
        <polygon points="0,20 100,0 100,20" stroke="none" fill="white" />{" "}
        {/* match the gradient color */}
      </svg>

      <div className="w-[320px] sm:w-[350px] lg:w-[400px] absolute h-[40px] sm:h-[60px]  lg:h-[80.02px] top-[74px] sm:top-[200px] lg:top-[240.49px] -right-60 sm:-right-40  xl:-right-20 opacity-100 bg-[#E7E7E7]  transform  -rotate-[10deg]"></div>
      <div className="w-[320px] sm:w-[350px] lg:w-[400px] absolute h-[40px] sm:h-[60px]  lg:h-[80.02px]  top-sm:[65%] top-[72%] xl:top-[62%] -left-60 sm:-left-40 xl:-left-20 opacity-100 bg-[#2b8bcb]   transform  -rotate-[10deg]"></div>
      <div className="absolute h-full  w-full flex justify-center items-center">
        <div
          className="xl:max-w-[1150px] max-w-[440px] sm:max-w-[800px] w-full mx-10 h-[200px] sm:h-[366px] bg-white/2 backdrop-blur-lg rounded-lg sm:px-8 px-2 lg:pl-14 sm:pb-10 justify-center flex flex-col"
          style={{
            border: "1.55px solid transparent",
            borderImageSource:
              "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(239, 239, 239, 0) 100%)",
            borderImageSlice: 1,
            boxShadow: "0px 0px 9.1px 0px #FFFFFF40",
          }}
        >
          <h1 className="bg-gradient-to-br from-white via-transparent to-transparent bg-[linear-gradient(155.16deg,#FFFFFF_11.53%,rgba(255,255,255,0)_109.53%)] bg-clip-text text-transparent text-[16px] sm:text-[35.66px] lg:text-[42.66px] font-sfPro tracking-[-2%] mb-2 font-sfPro font-[590] text-shadow-2xs">
            The Power of a Connected Ecosystem
          </h1>

          <div className="flex flex-col sm:flex-row mt-3 sm:mt-10 mb-2 sm:mb-5 lg:mb-8">
            <h1
              style={{
                boxShadow: "inset 0px 0px 52.76px 0px #316BFF17",
                // boxShadow: "0px 0px 7.86px 0px #316BFF40",
              }}
              className="text-[10px]  sm:text-[18px] lg:text-[24px] rounded-lg sm:px-5 text-center py-2 sm:py-3 bg-[#FF31314A] border-[1.12px] text-[#FFFFFF] px-2 border-[#FF3131] leading-[1] text-shadow-2xs tracking-[-0.02em] mr-2 font-sfPro font-[590] mb-2 sm:mb-0"
            >
              Without Ecosync
            </h1>
            <h1 className="text-[10px] sm:text-[18px] lg:text-[24px] text-[#D9D9D9] flex items-center sm:px-2 ml-3 leading-[1] tracking-[-0.02em] font-sfPro font-[590]">
              Disconnected tools | Scattered communication | Manual processes
            </h1>
          </div>
          <div className="flex items-center flex-col-reverse sm:flex-row">
            <h1 className="max-w-[727px] text-[8px] sm:text-[16px] lg:text-[20px]  bg-white py-2 sm:py-3 text-[#375DFB] rounded-lg flex items-center px-2 sm:px-4 leading-[1] w-full tracking-[-0.02em] font-sfPro font-[590]">
             Unified collaboration | Automated workflows | Real-time ecosystem insights
            </h1>
            <h1 className="text-[10px] sm:text-[18px] lg:text-[24px]  text-white  sm:px-2 ml-1 sm:ml-3 leading-[1] tracking-[-0.02em] font-sfPro font-[590] mb-2 sm:mb-0">
              With Ecosync
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
