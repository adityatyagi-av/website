"use client";
import React from "react";
import Link from "next/link";
import ScrollFadeUp from "../home/ScrollFadeUp";
import allBlogs from "@/lib/blogData";
import { motion } from "framer-motion";

const tagColors = [
  "text-[#F4BE00]",
  "text-[#0BAA60]",
  "text-[#F936CE]",
  "text-[#375DFB]",
  "text-[#FF8A00]",
  "text-[#20BDFF]",
  "text-[#A020F0]",
  "text-[#FF4500]",
  "text-[#00C9A7]",
  "text-[#E84393]",
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const estimateReadTime = (content: string) => {
  const words = content.split(/\s+/).length;
  return `${Math.ceil(words / 200)} min read`;
};

const BlogSection = ({ blogpage = false }: { blogpage?: boolean }) => {
  const sortedBlogs = [...allBlogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const displayBlogs = blogpage ? sortedBlogs : sortedBlogs.slice(0, 3);

  return (
    <div className="flex justify-center mb-12 sm:p-8 px-2">
      <div className=" max-w-[1200px]">
        {!blogpage && (
          <motion.div className="sm:my-10 mb-8">
            <p className="text-sm lg:text-[34px] tracking-wide">
              <span className="font-medium bg-[#076EFF] bg-clip-text text-transparent ">
                Read our Blogs
              </span>
            </p>
          </motion.div>
        )}

        <div className="mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {displayBlogs.map((blog, index) => (
              <ScrollFadeUp key={blog.id}>
                <Link href={`/blog/${blog.slug}`}>
                  <div className="p-[1px] rounded-3xl bg-[linear-gradient(40.41deg,_rgba(255,255,255,0.04)_0%,_rgba(255,255,255,0.12)_100%)]">
                    <div className="bg-[linear-gradient(180deg,_#1F2321_0%,_#020B05_100%)] p-5 rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer h-full flex flex-col">
                      <div className="relative">
                        <div className="flex items-center justify-center">
                          {index % 2 === 0 ? (
                            <img
                              src="/blog1.png"
                              className="w-full h-[240px] object-cover rounded-2xl"
                              alt={blog.title}
                            />
                          ) : (
                            <img
                              src="/blog2.png"
                              className="w-full h-[240px] object-cover rounded-2xl"
                              alt={blog.title}
                            />
                          )}
                        </div>

                        <div className="absolute bottom-4 left-4 flex gap-2">
                          {blog.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`bg-[#2828284D] shadow-[inset_0px_0px_4.14px_1.03px_#ffffff14] px-3 py-1 text-xs font-semibold border border-[#FFFFFF12] rounded-[20px] backdrop-blur-sm ${getTagColor(tag)}`}
                            >
                              {tag.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="px-4 pt-6 pb-4 flex flex-col flex-1">
                        <h3 className="text-white text-lg font-bold mb-3 leading-snug hover:text-gray-300 transition-colors line-clamp-2">
                          {blog.title}
                        </h3>
                        <p className="text-[#F1F1EF66] text-sm leading-relaxed line-clamp-2 mb-5">
                          {blog.description}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#ffffff0a]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0">
                              <span className="text-white text-[11px] font-semibold">
                                TO
                              </span>
                            </div>
                            <div>
                              <p className="bg-[linear-gradient(180deg,_#F1F1EF_-108.76%,_rgba(241,241,239,0.3)_166.74%)] bg-clip-text text-transparent text-sm font-medium">
                                Team Opernova
                              </p>
                              <p className="bg-[linear-gradient(180deg,_#F1F1EF_-108.76%,_rgba(241,241,239,0.3)_166.74%)] bg-clip-text text-transparent text-xs">
                                {blog.tags[0]}
                              </p>
                            </div>
                          </div>
                          <p className="text-[#F1F1EF99] text-xs flex items-center gap-1 whitespace-nowrap">
                            {formatDate(blog.date)}
                            <span className="inline-block bg-[#375DFB] w-[5px] h-[5px] rounded-full mx-1"></span>
                            {estimateReadTime(blog.content)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogSection;
