"use client";

import { useState } from "react";
import ReferenceNavbar from "./ReferenceNavbar";
import ReferenceSidebar from "./ReferenceSidebar";

export default function ReferenceLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">

      <div className="flex relative pt-16 sm:pt-20">
        <ReferenceSidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 w-full">{children}</main>
      </div>
    </div>
  );
}
