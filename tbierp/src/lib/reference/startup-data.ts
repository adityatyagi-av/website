export const startupReferencePages = [
  {
    slug: "startup-overview",
    title: "Startup Portal Overview",
    category: "Startup Portal",
    description:
      "The Startup Portal is your centralized workspace within the EcoSync ecosystem. It provides startups with tools to manage incubation programs, office spaces, facilities, tasks, funding, and team collaboration — all from a single dashboard.",
    learn: [
      "What the Startup Portal offers and who it serves",
      "How the portal connects to incubation programs",
      "How to navigate the startup workspace",
      "How permissions and team access work within the portal",
    ],
    sections: [
      {
        heading: "What is the Startup Portal?",
        content:
          "The Startup Portal is the startup-facing side of the incubation ecosystem. When a startup is onboarded into an incubation program, they gain access to this portal which gives them visibility into their program status, office allocations, facility bookings, assigned tasks, funding disbursements, and announcements — all scoped to the incubator they are associated with.",
      },
      {
        heading: "Core Capabilities",
        list: [
          "Program discovery and application submission with structured workflows",
          "Application management including change requests and document submissions",
          "Office space browsing, subscription management, and payment processing",
          "Facility booking with availability checking and time-slot reservations",
          "Task management with subtasks, comments, attachments, and status tracking",
          "Funding request submission and disbursement tracking",
          "Team announcements and incubator broadcast reception",
          "Data collection form submissions for compliance and reporting",
          "Real-time notifications for all portal activities",
          "Dashboard with key metrics and activity summaries",
        ],
      },
      {
        heading: "Portal Access",
        content:
          "Startup team members access the portal through their ecosystem account. Access is granted when the startup is onboarded into an incubation program. Multiple team members can have portal access with different permission levels based on their team role.",
        list: [
          "Owner — full control over all portal features and settings",
          "Admin — can manage applications, bookings, and team members",
          "Member — can view information and participate in tasks",
          "Custom roles — configurable permissions per feature module",
        ],
      },
      {
        heading: "Dashboard",
        content:
          "The startup dashboard provides an at-a-glance view of all important activities and metrics across the portal.",
        list: [
          "Active program associations and their current status",
          "Pending tasks and upcoming deadlines",
          "Recent announcements from the incubator",
          "Office space subscription status and upcoming payments",
          "Funding disbursement summary and pending requests",
          "Notification center with unread count",
        ],
      },
    ],
  },
  {
    slug: "startup-program-discovery",
    title: "Program Discovery & Applications",
    category: "Startup Portal",
    description:
      "Discover incubation and accelerator programs, review eligibility criteria, and submit structured applications directly from the Startup Portal with real-time status tracking.",
    learn: [
      "How to discover available incubation programs",
      "How the application submission process works",
      "How to respond to scheme-specific questions",
      "How to track application status in real time",
    ],
    sections: [
      {
        heading: "Discovering Programs",
        content:
          "Startups can browse published incubation programs either through the ecosystem platform's discovery feed or via direct links shared by incubators. Each program listing includes detailed information about eligibility, benefits, timeline, and the application process.",
        list: [
          "Browse programs by sector, stage, location, and funding type",
          "View program details including duration, benefits, and expectations",
          "Check eligibility criteria before applying",
          "See application deadlines and batch intake dates",
          "View success stories from previous cohorts",
          "Direct apply button with pre-filled startup information",
        ],
      },
      {
        heading: "Application Submission",
        content:
          "The application process is structured around the program's custom application form. Startups fill in required fields, answer scheme-specific questions, and upload supporting documents.",
        list: [
          "Auto-populated startup profile information",
          "Custom question responses defined by the program scheme",
          "File uploads for pitch decks, financials, and incorporation documents",
          "Draft saving — applications can be saved and resumed later",
          "Submission confirmation with application reference number",
          "Email and in-app notification upon successful submission",
        ],
      },
      {
        heading: "Application Status Tracking",
        content:
          "Once submitted, startups can track their application through every stage of the review process in real time.",
        list: [
          "NEW — application successfully submitted and awaiting review",
          "CHANGES_REQUESTED — incubator has requested modifications",
          "CHANGES_RECEIVED — startup has submitted requested changes",
          "REVIEWED — initial review completed by admin",
          "UNDER_EVALUATION — panel evaluation in progress",
          "EVALUATED — all panel members have scored the application",
          "DOCS_REQUESTED — additional documents required",
          "DOCS_RECEIVED — requested documents have been uploaded",
          "VERIFIED — all requirements verified and approved",
          "ONBOARDED — startup accepted into the program",
          "REJECTED — application not approved with optional feedback",
        ],
      },
      {
        heading: "Multiple Applications",
        content:
          "Startups can apply to multiple programs simultaneously. Each application is tracked independently with its own status, communications, and document trail. The portal provides a unified view of all active and past applications.",
      },
    ],
  },
  {
    slug: "startup-application-management",
    title: "Application Management",
    category: "Startup Portal",
    description:
      "Manage active applications by responding to change requests, uploading requested documents, and communicating with incubation teams throughout the review process.",
    learn: [
      "How to respond to change requests from incubators",
      "How to handle document request workflows",
      "How communication works during the review process",
      "How to manage multiple applications simultaneously",
    ],
    sections: [
      {
        heading: "Change Requests",
        content:
          "Incubation administrators may request changes to your application at any stage of the review process. Change requests are categorized by type and require a response before the application can proceed.",
        list: [
          "GENERAL — update to overall application information or narrative sections",
          "FILE — replacement of a specific uploaded document",
          "QUESTION — revision of an answer to a scheme-specific question",
          "Each change request includes a description of what needs to be modified",
          "Startups receive instant notifications when a change is requested",
          "Deadline indicators show urgency of pending change requests",
          "Application status automatically updates when changes are submitted",
        ],
      },
      {
        heading: "Document Requests",
        content:
          "At any point during the review, incubators can request additional supporting documents that were not part of the original application form.",
        list: [
          "Receive document requests with specific descriptions of what is needed",
          "Upload documents in supported formats (PDF, images, spreadsheets)",
          "Track which documents have been submitted and which are pending",
          "Application status updates to DOCS_RECEIVED upon submission",
          "Document history maintained for audit trail",
          "Multiple documents can be uploaded per request",
        ],
      },
      {
        heading: "Application Timeline",
        content:
          "Every application maintains a complete timeline of all actions taken by both the startup and the incubation team, providing full transparency into the review process.",
        list: [
          "Submission date and initial acknowledgment",
          "Each status change with timestamp",
          "Change request issued and response dates",
          "Document request and upload timestamps",
          "Evaluation scores when made visible",
          "Final decision date and outcome",
        ],
      },
      {
        heading: "Post-Acceptance Onboarding",
        content:
          "Once accepted, the startup is onboarded into the program. This triggers access to program-specific features including office space eligibility, facility access, task assignments, and funding disbursement workflows.",
      },
    ],
  },
  {
    slug: "startup-funding-requests",
    title: "Funding & Disbursements",
    category: "Startup Portal",
    description:
      "Submit funding requests, track disbursement tranches, and maintain visibility into all financial interactions between your startup and the incubation program.",
    learn: [
      "How to submit funding requests to the incubator",
      "How disbursement tranches work",
      "How to track pending and completed payments",
      "How data collection ties into funding compliance",
    ],
    sections: [
      {
        heading: "Funding Overview",
        content:
          "Startups enrolled in funded programs can submit funding requests and track disbursements through the portal. The funding system supports multiple tranches, conditional releases, and complete audit trails for transparency.",
      },
      {
        heading: "Submitting Funding Requests",
        list: [
          "Select the program and funding source to request from",
          "Specify the requested amount and purpose",
          "Provide supporting documentation for the request",
          "Submit milestones achieved that qualify for disbursement",
          "Track request status: PENDING, APPROVED, DISBURSED, REJECTED",
          "Receive notifications on request status changes",
        ],
      },
      {
        heading: "Disbursement Tracking",
        content:
          "Once approved, disbursements are released in tranches as defined by the program structure. Each tranche has specific conditions that must be met before release.",
        list: [
          "View all disbursement tranches and their conditions",
          "Track which tranches have been released and which are pending",
          "See total amount disbursed vs total allocated",
          "Download disbursement receipts and documentation",
          "View disbursement schedule and expected dates",
          "Track percentage completion of total program funding",
        ],
      },
      {
        heading: "Data Collection & Compliance",
        content:
          "Incubators may require periodic data submissions as a condition for continued funding. These data collection forms gather metrics, progress reports, and financial updates.",
        list: [
          "Receive data collection form assignments from the incubator",
          "Fill structured forms with required metrics and information",
          "Submit forms before deadlines to maintain compliance",
          "View submission history and past responses",
          "Track upcoming data collection deadlines",
          "Non-compliance may delay pending disbursements",
        ],
      },
    ],
  },
  {
    slug: "startup-office-space",
    title: "Office Space Booking",
    category: "Startup Portal",
    description:
      "Browse available office spaces, initiate subscriptions, manage payments, and track your workspace allocation within the incubation facility.",
    learn: [
      "How to browse and filter available office spaces",
      "How office subscriptions and pricing work",
      "How payment processing and renewal works",
      "How to manage and cancel office subscriptions",
    ],
    sections: [
      {
        heading: "Browsing Office Spaces",
        content:
          "The office space module lets startups browse all available workspaces offered by their associated incubator. Each listing includes detailed information about capacity, amenities, pricing, and availability.",
        list: [
          "View all listed offices with photos, capacity, and pricing",
          "Filter by type: private office, dedicated desk, shared workspace",
          "Check real-time availability status",
          "View included amenities and additional services",
          "Compare pricing tiers: daily, weekly, monthly rates",
          "See proximity to other facilities and common areas",
        ],
      },
      {
        heading: "Subscription Management",
        content:
          "Office space access is managed through subscriptions. Startups initiate a subscription request which goes through approval before activation.",
        list: [
          "Submit a booking request for a specific office space",
          "Request goes through incubator approval workflow",
          "Upon approval, subscription is activated with billing start date",
          "View active subscription details: start date, billing cycle, amount",
          "Track payment history for the subscription",
          "Receive renewal reminders before each billing cycle",
        ],
      },
      {
        heading: "Payments",
        content:
          "All office space payments are processed through Razorpay. The system supports automated recurring payments and manual payment for pending invoices.",
        list: [
          "Razorpay-powered secure payment processing",
          "View pending payments and due dates",
          "Pay manually or set up auto-debit for recurring charges",
          "Download payment receipts and invoices",
          "Track payment history with status: PENDING, COMPLETED, FAILED",
          "Grace period notifications before service interruption",
        ],
      },
      {
        heading: "Cancellation",
        content:
          "Startups can cancel office subscriptions with appropriate notice. Cancellation policies are defined by the incubator and displayed during the subscription process.",
        list: [
          "Initiate cancellation from the subscription management page",
          "View cancellation terms and notice period requirements",
          "Pro-rated refund calculation where applicable",
          "Subscription remains active until the end of the current billing period",
          "Office access revoked after subscription end date",
        ],
      },
    ],
  },
  {
    slug: "startup-facility-booking",
    title: "Facility Booking",
    category: "Startup Portal",
    description:
      "Book meeting rooms, conference halls, labs, and event spaces at your incubation facility with time-slot availability checking and reservation management.",
    learn: [
      "How to browse and book available facilities",
      "How time-slot availability and conflicts work",
      "How to manage and cancel facility reservations",
      "What facility types are available for booking",
    ],
    sections: [
      {
        heading: "Available Facilities",
        content:
          "Incubators list various bookable resources that startups can reserve for meetings, events, workshops, and other activities.",
        list: [
          "Meeting rooms — small group discussions and internal meetings",
          "Conference halls — larger presentations and team all-hands",
          "Labs — technical workspaces for prototyping and testing",
          "Event spaces — workshops, demo days, and community events",
          "Recording studios — content creation and podcast recording",
          "Phone booths — private calls and focused work",
        ],
      },
      {
        heading: "Checking Availability",
        content:
          "Before booking, startups can check real-time availability for any facility on a specific date. The system shows all available time slots and any existing reservations.",
        list: [
          "Select a facility and date to view available slots",
          "See time-slot durations and any minimum booking requirements",
          "View capacity limits per facility",
          "Check pricing if the facility has associated costs",
          "See booking restrictions (advance notice, maximum duration)",
          "Conflict detection prevents double-booking",
        ],
      },
      {
        heading: "Making a Reservation",
        list: [
          "Select your desired time slot from available options",
          "Specify the purpose and expected number of attendees",
          "Add any special requirements or setup instructions",
          "Submit the booking request for confirmation",
          "Receive instant confirmation or approval-pending notification",
          "Calendar invite generated upon confirmation",
          "Reminder notifications before the scheduled time",
        ],
      },
      {
        heading: "Managing Reservations",
        content:
          "View all upcoming and past facility reservations in a centralized list. Manage active bookings with modification and cancellation options.",
        list: [
          "View all upcoming reservations with details",
          "Cancel reservations within the allowed window",
          "View past booking history",
          "Reschedule by canceling and rebooking available slots",
          "Check-in support for day-of arrival confirmation",
        ],
      },
    ],
  },
  {
    slug: "startup-task-management",
    title: "Task Management",
    category: "Startup Portal",
    description:
      "Create, assign, and track tasks within your startup team. Manage work with subtasks, attachments, comments, and status workflows to keep projects organized.",
    learn: [
      "How to create and manage tasks for your team",
      "How subtask breakdowns work",
      "How attachments and comments facilitate collaboration",
      "How task statistics provide productivity insights",
    ],
    sections: [
      {
        heading: "Task Creation",
        content:
          "Startup team members can create tasks to organize work across the team. Tasks support rich details including descriptions, assignments, priorities, and deadlines.",
        list: [
          "Title, description, and detailed requirements",
          "Assignee selection from team members",
          "Priority levels: LOW, MEDIUM, HIGH, URGENT",
          "Due date and estimated effort",
          "Category and label tagging for organization",
          "File attachments for reference materials",
        ],
      },
      {
        heading: "Task Status Workflow",
        list: [
          "TODO — task created and awaiting start",
          "IN_PROGRESS — actively being worked on",
          "IN_REVIEW — completed and awaiting review",
          "DONE — task completed and approved",
          "BLOCKED — task cannot proceed due to a dependency",
          "CANCELLED — task no longer needed",
        ],
      },
      {
        heading: "Subtasks",
        content:
          "Complex tasks can be broken into subtasks for granular tracking. Each subtask has its own status, assignee, and completion state.",
        list: [
          "Create multiple subtasks under a parent task",
          "Independent status tracking per subtask",
          "Assign different team members to subtasks",
          "Progress percentage calculated from subtask completion",
          "Subtask completion contributes to parent task progress",
          "Reorder and prioritize subtasks within a task",
        ],
      },
      {
        heading: "Collaboration Features",
        list: [
          "Comments — threaded discussions on each task",
          "Attachments — upload files, images, and documents",
          "Activity log — complete history of task changes",
          "Mentions — notify specific team members in comments",
          "Due date reminders — notifications before deadlines",
          "Task statistics — completion rates, overdue counts, team productivity",
        ],
      },
      {
        heading: "Task Statistics & Insights",
        content:
          "The task dashboard provides aggregate views of team productivity including completion rates, overdue tasks, and workload distribution.",
        list: [
          "Total tasks by status breakdown",
          "Overdue task count and aging",
          "Tasks completed this week/month",
          "Per-member workload distribution",
          "Average task completion time",
          "Priority distribution across active tasks",
        ],
      },
    ],
  },
  {
    slug: "startup-announcements",
    title: "Announcements & Notifications",
    category: "Startup Portal",
    description:
      "Stay informed with incubator announcements and manage internal team communications. Receive real-time notifications for all portal activities.",
    learn: [
      "How incubator announcements are received and tracked",
      "How to create team-internal announcements",
      "How the notification system keeps you updated",
      "How to manage notification preferences",
    ],
    sections: [
      {
        heading: "Incubator Announcements",
        content:
          "Incubators publish targeted announcements to their associated startups. These appear in the startup portal with priority indicators, attachments, and read-tracking.",
        list: [
          "Receive announcements from associated incubators",
          "View announcement details with attachments and links",
          "Priority indicators: NORMAL, IMPORTANT, URGENT",
          "Pinned announcements remain at the top of the feed",
          "Mark announcements as read to track engagement",
          "Filter announcements by date, priority, and read status",
          "Unread count badge on the announcements section",
        ],
      },
      {
        heading: "Team Announcements",
        content:
          "Startup admins and owners can create internal announcements visible to all team members for coordinating activities and sharing updates.",
        list: [
          "Create announcements with title, content, and attachments",
          "Target all team members or specific roles",
          "Pin important announcements to the top",
          "Track which team members have read the announcement",
          "Edit or delete announcements after publishing",
          "Schedule announcements for future publishing",
        ],
      },
      {
        heading: "Notification System",
        content:
          "The portal maintains a comprehensive notification system that alerts team members to relevant activities in real time via Socket.IO.",
        list: [
          "Real-time push notifications for all portal events",
          "Application status changes and incubator communications",
          "Task assignments, due dates, and comment mentions",
          "Payment reminders and subscription renewals",
          "Facility booking confirmations and reminders",
          "Funding request approvals and disbursement notifications",
          "Mark individual or all notifications as read",
          "Notification history with filtering and search",
        ],
      },
      {
        heading: "Notification Preferences",
        content:
          "Team members can customize which notifications they receive and how they are delivered to reduce noise and focus on relevant updates.",
        list: [
          "Toggle notifications by category (tasks, payments, announcements)",
          "Email notification preferences for critical updates",
          "In-app notification sound and badge settings",
          "Quiet hours configuration for non-urgent notifications",
        ],
      },
    ],
  },
];
