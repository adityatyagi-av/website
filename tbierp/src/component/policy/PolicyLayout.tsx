import Link from "next/link";

interface PolicySection {
  title: string;
  content: string[];
}

interface PolicyLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: PolicySection[];
}

const policyLinks = [
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms & Conditions", href: "/terms-and-conditions" },
  { name: "Refund Policy", href: "/refund-policy" },
  { name: "Cookie Policy", href: "/cookie-policy" },
  { name: "Shipping & Returns", href: "/shipping-and-returns" },
];

export default function PolicyLayout({ title, subtitle, lastUpdated, sections }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen bg-white pt-24 sm:pt-28 pb-20">
      <div className="max-w-[880px] mx-auto px-5 sm:px-8">
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#5433FF] to-[#20BDFF]" />
            <span className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#20BDFF]">
              Legal
            </span>
          </div>
          <h1 className="text-[32px] sm:text-[42px] lg:text-[48px] font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-4">
            {title}
          </h1>
          <p className="text-[16px] sm:text-[17px] text-gray-500 leading-relaxed max-w-[640px]">
            {subtitle}
          </p>
          <div className="mt-5 flex items-center gap-3 text-[13px] text-gray-400">
            <span>Last updated: {lastUpdated}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Opernova Technologies LLP</span>
          </div>
        </header>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <section key={i} className="group">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[13px] font-bold text-gray-400 group-hover:bg-[#20BDFF]/5 group-hover:border-[#20BDFF]/20 group-hover:text-[#20BDFF] transition-all duration-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-3 leading-snug">
                    {section.title}
                  </h2>
                  <div className="space-y-3">
                    {section.content.map((paragraph, j) => (
                      <p key={j} className="text-[15px] text-gray-600 leading-[1.75]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-10 border-t border-gray-100">
          <h4 className="text-[12px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-4">
            Other Policies
          </h4>
          <div className="flex flex-wrap gap-2">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full text-[13px] font-medium text-gray-600 bg-gray-50 border border-gray-100 hover:border-[#20BDFF]/30 hover:bg-[#20BDFF]/5 hover:text-[#20BDFF] transition-all duration-200"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
          <p className="text-[14px] text-gray-500 leading-relaxed">
            If you have questions about any of our policies, please contact us at{" "}
            <a href="mailto:legal@ecosync.co.in" className="text-[#20BDFF] font-medium hover:underline">
              legal@ecosync.co.in
            </a>{" "}
            or visit our{" "}
            <Link href="/contact" className="text-[#20BDFF] font-medium hover:underline">
              contact page
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
