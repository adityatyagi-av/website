"use client";
import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";

const StickyNavbar = () => {
  const [show, setShow] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past 100px → show navbar
        setShow(true);
      } else {
        // Scrolling up → hide navbar
        setShow(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Normal navbar at top (not fixed) */}
      <div className="relative z-50 w-full">
        <Navbar />
      </div>

      {/* Sticky navbar - slides in on scroll down */}
      <div
        className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${
          show ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <Navbar />
      </div>
    </>
  );
};

export default StickyNavbar;
