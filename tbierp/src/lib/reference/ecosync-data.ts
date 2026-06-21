export const ecosyncReferencePages = [
  // Part 5: Social & Community
  {
    slug: "ecosync-overview",
    title: "EcoSync Platform Overview",
    category: "EcoSync Platform",
    description:
      "EcoSync Network is the unified ecosystem platform where founders, mentors, investors, freelancers, and professionals connect, collaborate, and grow. It combines social networking with purpose-built tools for the startup ecosystem.",
    learn: [
      "What the EcoSync ecosystem platform provides",
      "How different user roles interact on the platform",
      "What features are available to all ecosystem members",
      "How the platform integrates with specialized portals",
    ],
    sections: [
      {
        heading: "What is ecosync.network?",
        content:
          "EcoSync Network is the public-facing ecosystem platform accessible at ecosync.network. It serves as the social and professional hub where all ecosystem participants — founders, mentors, investors, freelancers, students, and professionals — coexist in a single environment. Think of it as a specialized LinkedIn built specifically for the startup ecosystem, with integrated tools for mentorship, investing, freelancing, and collaboration.",
      },
      {
        heading: "Platform Features",
        list: [
          "Social Feed — share updates, articles, milestones, and engage with the community",
          "Communities — join or create interest-based groups for discussions and knowledge sharing",
          "Events — discover, create, and attend virtual and in-person startup ecosystem events",
          "Jobs & Career — post and apply for jobs, internships, and freelance opportunities",
          "Mentorship Marketplace — find and book sessions with experienced mentors",
          "Networking & Discovery — intelligent matching with relevant ecosystem participants",
          "Messaging — real-time direct and group messaging across the platform",
          "Organization Pages — companies, startups, VCs, and incubators showcase their identity",
          "Investor Tools — deal flow pipeline, portfolio management, and syndicate investing",
          "Freelancer Tools — gig marketplace, project management, and payment processing",
        ],
      },
      {
        heading: "User Roles & Access",
        content:
          "Every user on the ecosystem platform has one or more roles that determine their feature access and how they appear in discovery results. Roles can be combined freely.",
        list: [
          "Student — internships, learning resources, community access",
          "Professional — networking, jobs, events, communities",
          "Freelancer — gig marketplace, project tools, earnings management",
          "Founder — startup pages, investor relations, team management, program applications",
          "Mentor — session management, availability, packages, earnings via Mentor Portal",
          "Investor — deal flow, portfolio, syndicates, startup discovery",
          "VC Partner — fund management, LP relations, team permissions, IC voting",
          "Incubation Person — redirected to their tenant's Incubation Portal",
        ],
      },
      {
        heading: "Portal Integration",
        content:
          "The ecosystem platform serves as the gateway to specialized portals. Users with relevant roles can access workspace-level features through the portal system.",
        list: [
          "Startup Portal — accessible to founders with active incubation associations",
          "Mentor Portal — accessible to users with the Mentor role",
          "Incubation Portal — accessible to incubation staff via their tenant subdomain",
          "All portals share the same authentication and user identity",
          "Activity from portals surfaces in the ecosystem feed where appropriate",
        ],
      },
    ],
  },
  {
    slug: "ecosync-social-feed",
    title: "Social Feed & Posts",
    category: "EcoSync Platform",
    description:
      "The social feed is the heart of the ecosystem platform. Share updates, publish articles, celebrate milestones, and engage with the community through a curated, algorithmically-ranked content stream.",
    learn: [
      "How the social feed works and what content appears",
      "How to create different types of posts",
      "How the feed algorithm ranks content",
      "How engagement features work (likes, comments, shares)",
    ],
    sections: [
      {
        heading: "Feed Overview",
        content:
          "The social feed aggregates content from your connections, followed pages, joined communities, and algorithmically recommended posts. It serves as the primary discovery mechanism for ecosystem activity, thought leadership, and opportunity announcements.",
      },
      {
        heading: "Post Types",
        list: [
          "Text Update — short-form status updates and thoughts",
          "Article — long-form content with rich formatting",
          "Image Post — visual content with captions and tags",
          "Video Post — native video uploads or embedded links",
          "Poll — interactive polls with multiple options and duration",
          "Milestone — celebrate achievements (funding, launch, growth)",
          "Job Announcement — share open positions with the network",
          "Event Share — promote upcoming events to your audience",
          "Document — share PDFs, presentations, or reports",
        ],
      },
      {
        heading: "Feed Algorithm",
        content:
          "The feed uses a multi-signal scoring system to rank content relevance for each user, ensuring the most valuable content surfaces at the top.",
        list: [
          "Connection strength — posts from closer connections rank higher",
          "Engagement velocity — rapidly engaged content gets boosted",
          "Content freshness — recent posts prioritized with decay over time",
          "Interest alignment — content matching your skills and interests",
          "Role relevance — content from your ecosystem role peers",
          "Community membership — posts from your communities get priority",
          "Interaction history — content from people you frequently engage with",
          "Diversity factor — prevents feed dominance by single sources",
        ],
      },
      {
        heading: "Engagement Features",
        list: [
          "Like — react to posts with a single tap",
          "Comment — threaded discussions with mentions and rich text",
          "Share — repost content to your feed with optional commentary",
          "Save — bookmark posts for later reading",
          "Report — flag inappropriate content for moderation",
          "Hide — remove posts from your feed without unfollowing",
        ],
      },
      {
        heading: "Post Visibility",
        content:
          "Authors control who can see their posts through visibility settings that apply per-post or as a default preference.",
        list: [
          "PUBLIC — visible to all ecosystem members",
          "CONNECTIONS — visible only to your connections",
          "COMMUNITY — visible only within a specific community",
          "PAGE_FOLLOWERS — visible to organization page followers",
        ],
      },
    ],
  },
  {
    slug: "ecosync-communities",
    title: "Communities",
    category: "EcoSync Platform",
    description:
      "Communities are interest-based groups where ecosystem participants gather for discussions, knowledge sharing, events, and networking around specific topics, industries, or goals.",
    learn: [
      "How to discover and join communities",
      "How to create and manage a community",
      "How community moderation and roles work",
      "How community engagement features drive interaction",
    ],
    sections: [
      {
        heading: "What are Communities?",
        content:
          "Communities are dedicated spaces for group interaction around a shared interest, industry, or objective. They provide a focused environment separate from the main feed where members can post discussions, share resources, run events, and build deeper relationships within the ecosystem.",
      },
      {
        heading: "Community Types",
        list: [
          "PUBLIC — anyone can find and join without approval",
          "PRIVATE — visible in search but requires admin approval to join",
          "INVITE_ONLY — hidden from search, membership by invitation only",
          "PAID — requires subscription payment for membership access",
        ],
      },
      {
        heading: "Discovery & Joining",
        list: [
          "Browse communities by category, size, and activity level",
          "Search by name, description, or topic tags",
          "View community statistics before joining: member count, post frequency, top contributors",
          "Recommended communities based on your profile and interests",
          "Trending communities with highest recent growth",
          "Invitation links for sharing with external contacts",
          "Instant join for public communities, request for private ones",
        ],
      },
      {
        heading: "Community Roles",
        content:
          "Communities have a role hierarchy that determines permissions for content management, member management, and community settings.",
        list: [
          "Owner — full control, can transfer ownership or delete community",
          "Admin — manage members, moderate content, adjust settings",
          "Moderator — approve posts, manage discussions, warn or mute members",
          "Member — post content, comment, participate in discussions",
          "Viewer — read-only access (for paid communities with free tier)",
        ],
      },
      {
        heading: "Community Features",
        list: [
          "Discussion posts with rich text, images, and file attachments",
          "Pinned posts for important announcements and guidelines",
          "Events tied to the community for member-exclusive gatherings",
          "Polls for community decision-making and feedback",
          "Resource library for shared files and reference materials",
          "Member directory with role badges and join dates",
          "Activity analytics: daily posts, active members, growth trends",
        ],
      },
      {
        heading: "Moderation Tools",
        content:
          "Community admins and moderators have tools to maintain a healthy, productive environment.",
        list: [
          "Post approval queue for moderated communities",
          "Content flagging and review workflow",
          "Member warnings with reason tracking",
          "Temporary mute — restrict posting for a defined period",
          "Ban — permanent removal from the community",
          "Automated content guidelines enforcement",
          "Reported content dashboard with action history",
        ],
      },
    ],
  },
  {
    slug: "ecosync-messaging",
    title: "Messaging & Chat",
    category: "EcoSync Platform",
    description:
      "Real-time messaging powers direct conversations, group chats, and contextual communication across the ecosystem platform with Socket.IO-based instant delivery.",
    learn: [
      "How direct and group messaging works",
      "How real-time delivery is powered by Socket.IO",
      "How message types and rich media are supported",
      "How chat integrates with other platform features",
    ],
    sections: [
      {
        heading: "Messaging Overview",
        content:
          "The messaging system enables real-time communication between ecosystem participants. It supports one-on-one conversations, group chats, and contextual threads tied to specific platform activities like mentorship sessions or project collaborations.",
      },
      {
        heading: "Conversation Types",
        list: [
          "Direct Message — one-on-one private conversations",
          "Group Chat — multi-participant conversations with naming and management",
          "Mentor Chat — dedicated channel between mentor and mentee during engagements",
          "Project Chat — contextual messaging within freelancer-client projects",
          "Community Chat — optional real-time chat rooms within communities",
        ],
      },
      {
        heading: "Message Features",
        list: [
          "Text messages with rich formatting and link previews",
          "File attachments: images, documents, audio, video",
          "Voice messages for audio-first communication",
          "Message reactions with emojis",
          "Reply threading for contextual responses",
          "Message forwarding to other conversations",
          "Message editing and deletion within time limits",
          "Read receipts showing message delivery and read status",
          "Typing indicators for active conversation awareness",
        ],
      },
      {
        heading: "Real-Time Infrastructure",
        content:
          "Messaging is powered by Socket.IO with the Universal Chat Socket handling ecosystem conversations. Messages are delivered instantly with offline queuing for users not currently connected.",
        list: [
          "Instant message delivery via WebSocket connections",
          "Offline message queuing with delivery upon reconnection",
          "Presence indicators showing online/offline/away status",
          "Push notifications for new messages when app is in background",
          "Message persistence with full search across history",
          "Conversation archiving for inactive chats",
        ],
      },
      {
        heading: "Chat Management",
        list: [
          "Pin important conversations to the top of the inbox",
          "Mute conversations to disable notifications",
          "Archive conversations without deleting history",
          "Block users to prevent further communication",
          "Search across all conversations by keyword or participant",
          "Filter inbox by unread, groups, direct messages",
          "Group admin controls: add/remove members, rename, set photo",
        ],
      },
    ],
  },
  // Part 6: Jobs & Events
  {
    slug: "ecosync-events",
    title: "Events & Meetups",
    category: "EcoSync Platform",
    description:
      "Create, discover, and attend startup ecosystem events — from intimate networking sessions and pitch nights to large-scale conferences and demo days — all managed within the platform.",
    learn: [
      "How to discover and register for events",
      "How to create and manage events as an organizer",
      "How live streaming and virtual events work",
      "How event scoring and recommendations work",
    ],
    sections: [
      {
        heading: "Event Discovery",
        content:
          "The events module surfaces relevant upcoming events based on your interests, role, location, and network activity. Events from organizations, communities, and individuals all appear in a unified discovery feed.",
        list: [
          "Browse by category: networking, pitch, workshop, conference, demo day, hackathon",
          "Filter by format: in-person, virtual, hybrid",
          "Filter by date, location, price, and audience type",
          "Recommended events based on profile and past attendance",
          "Events from your followed pages and joined communities",
          "Trending events with high registration velocity",
          "Calendar view of upcoming registered events",
        ],
      },
      {
        heading: "Event Creation",
        content:
          "Any verified user or organization page can create events. The creation flow supports rich event details, ticketing, and promotion.",
        list: [
          "Title, description, and cover image",
          "Date, time, and timezone with recurring event support",
          "Venue details for in-person or meeting link for virtual",
          "Ticket types: free, paid, early bird, VIP",
          "Capacity limits with waitlist support",
          "Speaker and agenda management",
          "Sponsor and partner showcasing",
          "Custom registration form fields",
          "Promotion tools: share to feed, invite connections, community cross-post",
        ],
      },
      {
        heading: "Event Types",
        list: [
          "NETWORKING — informal mixer and connection events",
          "PITCH — startup pitch competitions and demo events",
          "WORKSHOP — hands-on learning and skill development sessions",
          "CONFERENCE — large-scale multi-track events with speakers",
          "DEMO_DAY — cohort graduation and product showcases",
          "HACKATHON — time-boxed building challenges with prizes",
          "WEBINAR — educational presentations and panel discussions",
          "MEETUP — casual community gatherings",
        ],
      },
      {
        heading: "Registration & Attendance",
        list: [
          "One-click registration for free events",
          "Razorpay payment integration for paid events",
          "Ticket QR code generation for check-in",
          "Waitlist management with automatic promotion",
          "Cancellation with refund processing",
          "Reminder notifications: 24 hours and 1 hour before event",
          "Post-event feedback collection",
          "Attendance tracking and certificate generation",
        ],
      },
      {
        heading: "Live Streaming",
        content:
          "Virtual and hybrid events support live streaming through the platform's Event Live Socket, enabling real-time audience participation.",
        list: [
          "Integrated live video streaming for virtual events",
          "Real-time chat sidebar during live streams",
          "Q&A functionality for audience questions to speakers",
          "Polls and reactions during live sessions",
          "Screen sharing for presentations and demos",
          "Recording for on-demand replay access",
          "Attendee count and engagement metrics in real time",
        ],
      },
      {
        heading: "Event Analytics",
        content:
          "Organizers access detailed analytics about their events to measure success and improve future offerings.",
        list: [
          "Registration count, conversion rate, and source tracking",
          "Attendance rate: registered vs actually attended",
          "Engagement metrics: chat messages, questions, poll responses",
          "Revenue summary for paid events",
          "Post-event feedback scores and comments",
          "Audience demographics breakdown",
        ],
      },
    ],
  },
  {
    slug: "ecosync-jobs",
    title: "Jobs & Hiring",
    category: "EcoSync Platform",
    description:
      "Post job openings, browse opportunities, and manage the hiring pipeline. The jobs module connects startups with talent across roles including full-time, part-time, internships, and contract positions.",
    learn: [
      "How to post and manage job listings",
      "How job discovery and search works for candidates",
      "How the application pipeline tracks candidates",
      "How referrals and screening tools accelerate hiring",
    ],
    sections: [
      {
        heading: "Job Posting",
        content:
          "Organization pages (startups, companies, VCs) can post job listings with comprehensive details about the role, requirements, and compensation. Jobs are distributed across the ecosystem for maximum visibility.",
        list: [
          "Title, department, and role level (entry, mid, senior, lead, executive)",
          "Job type: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT, FREELANCE",
          "Location: remote, hybrid, on-site with city specification",
          "Salary range with optional equity component",
          "Required and preferred skills with experience levels",
          "Job description with rich text formatting",
          "Application deadline and start date",
          "Custom screening questions for applicants",
          "Industry and function category tagging",
        ],
      },
      {
        heading: "Job Discovery",
        content:
          "Candidates discover relevant job opportunities through intelligent matching, search, and recommendation algorithms tailored to their profile and preferences.",
        list: [
          "Search by title, skill, company, or keyword",
          "Filter by type, location, salary range, experience level",
          "Recommended jobs based on profile skills and preferences",
          "Job alerts for saved search criteria",
          "Jobs from your network: posted by connections and followed pages",
          "Trending jobs with high application velocity",
          "Saved/bookmarked jobs for later application",
        ],
      },
      {
        heading: "Application Process",
        list: [
          "One-click apply with ecosystem profile as resume",
          "Custom cover letter or note to hiring manager",
          "Answer screening questions defined by the employer",
          "Attach additional documents: portfolio, certifications",
          "Track application status in real time",
          "Withdraw application before review",
          "Application history across all past submissions",
        ],
      },
      {
        heading: "Application Pipeline",
        content:
          "Employers manage candidates through a structured pipeline with stages, notes, and collaborative evaluation tools.",
        list: [
          "APPLIED — candidate submitted application",
          "SCREENING — initial qualification review",
          "SHORTLISTED — candidate moved to interview pool",
          "INTERVIEWING — active interview process",
          "OFFERED — offer extended to candidate",
          "HIRED — offer accepted, onboarding initiated",
          "REJECTED — candidate not selected at any stage",
          "WITHDRAWN — candidate withdrew from process",
        ],
      },
      {
        heading: "Referrals",
        content:
          "The referral system allows employees and network members to recommend candidates for open positions, with tracking and optional referral rewards.",
        list: [
          "Refer candidates from your connections for open roles",
          "Referral link sharing for external candidates",
          "Track referral status through the pipeline",
          "Referral reward tracking when configured by employer",
          "Referral leaderboard for active referrers",
        ],
      },
      {
        heading: "Job Alerts",
        content:
          "Candidates set up automated alerts based on saved search criteria to receive notifications when new matching jobs are posted.",
        list: [
          "Create alerts from any search filter combination",
          "Frequency options: instant, daily digest, weekly digest",
          "Email and in-app notification delivery",
          "Pause or delete alerts at any time",
          "Maximum active alerts per user",
        ],
      },
    ],
  },
  {
    slug: "ecosync-career",
    title: "Career & Applications",
    category: "EcoSync Platform",
    description:
      "Manage your career journey on EcoSync — track job applications, build your professional profile, set career preferences, and receive intelligent opportunity recommendations.",
    learn: [
      "How to track and manage all your job applications",
      "How career preferences improve job recommendations",
      "How application status updates keep you informed",
      "How the professional profile serves as your dynamic resume",
    ],
    sections: [
      {
        heading: "Application Tracking",
        content:
          "All job applications submitted through the platform are tracked in a centralized dashboard, giving candidates complete visibility into their job search progress.",
        list: [
          "View all active and past applications in one place",
          "Status indicators: applied, screening, shortlisted, interviewing, offered, rejected",
          "Application date and last activity timestamp",
          "Company and role details at a glance",
          "Notes field for personal tracking (not visible to employer)",
          "Filter by status, date, company, or role type",
          "Archive completed applications to keep dashboard clean",
        ],
      },
      {
        heading: "Career Preferences",
        content:
          "Setting career preferences helps the platform recommend relevant opportunities and ensures your profile appears in the right employer searches.",
        list: [
          "Desired roles and job titles",
          "Preferred industries and sectors",
          "Location preferences: cities, remote willingness, relocation openness",
          "Salary expectations and minimum requirements",
          "Job type preferences: full-time, part-time, contract, internship",
          "Availability: immediately available, within 2 weeks, 1 month, not looking",
          "Open to opportunities toggle (visible to recruiters)",
        ],
      },
      {
        heading: "Professional Profile",
        content:
          "Your ecosystem profile serves as a living resume that employers review when evaluating applications. Keep it updated for the best match quality.",
        list: [
          "Work experience with company, role, duration, and highlights",
          "Education history with degrees and institutions",
          "Skills with proficiency levels and endorsements from connections",
          "Certifications and courses completed",
          "Portfolio links and project showcases",
          "Publications, patents, and speaking engagements",
          "Languages spoken with proficiency levels",
          "Profile completeness score with improvement suggestions",
        ],
      },
      {
        heading: "Status Notifications",
        content:
          "Stay informed about your applications with real-time notifications at every stage of the process.",
        list: [
          "Instant notification when application is viewed by employer",
          "Status change alerts: shortlisted, interview scheduled, offer extended",
          "Rejection notifications with optional employer feedback",
          "Deadline reminders for pending application actions",
          "New job matches based on your alert criteria",
          "Email and in-app notification options per event type",
        ],
      },
    ],
  },
  // Part 7: Profile, Notifications & Settings
  {
    slug: "ecosync-profile",
    title: "Profile & Organization Pages",
    category: "EcoSync Platform",
    description:
      "Build your professional identity on EcoSync with a comprehensive profile, or represent your organization with a dedicated page. Profiles and pages are the foundation of all ecosystem interactions.",
    learn: [
      "How personal profiles work and what they showcase",
      "How organization pages represent companies and startups",
      "How profile verification builds ecosystem trust",
      "How to manage team members on organization pages",
    ],
    sections: [
      {
        heading: "Personal Profile",
        content:
          "Your profile is your professional identity on EcoSync. It serves as your resume, business card, and social presence all in one. A complete profile significantly improves your visibility in discovery and networking results.",
        list: [
          "Profile photo, cover image, and headline",
          "Bio and about section with rich text formatting",
          "Current role and company affiliation",
          "Location and timezone information",
          "Skills with endorsements from connections",
          "Work experience timeline",
          "Education history",
          "Certifications, awards, and achievements",
          "Social links: LinkedIn, GitHub, Twitter, personal website",
          "Connection count and mutual connections display",
        ],
      },
      {
        heading: "Organization Pages",
        content:
          "Companies, startups, VC firms, and incubators can create organization pages to establish their institutional presence on the platform.",
        list: [
          "Company name, logo, and banner",
          "About section with mission, vision, and values",
          "Industry, size, founding date, and headquarters",
          "Team members with role designations",
          "Open job positions posted from the page",
          "Updates and announcements in the page feed",
          "Follower count and engagement metrics",
          "Linked startup profiles for founders",
          "Investor track record display for VC pages",
        ],
      },
      {
        heading: "Page Roles",
        list: [
          "Owner — full control, billing, and page deletion",
          "Admin — manage team, post content, manage jobs",
          "Editor — create and edit posts, respond to followers",
          "Analyst — view analytics and insights only",
        ],
      },
      {
        heading: "Profile Verification",
        content:
          "Verified profiles and pages receive a trust badge that improves visibility and credibility across the ecosystem.",
        list: [
          "Identity verification for individuals (document-based)",
          "Business verification for organizations (registration proof)",
          "Verification badge displayed on profile and in search results",
          "Verified accounts receive priority in discovery algorithms",
          "Verification status: NOT_STARTED, PENDING, VERIFIED, REJECTED",
        ],
      },
      {
        heading: "Profile Analytics",
        content:
          "Track how your profile performs with insights into views, search appearances, and engagement metrics.",
        list: [
          "Profile views over time with viewer demographics",
          "Search appearances with keywords that led to your profile",
          "Post engagement metrics: impressions, likes, comments",
          "Connection request trends",
          "Content performance comparison across post types",
        ],
      },
    ],
  },
  {
    slug: "ecosync-notifications",
    title: "Notifications & Alerts",
    category: "EcoSync Platform",
    description:
      "Stay informed about all ecosystem activity with a comprehensive notification system that delivers real-time alerts for connections, content, opportunities, and platform events.",
    learn: [
      "What events trigger notifications on the platform",
      "How notification preferences control delivery",
      "How real-time push notifications work via Socket.IO",
      "How to manage notification volume without missing important alerts",
    ],
    sections: [
      {
        heading: "Notification System",
        content:
          "The ecosystem platform generates notifications for all significant events that involve you — from social interactions to business opportunities. Notifications are delivered in real time via the Notification Socket and persisted for later review.",
      },
      {
        heading: "Notification Categories",
        list: [
          "Social — likes, comments, shares, and mentions on your posts",
          "Connections — new connection requests, acceptances, and follows",
          "Messaging — new messages and group chat activity",
          "Jobs — application status changes, new matches, and alerts",
          "Events — registration confirmations, reminders, and updates",
          "Communities — new posts in your communities, moderation actions",
          "Mentorship — session bookings, confirmations, and reminders",
          "Investments — deal flow updates, syndicate activity",
          "System — account security, policy updates, feature announcements",
        ],
      },
      {
        heading: "Delivery Channels",
        list: [
          "In-app notifications — real-time badge and dropdown panel",
          "Push notifications — browser and mobile push alerts",
          "Email notifications — configurable per category and frequency",
          "SMS notifications — critical security alerts only",
          "Socket.IO real-time delivery for instant awareness",
          "Offline queuing with delivery on next session",
        ],
      },
      {
        heading: "Notification Management",
        list: [
          "Mark individual notifications as read",
          "Mark all notifications as read in bulk",
          "Filter by category for focused review",
          "Search notification history by keyword",
          "Delete old notifications to clean up",
          "Unread count badge on navigation",
          "Grouped notifications for batch events (e.g., '5 people liked your post')",
        ],
      },
      {
        heading: "Preference Controls",
        content:
          "Fine-grained controls let you decide exactly what notifications you receive and how they are delivered, preventing notification fatigue while ensuring you never miss important updates.",
        list: [
          "Per-category toggle: enable or disable entire notification types",
          "Per-channel toggle: control in-app, email, and push independently",
          "Frequency settings: instant, hourly digest, daily digest",
          "Quiet hours: suppress non-critical notifications during set times",
          "Priority override: urgent notifications always delivered regardless of quiet hours",
          "Mute specific conversations or community threads",
          "Unsubscribe from follow-up notifications on specific posts",
        ],
      },
    ],
  },
  {
    slug: "ecosync-settings",
    title: "Account Settings & Security",
    category: "EcoSync Platform",
    description:
      "Manage your account settings, privacy preferences, security configuration, and connected services. Control how your data is used and who can interact with you on the platform.",
    learn: [
      "How to manage account and profile settings",
      "How privacy controls protect your information",
      "How security features keep your account safe",
      "How connected services and integrations work",
    ],
    sections: [
      {
        heading: "Account Settings",
        content:
          "Core account settings control your fundamental platform identity and access credentials.",
        list: [
          "Email address management and change verification",
          "Password update with current password confirmation",
          "Phone number addition for recovery and 2FA",
          "Display name and username changes",
          "Language and locale preferences",
          "Timezone configuration for scheduling accuracy",
          "Account deactivation and data export",
          "Permanent account deletion with grace period",
        ],
      },
      {
        heading: "Privacy Settings",
        content:
          "Privacy controls determine who can see your information, contact you, and find you in search results.",
        list: [
          "Profile visibility: public to ecosystem, connections only, or private",
          "Email visibility: visible, connections only, or hidden",
          "Phone number visibility control",
          "Activity status: show online status or appear offline",
          "Connection list visibility: public or private",
          "Search appearance: appear in discovery results or opt out",
          "Content default visibility for new posts",
          "Block list management",
        ],
      },
      {
        heading: "Security",
        content:
          "Security features protect your account from unauthorized access with multiple layers of verification and monitoring.",
        list: [
          "Two-factor authentication (TOTP and SMS options)",
          "Active sessions management — view and revoke sessions",
          "Login history with IP address, device, and location",
          "Login alerts for new device or unusual location access",
          "Trusted devices list for skipping 2FA on known devices",
          "Password strength requirements and breach detection",
          "OAuth connection management (Google, Facebook, Apple)",
          "API token management for third-party integrations",
        ],
      },
      {
        heading: "Connected Services",
        list: [
          "Google account linking for OAuth sign-in",
          "Facebook account linking for OAuth sign-in",
          "Apple account linking for OAuth sign-in",
          "Calendar sync for event and session scheduling",
          "Email integration for notification delivery",
          "Disconnect services at any time without losing account access",
        ],
      },
      {
        heading: "Data & Privacy",
        content:
          "EcoSync provides tools for data portability and transparency in compliance with privacy regulations.",
        list: [
          "Download your data — export all personal data in machine-readable format",
          "Data usage transparency — see how your data is used across features",
          "Cookie preferences management",
          "Marketing communication opt-out",
          "Third-party data sharing controls",
          "Right to erasure — request complete data deletion",
        ],
      },
    ],
  },
];
