import { incubationReferencePages } from "./incubation-data";

export const referenceCategories = [
  {
    label: "Portal Overview",
    pages: ["introduction", "ecosystem-architecture"],
  },
  {
    label: "Incubation Portal",
    pages: [
      "incubation-overview",
      "incubation-user-role-management",
      "incubation-program-creation",
      "incubation-program-management",
      "incubation-evaluation-panel",
      "incubation-startup-management",
      "incubation-office-space",
      "incubation-facility-management",
      "incubation-funding",
      "incubation-announcements",
      "incubation-task-management",
      "incubation-mentor-management",
      "incubation-billing-notifications",
      "incubation-public-repository",
    ],
  },
  {
    label: "Startup Portal",
    pages: [
      "startup-profile",
      "applications",
      "networking",
    ],
  },
  {
    label: "Mentor Portal",
    pages: [
      "mentorship-marketplace",
      "session-scheduling",
    ],
  },
  {
    label: "EcoSync Platform",
    pages: [
      "startup-discovery",
      "investment-opportunities",
      "talent-marketplace",
      "project-collaboration",
    ],
  },
];

const coreReferencePages = [
  {
    slug: "introduction",
    title: "Introduction",
    category: "Portal Overview",
    description:
      "Welcome to the EcoSync platform documentation. This guide provides a comprehensive overview of all portals, user roles, and platform capabilities.",
    learn: [
      "What EcoSync is and how it works",
      "The two distinct product experiences",
      "How user roles determine access",
      "How portals connect to each other",
    ],
    sections: [
      {
        heading: "What is EcoSync?",
        content:
          "EcoSync is a comprehensive startup ecosystem platform that connects startups, mentors, investors, VC firms, freelancers, incubators, and professionals in a unified digital environment. It operates as two distinct products sharing a common backend and database.",
      },
      {
        heading: "Product A: Ecosystem Platform (ecosync.network)",
        content:
          "The Ecosystem Platform is a single, integrated platform where all user types coexist. Think of it as LinkedIn meets AngelList for the startup ecosystem. It features social networking, job board, events, communities, mentorship marketplace, networking/discovery, messaging, and workspace access to the Startup Portal and Mentor Portal.",
      },
      {
        heading: "Product B: Incubation Portal (ecosync.co)",
        content:
          "The Incubation Portal is a multi-tenant SaaS product for incubators and accelerators. Each incubator gets their own white-labeled portal with a custom subdomain. Features include program management, startup pipeline, evaluation panels, office/facility management, funding disbursement, task management, mentor management, and announcements.",
      },
      {
        heading: "User Roles",
        list: [
          "Student — looking for internships and career opportunities",
          "Professional — working professionals seeking networking and jobs",
          "Freelancer — independent contractors managing gigs and projects",
          "Founder — startup founders building and growing their companies",
          "Mentor — experienced professionals offering structured mentorship",
          "Investor — angel investors managing deal flow and portfolios",
          "VC Partner — venture capital firm partners and analysts",
          "Incubation Person — staff members at incubators and accelerators",
        ],
      },
      {
        heading: "Key Principles",
        list: [
          "Users can hold multiple roles simultaneously",
          "The ecosystem platform uses standard JWT authentication",
          "The incubation portal uses multi-tenant architecture with isolated data",
          "Both products share a common backend and database",
          "All payments are processed through Razorpay",
          "Real-time features are powered by Socket.IO",
        ],
      },
    ],
  },
  {
    slug: "ecosystem-architecture",
    title: "Ecosystem Architecture",
    category: "Portal Overview",
    description:
      "Understand the technical and organizational architecture behind EcoSync, including API structure, multi-tenancy model, and authentication flows.",
    learn: [
      "How the API is structured by portal context",
      "How multi-tenancy works for incubation portals",
      "Authentication requirements for each product",
      "How Redis caching improves performance",
    ],
    sections: [
      {
        heading: "API Structure",
        content:
          "The backend organizes endpoints by portal context to ensure clean separation of concerns and security boundaries between products.",
        list: [
          "/api/ecosystem/* — Ecosystem Platform APIs (social, jobs, events, communities, mentorship)",
          "/api/incubation/* — Incubation admin onboarding and subscription APIs",
          "/api/incubation-portal/* — Incubation Portal feature APIs (requires tenantKey header)",
          "/api/startup-portal/* — Startup-side view of incubation features",
          "/api/mentor/* — Mentor's own management portal",
          "/api/super-admin/* — EcoSync internal admin",
        ],
      },
      {
        heading: "Multi-Tenancy Model",
        content:
          "Each incubator is a Tenant with a unique tenantKey used as their subdomain. Tenant data is completely isolated — one incubator cannot see another's data. Redis caching with a 24-hour TTL is used for efficient tenant lookups.",
        list: [
          "Unique tenantKey (subdomain: {tenantKey}.admin.ecosync.co.in)",
          "Optional custom domain support",
          "Status management: ACTIVE, INACTIVE, SUSPENDED",
          "Own subscription plan, users, roles, programs, offices, and data",
          "Redis caching for 24-hour tenant lookup TTL",
        ],
      },
      {
        heading: "Authentication",
        content:
          "Incubation portal authentication requires both a valid tenantKey in the request header and a valid JWT token. The ecosystem platform uses standard JWT with optional OAuth providers.",
        list: [
          "Email/password login",
          "Google, Facebook, and Apple OAuth",
          "JWT access tokens with refresh token support",
          "Cookie-based token storage",
          "OTP-based email verification on registration",
        ],
      },
      {
        heading: "Real-Time Infrastructure",
        list: [
          "Chat Socket — real-time messaging for tenant-admin chat",
          "Universal Chat Socket — real-time messaging for ecosystem chat",
          "Notification Socket — real-time push notifications",
          "Event Live Socket — real-time event streaming",
        ],
      },
    ],
  },
  {
    slug: "startup-profile",
    title: "Startup Profile",
    category: "Startup Portal",
    description:
      "The Startup Profile is the central identity of a startup on the EcoSync platform. It connects to investor discovery, incubation applications, mentor booking, and the social feed.",
    learn: [
      "How to create and manage a startup page",
      "What information a startup profile contains",
      "How team roles work within a startup",
      "How to track milestones and funding rounds",
    ],
    sections: [
      {
        heading: "Overview",
        content:
          "Each startup has an Organization Page on the ecosystem platform. This page is the public-facing identity of the startup and connects to all platform features including job postings, events, investor updates, and incubation applications.",
      },
      {
        heading: "Key Features",
        list: [
          "Startup profile creation with mission, vision, and elevator pitch",
          "Pitch deck management with version history",
          "Funding round tracking",
          "Milestone tracking (product, funding, growth, team)",
          "Investor update posts (quarterly)",
          "Startup metrics recording",
          "Team member management with roles",
          "Office space ownership and booking",
        ],
      },
      {
        heading: "Team Roles",
        content:
          "Startup team members are assigned roles that determine their level of access within the startup's portal and settings.",
        list: [
          "Owner — full control, can manage all startup settings",
          "Admin — administrative access, can manage team and applications",
          "Member — standard access, can view and contribute",
          "Other — custom role with specific permissions",
        ],
      },
      {
        heading: "Verification Status",
        content:
          "Startup pages go through a verification process to build trust with investors and the wider ecosystem.",
        list: [
          "NOT_STARTED — verification not yet initiated",
          "PENDING — verification request submitted",
          "VERIFIED — startup identity confirmed",
          "REJECTED — verification not approved",
        ],
      },
    ],
  },
  {
    slug: "applications",
    title: "Applications",
    category: "Startup Portal",
    description:
      "Startups can discover and apply to incubation programs directly from the ecosystem platform. Applications follow a structured workflow with document requests, change requests, and panel evaluations.",
    learn: [
      "How to discover and apply to incubation programs",
      "The full application lifecycle and status flow",
      "How to respond to change and document requests",
      "How panel evaluations work",
    ],
    sections: [
      {
        heading: "Application Workflow",
        content:
          "The application process is a multi-stage workflow managed jointly between the startup and the incubation team.",
        list: [
          "Startup discovers program via ecosystem or direct link",
          "Startup fills application and answers scheme questions",
          "Incubation admin reviews the application",
          "Admin may request changes or additional documents",
          "Application moves through evaluation stages",
          "Panel members score the application",
          "Startup is onboarded or rejected",
        ],
      },
      {
        heading: "Application Status Flow",
        list: [
          "NEW — application submitted",
          "CHANGES_REQUESTED — admin requests modifications",
          "CHANGES_RECEIVED — startup responded to changes",
          "REVIEWED — admin has reviewed the application",
          "UNDER_EVALUATION — panel evaluation in progress",
          "EVALUATED — panel scoring complete",
          "DOCS_REQUESTED — additional documents required",
          "DOCS_RECEIVED — documents submitted",
          "VERIFIED — application verified",
          "ONBOARDED — startup accepted into program",
          "REJECTED — application not approved",
        ],
      },
      {
        heading: "Change Requests",
        content:
          "Incubation admins can request modifications to an application. Startups receive a notification and must respond before the application can proceed.",
        list: [
          "GENERAL — general information update required",
          "FILE — specific file replacement required",
          "QUESTION — answer to a specific question needs revision",
        ],
      },
      {
        heading: "Document Requests",
        content:
          "Admins can request additional supporting documents at any stage of the application. Startups upload documents through the portal and the application status updates automatically.",
      },
    ],
  },
  {
    slug: "networking",
    title: "Networking",
    category: "Startup Portal",
    description:
      "The networking module provides intelligent discovery and connection tools for startups to find co-founders, investors, mentors, and other ecosystem participants.",
    learn: [
      "How startup discovery works in the ecosystem",
      "How to connect with investors and mentors",
      "How co-founder matching works",
      "How the scoring algorithm ranks results",
    ],
    sections: [
      {
        heading: "Discovery Categories",
        list: [
          "People — discover professionals, founders, mentors, and investors",
          "Startups — discover startup companies by stage and sector",
          "Incubators — discover incubation centers and their open programs",
          "Pages — discover organization pages (companies, institutions, VCs)",
        ],
      },
      {
        heading: "Co-Founder Matching",
        content:
          "Startups looking for co-founders can set their preferences and be matched with compatible candidates based on skills, commitment level, location, and equity expectations.",
        list: [
          "Skills needed in a co-founder",
          "Commitment level (full-time, part-time)",
          "Location preference and remote options",
          "Equity split expectations",
        ],
      },
      {
        heading: "Connection Types",
        list: [
          "Follow — asymmetric relationship, any user can follow another",
          "Connection — symmetric relationship requiring mutual acceptance",
          "Block — prevents interaction and content visibility",
          "Mute — hides content from feed without notification",
        ],
      },
      {
        heading: "Discovery Scoring",
        content:
          "The discovery system uses a weighted scoring algorithm to rank and recommend results based on multiple signals.",
        list: [
          "Profile completeness",
          "Mutual connections count",
          "Shared interests and skills",
          "Activity level and recency",
          "Location proximity",
          "Role compatibility",
        ],
      },
    ],
  },
  {
    slug: "mentorship-marketplace",
    title: "Mentorship Marketplace",
    category: "Mentor Portal",
    description:
      "The Mentorship Marketplace connects startups and professionals with experienced mentors for structured guidance, session booking, and long-term mentorship relationships.",
    learn: [
      "How to discover and filter mentors",
      "How session booking and payment works",
      "How mentor packages and subscriptions work",
      "How long-term mentorship relationships are managed",
    ],
    sections: [
      {
        heading: "Overview",
        content:
          "Users can browse mentors with filters for expertise, industry, price range, and rating. Featured and recommended mentors are surfaced based on your profile and goals.",
      },
      {
        heading: "Mentor Profile",
        list: [
          "Professional background and expertise areas",
          "Industries served and startup stages",
          "Session types with pricing (e.g., Career Guidance — 30min — $50)",
          "Availability calendar",
          "Reviews and ratings from past mentees",
          "Success stories and mentoring approach",
          "Session packages for subscription-based access",
        ],
      },
      {
        heading: "Session Booking",
        list: [
          "Select a session type and duration",
          "Pick an available time slot from the calendar",
          "Pay via Razorpay",
          "Track session status: PENDING, CONFIRMED, COMPLETED",
          "Cancel or reschedule within policy windows",
          "Submit post-session review",
        ],
      },
      {
        heading: "Mentor Packages",
        content:
          "Mentors can offer session bundles at discounted rates. Subscribers get priority booking and dedicated chat access.",
        list: [
          "BASIC — entry-level package with core sessions",
          "STANDARD — mid-tier with additional features",
          "PREMIUM — full access with priority support",
        ],
      },
      {
        heading: "Long-Term Mentorship",
        content:
          "Beyond individual sessions, users can request ongoing mentorship relationships with milestone tracking, shared goals, and a dedicated chat channel.",
        list: [
          "ONE_TIME — single engagement",
          "SHORT_TERM — a few weeks of structured guidance",
          "LONG_TERM — months-long relationship with formal milestones",
          "ONGOING — continuous relationship without fixed end date",
        ],
      },
    ],
  },
  {
    slug: "session-scheduling",
    title: "Session Scheduling",
    category: "Mentor Portal",
    description:
      "Mentors configure their availability and booking settings to ensure smooth session scheduling for both mentors and mentees.",
    learn: [
      "How mentors set their weekly availability",
      "How booking settings control scheduling behavior",
      "How video sessions work via Jitsi",
      "How session extensions and no-shows are handled",
    ],
    sections: [
      {
        heading: "Availability Configuration",
        content:
          "Mentors set their recurring weekly availability by specifying start and end times per day of the week. Multiple slots per day are supported.",
        list: [
          "Day-of-week based recurring availability",
          "Multiple time slots per day",
          "Active/inactive toggle per slot",
          "Quick availability update option",
          "Calendar view for overview",
        ],
      },
      {
        heading: "Booking Settings",
        list: [
          "Minimum booking notice — default 24 hours",
          "Maximum bookings per day",
          "Auto-confirm toggle — default requires manual confirmation",
          "Buffer time between sessions — default 15 minutes",
          "Free cancellation window — default 24 hours",
        ],
      },
      {
        heading: "Video Sessions",
        content:
          "All sessions are conducted via Jitsi-based video conferencing. Each session gets an auto-generated meeting room and URL.",
        list: [
          "Auto-generated meeting room URL",
          "Recording support (premium feature)",
          "Recording consent tracking",
          "Session recording management and access",
        ],
      },
      {
        heading: "Session Actions",
        list: [
          "Confirm or decline pending sessions",
          "Cancel sessions as mentor or mentee",
          "Reschedule with updated time slot",
          "Add pre-session and post-session notes",
          "Track action items from sessions",
          "Extend session duration up to 30 minutes",
          "Mark no-shows",
          "Submit mutual reviews after completion",
        ],
      },
    ],
  },
  {
    slug: "startup-discovery",
    title: "Startup Discovery",
    category: "EcoSync Platform",
    description:
      "Investors use the discovery tools to find, evaluate, and add startups to their deal flow pipeline across all funding stages and sectors.",
    learn: [
      "How investors discover startups on the ecosystem",
      "How to add startups to the deal flow pipeline",
      "How deal activities and documents are tracked",
      "How the pipeline stages work",
    ],
    sections: [
      {
        heading: "Overview",
        content:
          "The Investor Portal surfaces startup profiles from across the ecosystem with rich filtering by stage, sector, geography, and funding ask. Investors can save profiles and initiate conversations directly.",
      },
      {
        heading: "Deal Flow Pipeline",
        list: [
          "SOURCED — startup identified as a potential investment",
          "SCREENING — initial review and qualification",
          "DUE_DILIGENCE — detailed investigation in progress",
          "IC_REVIEW — investment committee review",
          "TERM_SHEET — offer terms being drafted",
          "NEGOTIATION — terms being discussed",
          "INVESTED — deal closed successfully",
          "PASSED — investment declined at any stage",
        ],
      },
      {
        heading: "Deal Tracking",
        content:
          "Each deal in the pipeline captures structured information to support decision-making across the investment team.",
        list: [
          "Startup name, logo, sector, and funding stage",
          "Investment ask amount",
          "Source of the deal and assigned team members",
          "Scoring and priority level (LOW, MEDIUM, HIGH, CRITICAL)",
          "Follow-up dates and next action",
          "Pass or invest date with reason",
        ],
      },
      {
        heading: "Deal Activities",
        list: [
          "Notes — general, due diligence, IC meeting, term sheet, legal",
          "Meetings — intro call, pitch, follow-up, IC meeting, board meeting",
          "Documents — pitch deck, term sheet, due diligence, legal, financial",
        ],
      },
    ],
  },
  {
    slug: "investment-opportunities",
    title: "Investment Opportunities",
    category: "EcoSync Platform",
    description:
      "Manage portfolio investments, co-invest via syndicates, and track performance across all active and exited positions.",
    learn: [
      "How to track and manage portfolio companies",
      "How investment syndicates work",
      "How exit tracking and IRR calculation works",
      "How VC firm features differ from individual investors",
    ],
    sections: [
      {
        heading: "Portfolio Management",
        content:
          "Investors track all their investments through a centralized portfolio view with valuation, ownership, and board seat information.",
        list: [
          "Startup name, investment amount, and date",
          "Ownership percentage",
          "Board seat tracking",
          "Current valuation",
          "Status: ACTIVE, EXITED, WRITTEN_OFF",
          "Exit tracking with date, amount, type, IRR, and multiple",
        ],
      },
      {
        heading: "Investment Syndicates",
        content:
          "Investors can create or join syndicates to co-invest in startups with other angel investors. Each syndicate has a defined target, minimum check, and closing date.",
        list: [
          "Target amount and amount raised",
          "Closing date and investment terms",
          "Minimum and maximum investment per member",
          "Member commitment and payment tracking",
          "Status: OPEN, CLOSED, INVESTING, FULLY_DEPLOYED, LIQUIDATING",
        ],
      },
      {
        heading: "VC Firm Features",
        content:
          "VC partners have additional capabilities for managing funds, LPs, and multi-member teams with granular permissions.",
        list: [
          "Multiple funds per firm with vintage year and AUM",
          "LP tracking and management",
          "Team roles: Managing Partner, Partner, Principal, VP, Associate, Analyst",
          "IC voting rights and term approval authority",
          "Fund status: FUNDRAISING, INVESTING, FULLY_DEPLOYED, HARVESTING, LIQUIDATED",
        ],
      },
    ],
  },
  {
    slug: "talent-marketplace",
    title: "Talent Marketplace",
    category: "EcoSync Platform",
    description:
      "The Talent Marketplace allows startups and companies to discover and engage freelancers for short-term gigs, project-based work, or ongoing retainers.",
    learn: [
      "How freelancer profiles are structured",
      "How gig requests are sent and negotiated",
      "How counter-offers work",
      "How accepted requests become projects",
    ],
    sections: [
      {
        heading: "Freelancer Profile",
        list: [
          "Title, tagline, and hourly rate",
          "Availability status: AVAILABLE, BUSY, NOT_AVAILABLE",
          "Experience level and portfolio links",
          "Skill categories and languages",
          "Timezone and remote preferences",
          "Ratings, review count, and project statistics",
        ],
      },
      {
        heading: "Gig Requests",
        content:
          "Startups send gig requests directly to freelancers. Each request includes project details, budget, and timeline.",
        list: [
          "Project title, description, and required skills",
          "Budget range (min/max)",
          "Proposed timeline",
          "Freelancer can accept, counter-offer, or decline",
        ],
      },
      {
        heading: "Counter-Offers",
        content:
          "Freelancers can propose modified terms if the original request doesn't fit their availability or rate expectations.",
        list: [
          "Modified budget range",
          "Revised timeline",
          "Notes explaining the counter-offer",
          "Client can accept or decline the counter",
        ],
      },
      {
        heading: "Project Conversion",
        content:
          "Once a gig request is accepted, it is automatically converted into a full project record with milestone tracking, contract management, and payment processing.",
      },
    ],
  },
  {
    slug: "project-collaboration",
    title: "Project Collaboration",
    category: "EcoSync Platform",
    description:
      "After a gig is accepted, freelancers and clients collaborate through structured project management tools including milestones, contracts, and payment tracking.",
    learn: [
      "How projects are structured and tracked",
      "How milestone-based delivery works",
      "How contracts are created and signed",
      "How earnings and payouts are managed",
    ],
    sections: [
      {
        heading: "Project Structure",
        list: [
          "Client types: STARTUP, COMPANY, INDIVIDUAL",
          "Payment types: FIXED, HOURLY, MILESTONE_BASED, RETAINER",
          "Progress tracking from 0% to 100%",
          "File attachments and deliverable uploads",
        ],
      },
      {
        heading: "Milestone Delivery",
        content:
          "Projects can be broken into milestones with individual amounts, due dates, and status flows.",
        list: [
          "PENDING — milestone not yet started",
          "IN_PROGRESS — work underway",
          "SUBMITTED — freelancer has submitted deliverable",
          "REVISION — client requested changes",
          "APPROVED — client accepted the deliverable",
          "PAID — payment released for this milestone",
        ],
      },
      {
        heading: "Contracts",
        content:
          "Formal contracts define the scope, deliverables, and terms of the engagement. Both parties must sign before work begins.",
        list: [
          "DRAFT — being prepared",
          "PENDING_SIGNATURES — awaiting both parties",
          "ACTIVE — signed and work in progress",
          "COMPLETED — project finished",
          "TERMINATED — ended early",
          "DISPUTED — under conflict resolution",
        ],
      },
      {
        heading: "Earnings and Payouts",
        list: [
          "Per-project earning tracking",
          "Platform fee deduction (15%)",
          "GST and TDS calculation",
          "Razorpay payment integration",
          "Invoice generation per milestone or project",
          "Bank account or UPI payout accounts",
          "Withdrawal status: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED",
        ],
      },
    ],
  },
];

export const referencePages = [...coreReferencePages, ...incubationReferencePages];

export function getPageBySlug(slug: string) {
  return referencePages.find((p) => p.slug === slug) || null;
}

export function getDefaultSlug() {
  return referencePages[0]?.slug || "introduction";
}
