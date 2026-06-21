export const mentorReferencePages = [
  {
    slug: "mentor-overview",
    title: "Mentor Portal Overview",
    category: "Mentor Portal",
    description:
      "The Mentor Portal is a comprehensive workspace for mentors to manage their mentoring practice, configure availability, conduct sessions, track earnings, and build their reputation within the EcoSync ecosystem.",
    learn: [
      "What the Mentor Portal offers and who it serves",
      "How mentors connect with startups and professionals",
      "How the portal integrates with incubation programs",
      "How earnings and reputation systems work",
    ],
    sections: [
      {
        heading: "What is the Mentor Portal?",
        content:
          "The Mentor Portal is a dedicated workspace accessible from the EcoSync ecosystem platform. It equips mentors with tools to manage their entire mentoring practice — from setting up session types and availability to conducting video sessions, managing packages, and tracking earnings. Mentors can serve individual mentees, startup teams, and incubation programs through a single unified interface.",
      },
      {
        heading: "Core Capabilities",
        list: [
          "Professional profile management with expertise areas and credentials",
          "Configurable session types with custom pricing and durations",
          "Weekly availability scheduling with flexible time-slot management",
          "Session booking, confirmation, and lifecycle management",
          "Jitsi-powered video conferencing with recording capabilities",
          "Session packages and subscription offerings for recurring mentees",
          "Structured mentorship programs with milestone tracking",
          "Incubator association management for institutional mentoring",
          "Comprehensive earnings tracking with payout management",
          "Dashboard analytics for sessions, ratings, and growth metrics",
          "Announcement reception from associated incubators",
        ],
      },
      {
        heading: "Mentor Visibility",
        content:
          "Mentors control their public visibility in the marketplace. When public, their profile appears in the mentorship marketplace for ecosystem users to discover and book sessions.",
        list: [
          "PUBLIC — profile visible in marketplace and searchable",
          "PRIVATE — profile hidden from marketplace, accessible only via direct link",
          "Visibility toggle available at any time from settings",
          "Private mentors can still accept bookings from existing mentees",
        ],
      },
      {
        heading: "Revenue Streams",
        content:
          "Mentors can earn through multiple channels within the EcoSync ecosystem, each with its own payment and tracking system.",
        list: [
          "Individual session fees — per-session payments from mentees",
          "Package subscriptions — recurring revenue from session bundles",
          "Incubator associations — contracted mentoring for incubation programs",
          "Mentorship programs — structured long-term engagements",
        ],
      },
    ],
  },
  {
    slug: "mentor-profile-management",
    title: "Profile Management",
    category: "Mentor Portal",
    description:
      "Build and maintain a professional mentor profile that showcases your expertise, experience, and mentoring approach to attract the right mentees.",
    learn: [
      "How to create a compelling mentor profile",
      "What information mentees see when discovering mentors",
      "How profile statistics and reviews build credibility",
      "How to update and manage profile visibility",
    ],
    sections: [
      {
        heading: "Profile Setup",
        content:
          "Creating a mentor profile involves defining your professional identity, areas of expertise, and the value you bring to mentees. A complete profile significantly improves discoverability in the marketplace.",
        list: [
          "Professional headline and tagline for quick identification",
          "Detailed bio describing background, philosophy, and approach",
          "Areas of expertise with category tagging",
          "Industries served and startup stages supported",
          "Years of experience and relevant credentials",
          "Languages spoken for global mentoring",
          "Timezone setting for scheduling accuracy",
          "Profile photo and optional banner image",
        ],
      },
      {
        heading: "Expertise Categories",
        content:
          "Mentors select from predefined expertise categories that help mentees find the right fit. Multiple categories can be selected to represent diverse skill sets.",
        list: [
          "Strategy & Business Model",
          "Product Development & Management",
          "Fundraising & Investor Relations",
          "Marketing & Growth",
          "Technology & Engineering",
          "Finance & Operations",
          "Legal & Compliance",
          "Sales & Business Development",
          "Leadership & Team Building",
          "Industry-Specific Domain Expertise",
        ],
      },
      {
        heading: "Profile Statistics",
        content:
          "The portal automatically calculates and displays metrics that demonstrate your track record and build trust with potential mentees.",
        list: [
          "Total sessions completed",
          "Total hours of mentoring delivered",
          "Number of unique mentees served",
          "Average rating from session reviews",
          "Total review count",
          "Response time to booking requests",
          "Session completion rate",
          "Repeat mentee percentage",
        ],
      },
      {
        heading: "Profile Updates",
        content:
          "Mentors can update their profile at any time. Changes to visibility, pricing, or session types take effect immediately for new bookings without affecting existing confirmed sessions.",
      },
    ],
  },
  {
    slug: "mentor-session-types",
    title: "Session Types & Pricing",
    category: "Mentor Portal",
    description:
      "Define the types of mentoring sessions you offer with custom pricing, durations, and descriptions. Enable or disable session types based on your current availability.",
    learn: [
      "How to create and configure session types",
      "How pricing and duration settings work",
      "How to enable and disable session types",
      "How session types appear to potential mentees",
    ],
    sections: [
      {
        heading: "Creating Session Types",
        content:
          "Session types define the different mentoring offerings available to mentees. Each type has its own price, duration, and description that clearly communicates what the mentee will receive.",
        list: [
          "Title — clear name describing the session focus (e.g., 'Product Strategy Review')",
          "Description — detailed explanation of what the session covers",
          "Duration — session length in minutes (15, 30, 45, 60, 90, 120)",
          "Price — amount charged per session in the configured currency",
          "Category — maps to expertise area for discovery filtering",
          "Maximum attendees — individual (1) or group session capacity",
        ],
      },
      {
        heading: "Session Type Management",
        list: [
          "Create unlimited session types for different expertise areas",
          "Edit pricing and descriptions at any time",
          "Enable or disable individual session types without deletion",
          "Disabled types are hidden from the marketplace but preserved in history",
          "Reorder session types to control display priority on profile",
          "View booking statistics per session type",
        ],
      },
      {
        heading: "Pricing Strategy",
        content:
          "Mentors have full control over pricing. Common patterns include tiered pricing by session length, introductory rates for first-time mentees, and premium pricing for specialized expertise areas.",
        list: [
          "Set prices in INR with flexible amount entry",
          "Different prices per session type and duration",
          "Free sessions supported for introductory calls or community giving",
          "Price changes apply only to new bookings",
          "Package discounts offered separately through the packages feature",
        ],
      },
      {
        heading: "Session Type Examples",
        list: [
          "Quick Chat — 15 minutes — free introductory call",
          "Career Guidance — 30 minutes — general career advice",
          "Product Strategy — 60 minutes — deep-dive product review",
          "Fundraising Prep — 60 minutes — pitch deck and strategy",
          "Technical Architecture — 90 minutes — system design session",
          "Leadership Coaching — 45 minutes — team and culture guidance",
        ],
      },
    ],
  },
  {
    slug: "mentor-availability",
    title: "Availability & Scheduling",
    category: "Mentor Portal",
    description:
      "Configure your weekly availability with flexible time slots, buffer times, and booking policies to ensure smooth scheduling for both you and your mentees.",
    learn: [
      "How to set up recurring weekly availability",
      "How booking settings control scheduling behavior",
      "How buffer times prevent back-to-back exhaustion",
      "How the calendar view provides scheduling overview",
    ],
    sections: [
      {
        heading: "Weekly Availability",
        content:
          "Mentors define their recurring weekly availability by specifying time ranges for each day of the week. The system uses these settings to show available slots to mentees during the booking process.",
        list: [
          "Set available hours per day of the week (Monday through Sunday)",
          "Support for multiple non-contiguous time blocks per day",
          "Individual toggle to activate or deactivate each time slot",
          "Quick availability update for temporary schedule changes",
          "Time displayed in mentor's configured timezone",
          "Automatic timezone conversion for mentees in different regions",
        ],
      },
      {
        heading: "Booking Policies",
        content:
          "Booking policies define the rules that govern how and when mentees can book sessions. These settings balance mentor control with mentee flexibility.",
        list: [
          "Minimum booking notice — how far in advance sessions must be booked (default: 24 hours)",
          "Maximum bookings per day — prevent over-scheduling (configurable limit)",
          "Auto-confirm toggle — instantly confirm bookings or require manual review",
          "Buffer time between sessions — rest period between consecutive sessions (default: 15 minutes)",
          "Free cancellation window — time before session when free cancellation is allowed (default: 24 hours)",
          "Maximum advance booking — how far into the future bookings can be made",
        ],
      },
      {
        heading: "Calendar View",
        content:
          "The calendar provides a visual overview of all scheduled sessions, available slots, and blocked time across the week and month views.",
        list: [
          "Weekly and monthly calendar visualization",
          "Color-coded events: confirmed, pending, completed, cancelled",
          "Quick view of daily session count and earnings",
          "Click to view session details or manage bookings",
          "Export calendar for sync with external tools",
        ],
      },
      {
        heading: "Schedule Exceptions",
        content:
          "For vacation days, holidays, or temporary unavailability, mentors can block specific dates without modifying their recurring weekly schedule.",
        list: [
          "Block individual dates or date ranges",
          "Existing confirmed sessions on blocked dates are preserved",
          "New bookings prevented on blocked dates",
          "Recurring schedule resumes automatically after blocked period",
        ],
      },
    ],
  },
  {
    slug: "mentor-session-management",
    title: "Session Management",
    category: "Mentor Portal",
    description:
      "Manage the complete session lifecycle from booking confirmation through completion. Handle confirmations, cancellations, rescheduling, notes, and post-session reviews.",
    learn: [
      "How to confirm or decline incoming session requests",
      "How cancellation and rescheduling policies work",
      "How to add session notes and action items",
      "How the review system works after session completion",
    ],
    sections: [
      {
        heading: "Session Lifecycle",
        content:
          "Every session follows a defined lifecycle from the moment a mentee books until completion and review. Mentors manage each stage through the portal dashboard.",
        list: [
          "PENDING — mentee has booked, awaiting mentor confirmation",
          "CONFIRMED — mentor has accepted, session is scheduled",
          "IN_PROGRESS — session is currently active (video call started)",
          "COMPLETED — session finished, both parties can leave reviews",
          "CANCELLED — cancelled by either party within policy terms",
          "RESCHEDULED — moved to a new time slot by mutual agreement",
          "NO_SHOW — mentee did not join within the grace period",
        ],
      },
      {
        heading: "Confirmation & Decline",
        content:
          "When auto-confirm is disabled, mentors receive booking requests that require manual confirmation. A prompt response improves your profile metrics.",
        list: [
          "View pending session requests with mentee details",
          "See the mentee's profile, startup, and session topic",
          "Confirm to lock in the session time slot",
          "Decline with an optional reason (not shared publicly)",
          "Confirmation sends automatic calendar invite to both parties",
          "Unconfirmed sessions expire after the configured timeout",
        ],
      },
      {
        heading: "Cancellation & Rescheduling",
        list: [
          "Cancel a confirmed session with a reason",
          "Free cancellation available within the defined policy window",
          "Late cancellations may affect mentor reputation metrics",
          "Rescheduling proposes a new time — mentee must accept",
          "Both mentor and mentee can initiate rescheduling",
          "Maximum reschedule count before auto-cancellation",
          "Refund processed automatically for mentor-initiated cancellations",
        ],
      },
      {
        heading: "Session Notes",
        content:
          "Mentors can add notes before and after sessions. Pre-session notes help prepare for the discussion, while post-session notes capture outcomes and next steps.",
        list: [
          "Pre-session notes — preparation and agenda items",
          "Post-session notes — outcomes, recommendations, and observations",
          "Action items — trackable to-do items for the mentee",
          "Notes are visible to both mentor and mentee",
          "Rich text formatting for structured notes",
          "Attachment support for reference materials",
        ],
      },
      {
        heading: "Reviews & Ratings",
        content:
          "After session completion, both parties can submit ratings and reviews. Reviews are a critical part of the mentor's marketplace reputation.",
        list: [
          "5-star rating scale for overall session quality",
          "Written review with feedback on the experience",
          "Reviews visible on mentor profile after submission",
          "Mentors can respond to reviews publicly",
          "Average rating calculated across all completed sessions",
          "Review submission window closes after 14 days",
        ],
      },
    ],
  },
  {
    slug: "mentor-video-sessions",
    title: "Video Sessions",
    category: "Mentor Portal",
    description:
      "Conduct mentoring sessions via Jitsi-powered video conferencing with recording support, session timers, and in-call management tools.",
    learn: [
      "How video sessions are initiated and joined",
      "How session recording works",
      "How session duration and extensions are managed",
      "How no-show handling protects mentor time",
    ],
    sections: [
      {
        heading: "Video Infrastructure",
        content:
          "All mentoring sessions are conducted via Jitsi-based video conferencing integrated directly into the portal. Each confirmed session automatically generates a unique meeting room that both parties access through the portal interface.",
        list: [
          "Auto-generated unique meeting room per session",
          "Direct join from the portal dashboard — no external links needed",
          "HD video and audio with adaptive quality",
          "Screen sharing for presentations and demos",
          "Chat sidebar for sharing links and notes during calls",
          "No software installation required — browser-based",
        ],
      },
      {
        heading: "Starting a Session",
        list: [
          "Join button activates 5 minutes before scheduled start",
          "Mentor initiates the room — mentee joins once mentor is present",
          "Session timer starts automatically upon mentee joining",
          "Late join grace period: 10 minutes before session marked as no-show",
          "Audio/video preview before entering the room",
          "Quick check of internet connection quality",
        ],
      },
      {
        heading: "Recording",
        content:
          "Sessions can be recorded for future reference. Recording requires explicit consent from both parties and is managed by the mentor within the call.",
        list: [
          "Recording initiation requires mentor action",
          "Consent tracking — both parties must agree before recording starts",
          "Visual indicator shows when recording is active",
          "Stop recording at any time during the session",
          "Recordings stored securely and accessible from session history",
          "List all recordings with date, duration, and session context",
          "Download recordings for offline access",
        ],
      },
      {
        heading: "Session Extensions",
        content:
          "If a session needs more time, mentors can extend the duration up to 30 additional minutes beyond the booked slot, provided no conflicting session follows.",
        list: [
          "Extend button available during active sessions",
          "Extension up to 30 minutes in 15-minute increments",
          "Conflict check against next scheduled session",
          "Extension duration tracked separately in session records",
          "No additional charge for extensions (at mentor's discretion)",
        ],
      },
      {
        heading: "No-Show Handling",
        content:
          "If a mentee does not join within the grace period, the mentor can mark the session as a no-show. This protects the mentor's time and triggers the appropriate refund or fee policies.",
        list: [
          "10-minute grace period after scheduled start time",
          "Mark no-show button becomes available after grace period",
          "No-show sessions count toward mentor's completed session metrics",
          "Mentee may be charged a no-show fee per platform policy",
          "No-show history tracked on mentee's profile",
        ],
      },
    ],
  },
  {
    slug: "mentor-packages",
    title: "Packages & Subscriptions",
    category: "Mentor Portal",
    description:
      "Create session packages that offer mentees discounted bundles of sessions. Manage subscribers, track usage, and provide premium access to regular mentees.",
    learn: [
      "How to create and price session packages",
      "How subscription activation and renewal works",
      "How to track subscriber usage and engagement",
      "How packages differ from individual session bookings",
    ],
    sections: [
      {
        heading: "Creating Packages",
        content:
          "Packages bundle multiple sessions at a discounted rate, encouraging mentees to commit to ongoing mentorship. Each package defines the number of sessions, validity period, and included benefits.",
        list: [
          "Package name and detailed description",
          "Number of sessions included in the bundle",
          "Total package price (typically discounted vs individual booking)",
          "Validity period — time window to use all included sessions",
          "Included session types — which of your session types are covered",
          "Additional benefits: priority booking, chat access, resource library",
          "Package tier designation: BASIC, STANDARD, PREMIUM",
        ],
      },
      {
        heading: "Package Management",
        list: [
          "Create, edit, and delete packages at any time",
          "Enable or disable packages without deletion",
          "Set maximum subscriber limits per package",
          "View package performance: purchases, renewals, churn",
          "Adjust pricing — changes apply only to new subscribers",
          "Archive packages that are no longer offered",
        ],
      },
      {
        heading: "Subscriber Tracking",
        content:
          "Track who has subscribed to your packages, their session usage, and engagement patterns to optimize your offerings.",
        list: [
          "View all active subscribers per package",
          "Track sessions used vs sessions remaining per subscriber",
          "Subscription start date and expiry date",
          "Renewal status: active, expiring soon, expired",
          "Subscriber contact for direct communication",
          "Historical subscriber data for retention analysis",
        ],
      },
      {
        heading: "Benefits of Packages",
        content:
          "Packages provide predictable recurring revenue for mentors and cost savings for mentees, creating a win-win that encourages longer-term mentoring relationships.",
        list: [
          "Predictable monthly revenue from active subscribers",
          "Higher mentee commitment and session attendance",
          "Reduced no-show rates from invested subscribers",
          "Priority booking access for package holders",
          "Dedicated chat channel with package subscribers",
          "Better outcomes from continuity of mentoring relationship",
        ],
      },
    ],
  },
  {
    slug: "mentor-programs",
    title: "Mentorship Programs",
    category: "Mentor Portal",
    description:
      "Accept and manage structured mentorship programs with defined goals, milestones, and progress tracking for long-term mentoring engagements.",
    learn: [
      "How mentorship program requests work",
      "How to define and track milestones",
      "How program status progresses over time",
      "How to manage and conclude programs",
    ],
    sections: [
      {
        heading: "Program Requests",
        content:
          "Mentees or incubators can request structured mentorship programs. These go beyond individual sessions to provide ongoing, goal-oriented mentoring over weeks or months.",
        list: [
          "Receive program requests with goals, expected duration, and context",
          "Review mentee's background and specific objectives",
          "Accept or decline the program request",
          "Negotiate scope and expectations before acceptance",
          "Define the engagement type: SHORT_TERM, LONG_TERM, or ONGOING",
          "Set initial milestone framework upon acceptance",
        ],
      },
      {
        heading: "Milestone Management",
        content:
          "Milestones provide structure to the mentorship journey. They define checkpoints, deliverables, and goals that both mentor and mentee work toward.",
        list: [
          "Create milestones with title, description, and target date",
          "Track milestone status: NOT_STARTED, IN_PROGRESS, COMPLETED",
          "Add notes and outcomes when milestones are completed",
          "Reorder or modify milestones as the program evolves",
          "Progress visualization showing completed vs remaining milestones",
          "Link sessions to specific milestones for context tracking",
        ],
      },
      {
        heading: "Program Status Flow",
        list: [
          "REQUESTED — mentee has submitted a program request",
          "ACCEPTED — mentor has agreed to take on the program",
          "ACTIVE — program is underway with scheduled sessions",
          "ON_HOLD — temporarily paused by either party",
          "COMPLETED — all milestones achieved and program concluded",
          "ENDED_EARLY — program terminated before planned completion",
        ],
      },
      {
        heading: "Program Completion",
        content:
          "When all milestones are achieved or both parties agree the goals have been met, the program can be formally concluded with a summary and mutual review.",
        list: [
          "Mark program as complete with a summary of outcomes",
          "Both parties submit program-level reviews",
          "Certificate of completion generated for the mentee",
          "Program added to mentor's track record and statistics",
          "Option to extend into a new program if objectives expand",
        ],
      },
    ],
  },
  {
    slug: "mentor-incubator-associations",
    title: "Incubator Associations",
    category: "Mentor Portal",
    description:
      "Connect with incubators to provide mentoring to their startup cohorts. Manage associations, track usage, and access incubator-specific features and announcements.",
    learn: [
      "How to discover and apply to incubator programs",
      "How association status and approvals work",
      "How to manage sessions within an incubator context",
      "How usage tracking and reporting works",
    ],
    sections: [
      {
        heading: "Discovering Incubators",
        content:
          "Mentors can browse incubators on the ecosystem platform that are seeking mentor partnerships. Each incubator listing shows their programs, startup cohorts, and mentor requirements.",
        list: [
          "Browse incubators actively seeking mentors",
          "View incubator profiles: focus areas, cohort size, program details",
          "See mentor requirements: expertise needed, time commitment expected",
          "Check existing mentor roster and available spots",
          "Filter by location, sector focus, and engagement type",
        ],
      },
      {
        heading: "Association Application",
        content:
          "Mentors apply to become associated with an incubator. The application process varies by incubator and may include interviews or reference checks.",
        list: [
          "Submit an association request with a motivation statement",
          "Include relevant expertise and availability information",
          "Application reviewed by incubator administration",
          "Respond to any follow-up questions from the incubator",
          "Receive acceptance or decline notification",
          "Upon acceptance, gain access to incubator-specific features",
        ],
      },
      {
        heading: "Association Status",
        list: [
          "PENDING — application submitted and awaiting review",
          "ACTIVE — association approved and currently active",
          "INACTIVE — temporarily paused by either party",
          "ENDED — association formally concluded",
          "REJECTED — application not approved",
        ],
      },
      {
        heading: "Working with Incubators",
        content:
          "Once associated, mentors gain access to the incubator's startup cohort and can be matched with startups that need their expertise.",
        list: [
          "View startups in the incubator's current cohort",
          "Receive session bookings from incubator-assigned mentees",
          "Access incubator announcements and communications",
          "Track hours spent per incubator association",
          "View usage reports: sessions conducted, hours delivered",
          "Receive incubator-funded session payments where applicable",
        ],
      },
      {
        heading: "Ending an Association",
        content:
          "Either party can end an association. Active sessions and pending bookings are handled according to the platform's transition policy.",
        list: [
          "Initiate end-of-association request with reason",
          "Notice period allows completion of pending sessions",
          "Outstanding payments settled during transition",
          "Association history preserved for track record",
        ],
      },
    ],
  },
  {
    slug: "mentor-earnings",
    title: "Earnings & Payouts",
    category: "Mentor Portal",
    description:
      "Track all mentoring income, view detailed earnings analytics, manage payout accounts, and initiate withdrawals through the integrated payment system.",
    learn: [
      "How session earnings are calculated and tracked",
      "How the payout and withdrawal process works",
      "How platform fees and deductions are applied",
      "How earnings analytics help optimize your practice",
    ],
    sections: [
      {
        heading: "Earnings Overview",
        content:
          "The earnings dashboard provides a complete financial view of your mentoring practice. All income from sessions, packages, and incubator associations is tracked in a unified view.",
        list: [
          "Total earnings (lifetime and per period)",
          "Pending earnings awaiting payout cycle",
          "Available balance ready for withdrawal",
          "Earnings breakdown by source: sessions, packages, incubator",
          "Monthly and weekly earnings trends",
          "Comparison with previous periods",
        ],
      },
      {
        heading: "Earnings Analytics",
        content:
          "Detailed analytics help mentors understand their income patterns and optimize their offerings for maximum revenue.",
        list: [
          "Revenue per session type — identify highest-performing offerings",
          "Earnings by time period — daily, weekly, monthly views",
          "Package revenue vs individual session revenue",
          "Incubator association income tracking",
          "Average earnings per session hour",
          "Revenue growth trends and projections",
          "Client retention and repeat booking revenue",
        ],
      },
      {
        heading: "Platform Fees & Deductions",
        content:
          "EcoSync applies a platform fee on each transaction to cover payment processing, infrastructure, and marketplace operations.",
        list: [
          "Platform commission percentage on each session payment",
          "Payment gateway fees (Razorpay processing charges)",
          "GST and applicable tax deductions",
          "TDS (Tax Deducted at Source) where applicable",
          "Net amount after all deductions shown clearly",
          "Fee breakdown visible on each transaction",
        ],
      },
      {
        heading: "Payout Accounts",
        content:
          "Mentors configure one or more payout accounts where earnings are transferred during withdrawals.",
        list: [
          "Add bank account with IFSC code and account details",
          "Add UPI ID for instant payouts",
          "Set a primary payout account for default withdrawals",
          "Update or remove payout accounts at any time",
          "Account verification before first payout",
        ],
      },
      {
        heading: "Withdrawals",
        content:
          "Mentors initiate withdrawals when their available balance exceeds the minimum threshold. Payouts are processed within the defined settlement period.",
        list: [
          "Minimum withdrawal amount requirement",
          "Initiate withdrawal to configured payout account",
          "Withdrawal status: PENDING, PROCESSING, COMPLETED, FAILED",
          "Processing time: 2-5 business days for bank transfers",
          "Instant payout available for UPI (subject to limits)",
          "Transaction history with complete audit trail",
          "Failed payout retry with updated account details",
        ],
      },
    ],
  },
  {
    slug: "mentor-dashboard-analytics",
    title: "Dashboard & Analytics",
    category: "Mentor Portal",
    description:
      "Access comprehensive analytics on your mentoring practice including session metrics, earnings trends, mentee demographics, and review summaries — all from a single dashboard.",
    learn: [
      "What metrics the mentor dashboard tracks",
      "How session analytics help improve your practice",
      "How review analytics build your reputation",
      "How mentee insights inform your offerings",
    ],
    sections: [
      {
        heading: "Dashboard Overview",
        content:
          "The mentor dashboard provides an at-a-glance summary of your practice with key metrics, upcoming sessions, and actionable insights.",
        list: [
          "Upcoming sessions for today and this week",
          "Pending booking requests requiring action",
          "Earnings summary: this month vs last month",
          "Quick stats: total sessions, total mentees, average rating",
          "Unread announcements from associated incubators",
          "Recent reviews and rating changes",
          "Active package subscribers count",
        ],
      },
      {
        heading: "Session Analytics",
        content:
          "Detailed session analytics reveal patterns in your mentoring activity, helping you optimize availability and session offerings.",
        list: [
          "Total sessions by status: completed, cancelled, no-show",
          "Sessions per week/month with trend visualization",
          "Most popular session types by booking count",
          "Peak booking days and time slots",
          "Average session duration vs booked duration",
          "Cancellation and no-show rates over time",
          "Session-to-review conversion rate",
        ],
      },
      {
        heading: "Earnings Analytics",
        list: [
          "Revenue trend: daily, weekly, monthly, yearly",
          "Revenue by session type and package",
          "Average revenue per session",
          "Revenue per mentee for lifetime value tracking",
          "Comparison with marketplace benchmarks (anonymized)",
          "Projected earnings based on current booking pipeline",
        ],
      },
      {
        heading: "Review Analytics",
        content:
          "Track your reputation through review metrics and sentiment analysis to understand mentee satisfaction and areas for improvement.",
        list: [
          "Average rating with trend over time",
          "Rating distribution: 5-star, 4-star, etc.",
          "Total reviews and review velocity",
          "Most praised aspects from written reviews",
          "Areas for improvement from feedback",
          "Review response rate",
        ],
      },
      {
        heading: "Mentee Insights",
        content:
          "Understand who your mentees are and how they engage with your services to refine your target audience and offerings.",
        list: [
          "Total unique mentees served",
          "New vs returning mentee ratio",
          "Mentee industries and roles breakdown",
          "Mentee startup stages distribution",
          "Geographic distribution of mentees",
          "Top mentees by session count",
          "Mentee retention and repeat booking rates",
        ],
      },
    ],
  },
  {
    slug: "mentor-announcements",
    title: "Announcements & Communications",
    category: "Mentor Portal",
    description:
      "Receive and manage announcements from associated incubators. Stay informed about program updates, events, and mentoring opportunities relevant to your associations.",
    learn: [
      "How incubator announcements are delivered to mentors",
      "How to track read status and manage announcement volume",
      "How announcement priorities work",
      "How to stay updated across multiple incubator associations",
    ],
    sections: [
      {
        heading: "Receiving Announcements",
        content:
          "Mentors associated with incubators receive targeted announcements about program updates, cohort activities, events, and mentoring opportunities. These appear in a dedicated announcements section within the mentor portal.",
        list: [
          "Announcements from all associated incubators in one feed",
          "Source incubator clearly identified on each announcement",
          "Priority indicators: NORMAL, IMPORTANT, URGENT",
          "Attachments and links included with announcements",
          "Publication date and time for chronological tracking",
          "Pinned announcements from incubators remain at top",
        ],
      },
      {
        heading: "Managing Announcements",
        list: [
          "Mark individual announcements as read",
          "Unread count badge for quick visibility",
          "Filter by incubator source",
          "Filter by priority level",
          "Filter by read/unread status",
          "Search announcements by keyword",
          "Chronological feed with newest first",
        ],
      },
      {
        heading: "Notification Integration",
        content:
          "Important announcements trigger real-time notifications to ensure mentors don't miss critical communications from their incubator partners.",
        list: [
          "Push notification for URGENT priority announcements",
          "In-app notification badge for new announcements",
          "Email digest option for announcement summaries",
          "Notification preferences configurable per incubator",
        ],
      },
    ],
  },
];
