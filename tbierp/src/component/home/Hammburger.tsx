"use client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HamburgerIcon } from "@/lib/Svg";
import Image from "next/image";

export function Hammburger({ content }: { content: React.ReactNode}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-0 border-none ml-4 md:ml-8 bg-transparent cursor-pointer">
          <HamburgerIcon />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="max-w-[310px]">
        <SheetHeader>
          <SheetTitle>
            <div className="text-[#2B2B2B] relative w-[68px] lg:w-[70px] h-[38px] rounded-full hidden md:block">
              <Image
                src="/home/logo.svg"
                className="max-w-[144px] mx-auto object-cover"
                alt="cover"
                layout="fill"
              />
            </div>
          </SheetTitle>
        </SheetHeader>

        {content}
      </SheetContent>
    </Sheet>
  );
}
