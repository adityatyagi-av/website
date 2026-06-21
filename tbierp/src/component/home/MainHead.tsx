// import { PeopleIcon, StarIconsGroup } from "@/lib/svgIcons";
import Image from "next/image";

const StatsSection = () => {
  return (
    <div className="my-8 md:my-12 lg:my-20 py-20 relative overflow-hidden">
      <div
        className="relative w-full h-[914px] overflow-hidden"
        style={{
          background:
            "linear-gradient(83.79deg, #1B45B4 3.25%, #1C2792 96.85%)",
        }}
      >
        {/* SVG tilted shape from bottom, covering entire bottom area */}
        <svg
          className="absolute bottom-0 left-0 w-full h-40 sm:h-52 lg:h-56"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
        >
          <polygon points="0,20 100,0 100,20" fill="white" />{" "}
          {/* match the gradient color */}
        </svg>

        <svg
          className="absolute top-0 left-0 w-full h-40 sm:h-52 lg:h-56"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          style={{ transform: "rotate(180deg)" }} // rotate the shape for top tilt
        >
          <polygon points="0,20 100,0 100,20" fill="white" />{" "}
          {/* match the gradient color */}
        </svg>
      </div>

      {/* Content Box */}
      <div className="relative z-10 mx-auto max-w-7xl px-32 py-10 bg-[#316BFF] rounded-xl flex flex-col md:flex-row items-center justify-between text-white gap-10">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-[38px] h-[38px]">
            <Image alt="about" src="/icons/about1.svg" width={37} height={37} />
          </div>
          <div className="text-3xl md:text-5xl font-extrabold">54+</div>
          <div className="text-sm mt-7">Total Event Done</div>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col items-center text-center">
          {/* <div className="h-[53px]">  <StarIconsGroup/></div> */}

          <div className="text-3xl md:text-5xl font-extrabold">+1,000</div>
          <div className="text-sm mt-7">
            Average start review. <br />
            4,5 stars
          </div>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col items-center text-center">
          {/* <div className="w-[38px] h-[38px]"> <PeopleIcon/></div> */}
          <div className="text-3xl md:text-5xl font-extrabold">200+</div>
          <div className="text-sm mt-7">
            Number of clients <br />
            served
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsSection;
