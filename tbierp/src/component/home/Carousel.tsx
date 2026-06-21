"use client";

const testimonials = [
  {
    quote:
      "EcoSync simplifies how startups connect with mentors and investors. It brings the entire ecosystem into one collaborative platform.”",
    author: "Maria S. (Startup Founder)",
  },
  {
    quote: "The platform makes mentorship and collaboration incredibly efficient. It’s exactly what startup ecosystems needed.",
    author: "Kyle G. (Startup Mentor)",
  },
  {
    quote:
      "EcoSync provides a structured environment for discovering startups and evaluating opportunities. It’s a powerful tool for investors.",
    author: "Nathan W. (Angel Investor)",
  },
  {
    quote: "The community features and networking tools make it easy to connect with founders and contribute meaningfully to startup growth.",
    author: "Jason P. (Product Advisor)",
  },
  {
    quote:
      "Managing startup cohorts and mentorship programs is significantly easier with EcoSync. Everything is organized in one place.",
    author: "Drew R. (Incubator Manager)",
  },
  {
    quote:
      "EcoSync creates a real innovation network where founders, mentors, and investors collaborate seamlessly.",
    author: "Kyle C. (Ecosystem Partner)",
  },
  {
    quote: "The design system you've created looks unbelievable.",
    author: "Kyle G.",
  },
];

const testimonials2 = [
  {
    quote: "The design system you've created looks unbelievable.",
    author: "Kyle G.",
  },
  {
    quote:
      "It's really helpful and exactly the structure I was looking for and was planning to spend many hours on.",
    author: "Drew R.",
  },
  {
    quote:
      "Monumental asset for not only my course projects but also my career.",
    author: "Kyle",
  },
  {
    quote:
      "Probably the best system so far I was working with. Fully responsive, sleek and easy to customise. Elegant typography and attentiveness to every detail stole my heart.",
    author: "Maria",
  },
  {
    quote:
      "I bought this a long time ago, and it has been super useful to me. Thank you for all your great work.",
    author: "Nathan W.",
  },
  {
    quote: "I can image that's most designers and it also looks very good.",
    author: "Jaer P.",
  },
  {
    quote: "The design system you've created looks unbelievable.",
    author: "Kyle G.",
  },
];

export default function ImageCarousel() {
  const loopTop = [...testimonials, ...testimonials];
  const loopBottom = [...testimonials2, ...testimonials2];

  return (
    <div className=" overflow-hidden mx-1 group relative">
      <div className="max-w-[780px] ml-2 sm:ml-10 lg:ml-28 mb-2">
        <h2 className="text-[28px] sm:text-[36px] lg:text-[48px] xl:text-[56px] font-bold leading-[1.15] tracking-tight">
          <span className="text-[#0A7CFF]">Trusted by Ecosystem Builders</span>
          <br />
          <span className="text-[#4E616B]">
            What Innovators Say About EcoSync
          </span>
        </h2>
      </div>

      <div className="relative w-[100vw] overflow-hidden">

        {/* Top Row - Scroll Right */}
        <div className="w-[100vw] mb-6 overflow-hidden">
          <div className="flex gap-4 sm:gap-6 w-max animate-scroll-right group-hover:animate-scroll-right-fast md:p-8">
            {loopTop.map((t, idx) => (
              <div
                key={`top-${idx}`}
                className="w-[220px] sm:w-[280px] lg:w-[320px] flex-shrink-0 bg-white/60 border border-gray-200/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col justify-center"
              >
                <p className="text-[12px] sm:text-[13px] lg:text-[14px] leading-[1.65] text-[#4a4a4a]">
                  "{t.quote}"
                </p>
                <p className="mt-3 sm:mt-4 text-[12px] sm:text-[13px] lg:text-[14px] font-medium text-[#83939C]">
                  {t.author}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row - Scroll Left */}
        <div className="w-screen mb-6 overflow-hidden">
          <div className="flex gap-4 sm:gap-6 w-max animate-scroll-left group-hover:animate-scroll-left-fast">
            {loopBottom.map((t, idx) => (
              <div
                key={`bottom-${idx}`}
                className="w-[220px] sm:w-[280px] lg:w-[320px] flex-shrink-0 bg-white/60 border border-gray-200/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col justify-center"
              >
                <p className="text-[12px] sm:text-[13px] lg:text-[14px] leading-[1.65] text-[#4a4a4a]">
                  "{t.quote}"
                </p>
                <p className="mt-3 sm:mt-4 text-[12px] sm:text-[13px] lg:text-[14px] font-medium text-[#83939C]">
                  {t.author}
                </p>
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          @keyframes scroll-right {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          @keyframes scroll-left {
            0% {
              transform: translateX(-50%);
            }
            100% {
              transform: translateX(0);
            }
          }
          @keyframes scroll-right-fast {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          @keyframes scroll-left-fast {
            0% {
              transform: translateX(-50%);
            }
            100% {
              transform: translateX(0);
            }
          }
          .animate-scroll-right {
            animation: scroll-right 20s linear infinite;
          }
          .animate-scroll-left {
            animation: scroll-left 20s linear infinite;
          }
          .animate-scroll-right-fast {
            animation: scroll-right-fast 8s linear infinite;
          }
          .animate-scroll-left-fast {
            animation: scroll-left-fast 8s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
