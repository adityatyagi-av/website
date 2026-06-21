"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

const BlogPost = ({ blog }: { blog: any }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!blog) {
    return (
      <div className="bp-empty">
        <p>Blog not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bp-progress" style={{ width: `${progress}%` }} />

      <article className="bp-article">
        <div className="bp-hero">
          <Image
            src={blog.heroImage}
            alt={blog.title}
            width={1200}
            height={520}
            className="bp-hero-img"
            priority
          />
        </div>

        <div className="bp-meta">
          <div className="bp-tags">
            {blog.tags?.map((tag, i) => (
              <span key={i} className="bp-tag">
                {tag}
              </span>
            ))}
          </div>
          <div className="bp-meta-info">
            {blog.date && (
              <span className="bp-date">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {blog.date}
              </span>
            )}
            {blog.author && (
              <span className="bp-author">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {blog.author}
              </span>
            )}
          </div>
        </div>

        <h1 className="bp-title">{blog.title}</h1>

        {blog.description && (
          <p className="bp-description">{blog.description}</p>
        )}

        <div className="bp-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ node, src, alt }) => (
                <span className="bp-img-wrap">
                  <Image
                    src={(src as string) || ""}
                    alt={alt as string || ""}
                    width={800}
                    height={450}
                    className="bp-inline-img"
                    loading="lazy"
                    sizes="(max-width: 720px) 100vw, 720px"
                  />
                </span>
              ),
              h2: ({ node, children, ...props }) => (
                <h2 className="bp-h2" {...props}>
                  {children}
                </h2>
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote className="bp-blockquote" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a
                  className="bp-link"
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              ul: ({ node, ...props }) => <ul className="bp-ul" {...props} />,
              ol: ({ node, ...props }) => <ol className="bp-ol" {...props} />,
              li: ({ node, children, ...props }) => (
                <li className="bp-li" {...props}>
                  <span className="bp-li-icon">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                  <span className="bp-li-text">{children}</span>
                </li>
              ),
              hr: () => (
                <div className="bp-divider">
                  <span />
                  <span />
                  <span />
                </div>
              ),
              p: ({ node, children, ...props }) => {
                const hasImage =
                  node?.children?.some((c: any) => c.tagName === "img") ??
                  false;
                if (hasImage) return <>{children}</>;
                return (
                  <p className="bp-p" {...props}>
                    {children}
                  </p>
                );
              },
            }}
          >
            {blog.content}
          </ReactMarkdown>
        </div>
      </article>

      <style jsx global>{`
        /* ── Progress Bar ── */
        .bp-progress {
          position: fixed;
          top: 0;
          left: 0;
          height: 3px;
          background: #076eff;
          z-index: 100;
          transition: width 0.12s linear;
        }

        /* ── Article ── */
        .bp-article {
          max-width: 720px;
          margin: 0 auto;
          padding: 6.5rem 1.5rem 4rem;
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #1a1a1a;
          line-height: 1.8;
          font-size: 1.05rem;
        }

        /* ── Hero ── */
        .bp-hero {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
        }

        .bp-hero-img {
          width: 100%;
          height: auto;
          max-height: 400px;
          object-fit: cover;
          display: block;
        }

        /* ── Meta ── */
        .bp-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-top: 1.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .bp-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .bp-tag {
          background: #076eff0d;
          color: #076eff;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.3rem 0.8rem;
          border-radius: 6px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          border: 1px solid #076eff1a;
        }

        .bp-meta-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.82rem;
          color: #6b7280;
        }

        .bp-date,
        .bp-author {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* ── Title ── */
        .bp-title {
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          font-size: 2.4rem;
          font-weight: 700;
          line-height: 1.25;
          color: #0a0a0a;
          margin: 1.25rem 0 0.75rem;
          letter-spacing: -0.025em;
        }

        /* ── Description ── */
        .bp-description {
          font-size: 1.08rem;
          color: #555;
          line-height: 1.7;
          margin-bottom: 2rem;
          padding-left: 1rem;
          border-left: 3px solid #076eff;
        }

        /* ── Headings ── */
        .bp-h2 {
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          font-size: 1.55rem;
          font-weight: 650;
          color: #0a0a0a;
          margin: 2.75rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #076eff1a;
          letter-spacing: -0.01em;
        }

        /* ── Paragraphs ── */
        .bp-p {
          margin-bottom: 1.25rem;
          color: #333;
        }

        /* ── Lists ── */
        .bp-ul,
        .bp-ol {
          list-style: none;
          padding: 0;
          margin: 0.75rem 0 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .bp-li {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          background: #f9fafb;
          border: 1px solid #f0f0f0;
          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .bp-li:hover {
          background: #f0f7ff;
          border-color: #076eff1a;
        }

        .bp-li-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          margin-top: 2px;
          border-radius: 5px;
          background: #076eff;
          color: #fff;
        }

        .bp-li-icon svg {
          width: 12px;
          height: 12px;
        }

        .bp-li-text {
          flex: 1;
          color: #333;
          font-size: 1rem;
          line-height: 1.6;
        }

        /* Ordered list numbering */
        .bp-ol {
          counter-reset: bp-ol-counter;
        }

        .bp-ol .bp-li {
          counter-increment: bp-ol-counter;
        }

        .bp-ol .bp-li-icon svg {
          display: none;
        }

        .bp-ol .bp-li-icon::after {
          content: counter(bp-ol-counter);
          font-size: 0.72rem;
          font-weight: 700;
          color: #fff;
        }

        /* ── Blockquote ── */
        .bp-blockquote {
          margin: 1.75rem 0;
          padding: 1.15rem 1.25rem;
          border-left: 4px solid #076eff;
          background: #f7faff;
          border-radius: 0 8px 8px 0;
          color: #333;
          font-size: 1.05rem;
          line-height: 1.75;
        }

        .bp-blockquote p {
          margin: 0;
        }

        /* ── Links ── */
        .bp-link {
          color: #076eff;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: #076eff40;
          transition: text-decoration-color 0.2s ease;
        }

        .bp-link:hover {
          text-decoration-color: #076eff;
        }

        /* ── Divider ── */
        .bp-divider {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          margin: 2.25rem 0;
        }

        .bp-divider span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #d0d5dd;
        }

        .bp-divider span:nth-child(2) {
          background: #076eff;
          width: 6px;
          height: 6px;
        }

        /* ── Images ── */
        .bp-img-wrap {
          display: block;
          margin: 2rem 0;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #eee;
        }

        .bp-inline-img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* ── Strong ── */
        .bp-content strong {
          font-weight: 600;
          color: #0a0a0a;
        }

        /* ── Selection ── */
        .bp-article ::selection {
          background: #076eff20;
          color: #0a0a0a;
        }

        /* ── Empty state ── */
        .bp-empty {
          max-width: 720px;
          margin: 0 auto;
          padding: 8rem 1.5rem;
          text-align: center;
          color: #999;
        }

        /* ── Responsive: Tablet ── */
        @media (max-width: 768px) {
          .bp-article {
            padding: 6rem 1.25rem 3rem;
            font-size: 1rem;
          }

          .bp-title {
            font-size: 1.9rem;
          }

          .bp-h2 {
            font-size: 1.35rem;
          }

          .bp-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }

        /* ── Responsive: Mobile ── */
        @media (max-width: 480px) {
          .bp-article {
            padding: 5.5rem 1rem 2.5rem;
            font-size: 0.95rem;
          }

          .bp-title {
            font-size: 1.5rem;
            margin: 1rem 0 0.5rem;
          }

          .bp-h2 {
            font-size: 1.2rem;
            margin-top: 2rem;
          }

          .bp-description {
            font-size: 0.95rem;
          }

          .bp-hero {
            border-radius: 8px;
          }

          .bp-li {
            padding: 0.45rem 0.6rem;
            gap: 0.5rem;
          }

          .bp-li-icon {
            width: 20px;
            height: 20px;
          }

          .bp-li-icon svg {
            width: 10px;
            height: 10px;
          }

          .bp-li-text {
            font-size: 0.92rem;
          }

          .bp-blockquote {
            padding: 1rem;
            font-size: 0.95rem;
          }

          .bp-img-wrap {
            margin: 1.5rem 0;
            border-radius: 8px;
          }

          .bp-tag {
            font-size: 0.7rem;
            padding: 0.2rem 0.6rem;
          }
        }
      `}</style>
    </>
  );
};

export default BlogPost;
