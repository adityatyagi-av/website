"use client";

import { useState } from "react";
import { Facebook, Instagram, Twitter, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";

const ContactPage = () => {
  const [status, setStatus] = useState("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in name, email, and message.");
      return;
    }

    setStatus("loading");

    await new Promise((r) => setTimeout(r, 50));

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to send");

      toast.success("Message sent! Check your email for confirmation.");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error("Failed to send. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Main Contact Section */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="mx-auto mt-10 max-w-7xl">
          {/* Header */}
          <div className="">
            <div className="mx-auto text-center mb-4 lg:mb-8">
              <h2 className="text-[32px] sm:text-[44px] lg:text-[68px] xl:text-[84px] font-semibold tracking-tight text-[#076EFF]">
                Contact EcoSync
              </h2>
            </div>
            <div className="flex flex-col  lg:items-start lg:justify-between">
              <div className="mb-8 space-y-6 lg:mb-0">
                <h1 className="mb-1 text-[18px] sm:text-[24px] md:text-4xl lg:text-[44px] font-semibold leading-tight text-[#1370F2]">
                  Have questions about EcoSync ?
                </h1>
                <h2 className="text-[18px] sm:text-[24px] md:text-4xl lg:text-[44px] font-semibold leading-tight text-[#252525]">
                  Our team is here to help you explore the platform, portals,
                  and opportunities available within the ecosystem.
                </h2>
              </div>

              {/* Social Icons */}
              <div className="flex flex-row items-center gap-3 mt-3 lg:mt-5">
                <div className="flex items-center justify-center transition-colors border border-gray-200 rounded-full cursor-pointer w-9 h-9 hover:bg-purple-400/20">
                  <Facebook className="w-5 h-5 text-[#191919]" />
                </div>
                <div className="flex items-center justify-center transition-colors border border-gray-200 rounded-full cursor-pointer w-9 h-9 hover:bg-purple-400/20">
                  <Instagram className="w-5 h-5 text-[#191919]" />
                </div>
                <div className="flex items-center justify-center transition-colors border border-gray-200 rounded-full cursor-pointer w-9 h-9 hover:bg-purple-400/20">
                  <Twitter className="w-5 h-5 text-[#191919]" />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="mb-12 mt-28 sm:mb-28">
            <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full pb-3 text-[#2B2B2B] placeholder-[#2B2B2B] transition-colors bg-transparent border-b border-[#2B2B2B] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-1 lg:col-span-1">
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pb-3 text-[#2B2B2B] placeholder-[#2B2B2B] transition-colors bg-transparent border-b border-[#2B2B2B] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-1 lg:col-span-1">
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number (optional)"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pb-3 text-[#2B2B2B] placeholder-[#2B2B2B] transition-colors bg-transparent border-b border-[#2B2B2B] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-8">
              <textarea
                name="message"
                placeholder="Message"
                rows={1}
                value={formData.message}
                onChange={handleInputChange}
                className="w-full pb-3 text-[#2B2B2B] placeholder-[#2B2B2B] transition-colors bg-transparent border-b border-[#2B2B2B] resize-none focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === "loading"}
              className="flex items-center mt-16 sm:mt-20 lg:mt-12 gap-2 px-5 py-4 font-medium text-[#FFFF] transition-colors bg-[#316BFF] rounded-3xl hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Sending..." : "Send Message"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 gap-8 mb-12 sm:gap-12 sm:mb-16 md:grid-cols-2 lg:grid-cols-2 bg-[#0E0E0E] p-8 lg:p-14 lg:px-18">
            <div className="md:col-span-2 lg:col-span-1">
              <p className="mb-4 text-sm text-[#FFFF]">Contact Info</p>
              <h3 className="text-2xl sm:text-[36px] font-bold leading-tight text-[#FFFF]">
                We're here to support
                <br />
                your ecosystem journey
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="md:col-span-1 lg:col-span-1">
                <p className=" text-sm text-[#FFFF]">Email Address</p>
                <p className="mb-4 font-medium text-[#FFFF]">
                  support@ecosync.io
                </p>
                <p className=" text-sm text-[#FFFF]">Help Center</p>
                <p className="mb-4 font-medium text-[#FFFF]">
                  Browse documentation, portal guides, and platform tutorials in
                  our help center.
                </p>
                <p className="text-sm text-[#FFFF]">Visit Help Center →</p>
              </div>

              <div className="md:col-span-1 lg:col-span-1">
                <p className="text-sm text-[#FFFF]">Discord Community</p>
                <p className="mb-4 font-medium text-[#FFFF]">
                  Join our Discord to connect with founders, mentors, and
                  ecosystem members, ask questions, and get real-time support.
                </p>
                <p className="text-sm text-[#FFFF]">Join Discord →</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
