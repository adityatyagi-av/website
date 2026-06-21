export const incubationReferencePages = [
  {
    slug: "incubation-overview",
    title: "Incubation Portal Overview",
    category: "Incubation Portal",
    description:
      "The Incubation Portal is a multi-tenant SaaS product built for incubators, accelerators, and innovation hubs. Each organization gets a fully isolated, white-labeled portal with a custom subdomain to manage their startup pipeline, programs, mentors, facilities, funding, and operations under one roof.",
    learn: [
      "What the Incubation Portal is and who it serves",
      "How multi-tenancy and data isolation works",
      "How custom subdomains and branding are configured",
      "The complete module system and access control model",
      "How subscription plans determine available features",
    ],
    sections: [
      {
        heading: "What is the Incubation Portal?",
        content:
          "The Incubation Portal is a dedicated SaaS platform designed exclusively for incubators, accelerators, and innovation centers. Unlike the EcoSync social ecosystem where all users coexist, the Incubation Portal provides each organization with a completely isolated workspace. Accessible via a unique subdomain (e.g., yourorg.admin.ecosync.co.in), the portal gives incubation teams full control over their startup lifecycle management without any cross-tenant data visibility.",
      },
      {
        heading: "Multi-Tenancy Architecture",
        content:
          "Every incubator registered on EcoSync becomes a Tenant with a unique tenantKey that serves as their subdomain identifier. The architecture ensures absolute data isolation — one incubator can never access, view, or modify another incubator's data. This isolation extends to startups, programs, users, roles, facilities, office spaces, funding, and all operational data.",
        list: [
          "Unique tenantKey used as subdomain identifier ({tenantKey}.admin.ecosync.co.in)",
          "Optional custom domain mapping for full white-labeling",
          "Tenant status management: ACTIVE, INACTIVE, SUSPENDED",
          "Complete data isolation across all modules and features",
          "Redis-based caching with 24-hour TTL for efficient tenant resolution",
          "Tenant profile with branding, logo, contact, and classification info",
        ],
      },
      {
        heading: "Authentication & Access",
        content:
          "Portal authentication requires both a valid tenantKey in the request header and a valid JWT token. This dual-layer authentication ensures that users can only access the tenant they belong to. Users are invited by tenant admins and assigned specific roles that control their module-level permissions.",
        list: [
          "Email/password login with OTP verification",
          "Tenant-scoped JWT tokens — valid only for the user's assigned tenant",
          "Support for users belonging to multiple tenants (tenant selection flow)",
          "Password reset with OTP verification",
          "Session refresh via refresh tokens",
          "Automatic tenant resolution from request headers",
        ],
      },
      {
        heading: "Module System",
        content:
          "The portal operates on a modular architecture where each feature area (Programs, Startups, Funding, Office Space, etc.) is a discrete module. Access to modules is controlled at two levels: the subscription plan determines which modules are available to the tenant, and roles determine which users can access each module and what actions they can perform.",
        list: [
          "19 distinct modules covering all operational areas",
          "CRUD+F action model (Create, Read, Update, Delete, Full Access)",
          "Plan-based module availability — higher plans unlock more modules",
          "Role-based access control layered on top of plan limits",
          "Module categories: Administration, Programs, Startups, Workspaces, Engagement, Mentorship, Finance, Content, Billing",
        ],
      },
      {
        heading: "Subscription Plans",
        content:
          "Each tenant subscribes to a plan that determines their resource limits and available modules. Plans define maximum users, maximum startups, storage limits, and which platform modules are accessible. Payments are processed through Razorpay with subscription lifecycle management.",
        list: [
          "Configurable plan tiers with monthly/annual billing",
          "Maximum users and startups limits per plan",
          "Storage limits for documents and media",
          "Feature flags via plan-module associations",
          "Razorpay subscription integration for recurring payments",
          "Automatic plan enforcement across all portal features",
        ],
      },
      {
        heading: "Key Capabilities at a Glance",
        list: [
          "Program creation and startup application management",
          "Multi-stage evaluation panels with weighted scoring",
          "Batch/cohort management within programs",
          "Startup directory with association lifecycle tracking",
          "Office space management with pricing, allocations, and subscriptions",
          "Facility booking with calendar and availability management",
          "Funding sources, allocations, and disbursement tracking",
          "Targeted announcement system with read tracking",
          "Task management with subtasks, comments, and attachments",
          "Mentor association management and session tracking",
          "Real-time chat and notification system",
          "Billing, invoices, and add-on service requests",
          "Analytics dashboard with metrics and timelines",
          "Public data repository with API key access",
          "Payout account management for office revenue",
        ],
      },
    ],
  },
  {
    slug: "incubation-user-role-management",
    title: "User & Role Management",
    category: "Incubation Portal",
    description:
      "The User & Role Management system allows incubation admins to invite team members, create custom roles with granular module-level permissions, and control exactly what each user can see and do within the portal.",
    learn: [
      "How to invite and manage incubation portal users",
      "How to create custom roles with specific permissions",
      "How the module-based CRUD permission system works",
      "How panel member and admin designations work",
      "How users can belong to multiple tenants",
    ],
    sections: [
      {
        heading: "User Management",
        content:
          "Incubation portal users are distinct from ecosystem users — they are specifically invited to participate in the incubation management workflow. Admins create users by providing their details and assigning them a role. Each user is linked to the tenant through a membership record that tracks their role, admin status, panel member status, and active state.",
        list: [
          "Create new users with name, email, and role assignment",
          "View all users with search and filter capabilities",
          "View team members specific to the incubation organization",
          "Get detailed user profiles including their role and permissions",
          "Update user information, role assignments, and active status",
          "Users dropdown for quick selection in assignment workflows",
          "Deactivate users without deleting their data or audit trail",
        ],
      },
      {
        heading: "Role Creation & Configuration",
        content:
          "Roles are the backbone of the permission system. Each role defines exactly which modules a user can access and what actions they can perform within each module. Admins can create unlimited custom roles tailored to their organizational structure — from program coordinators who only manage applications, to finance managers who handle funding operations.",
        list: [
          "Create custom roles with descriptive names",
          "Assign module-level permissions per role",
          "Each module supports five action types: Create, Read, Update, Delete, Full Access",
          "Update roles at any time — changes apply immediately to all users with that role",
          "Role dropdown for quick assignment during user creation",
          "View available modules that can be assigned to roles (filtered by tenant plan)",
        ],
      },
      {
        heading: "Permission Model",
        content:
          "The permission model operates on three layers: the tenant's subscription plan determines which modules are available, the role determines which of those modules a user can access, and the action level determines what operations they can perform within each module.",
        list: [
          "Layer 1 — Plan modules: Which features the tenant has paid for",
          "Layer 2 — Role modules: Which plan-available modules this role can access",
          "Layer 3 — Action permissions: Create (C), Read (R), Update (U), Delete (D) per module",
          "Full Access (F): Grants all CRUD operations for a module",
          "Permissions are checked on every API request via middleware",
          "Access denied responses include the specific module and action that failed",
        ],
      },
      {
        heading: "Special Designations",
        content:
          "Beyond roles, users can have special designations that grant additional capabilities or surfaces within the portal.",
        list: [
          "Admin designation — Full portal access regardless of role, can manage other users and settings",
          "Panel Member designation — Access to evaluation workflows and assigned applications",
          "Program Manager assignment — Elevated access to specific programs and their startups",
          "Users can hold multiple designations simultaneously",
        ],
      },
      {
        heading: "Multi-Tenant Access",
        content:
          "A single incubation user can belong to multiple tenants. During login, if the user has memberships in more than one tenant, they are presented with a tenant selection screen. Once a tenant is selected, all subsequent API calls are scoped to that tenant's data.",
        list: [
          "Single email can be a member of multiple incubator portals",
          "Tenant selection flow after login when multiple memberships exist",
          "Separate role and permissions per tenant membership",
          "Independent active/inactive status per tenant",
          "Session tokens are scoped to the selected tenant",
        ],
      },
      {
        heading: "Available Modules",
        list: [
          "Tenant Settings — Organization profile, branding, and configuration",
          "User Management — Invite and manage portal users",
          "Role Management — Create roles and assign module permissions",
          "Program Creation — Create programs, scheme types, and questions",
          "Program Management — Manage batches, applications, and evaluations",
          "Startup Management — Startup directory and associations",
          "Office Space — Office spaces, pricing, allocations, and bookings",
          "Facility — Facility management, time slots, and bookings",
          "Announcements — Targeted announcements with tracking",
          "Tasks — Task management with assignments and subtasks",
          "Mentorship — Mentor associations, sessions, and analytics",
          "Panel — Evaluation panel members and assignments",
          "Funding — Sources, allocations, and disbursements",
          "Public Repository — Public data with API key access",
          "Notifications — In-app notification preferences",
          "Chat — In-tenant messaging and conversations",
          "Billing — Subscription and payment management",
          "Invoices — Invoice viewing and downloads",
          "Add-on Requests — Request additional platform features",
        ],
      },
    ],
  },
  {
    slug: "incubation-program-creation",
    title: "Program Creation",
    category: "Incubation Portal",
    description:
      "Programs are the core organizational unit of the Incubation Portal. The Program Creation module enables admins to design and configure incubation schemes, accelerator programs, and funding initiatives with custom application forms, evaluation criteria, and detailed program information.",
    learn: [
      "How to create and configure an incubation program",
      "How scheme types and governing bodies are managed",
      "How custom application questions are defined",
      "How evaluation criteria with weighted scoring are set up",
      "How funding is configured per program",
    ],
    sections: [
      {
        heading: "Program Setup",
        content:
          "Creating a program involves defining its core identity, objectives, eligibility criteria, and operational parameters. Programs serve as containers that startups apply to, and all downstream operations — applications, evaluations, batches, funding — are organized under programs.",
        list: [
          "Title, description, cover image, and program logo",
          "Objective statement and program benefits",
          "Detailed guidelines for applicants",
          "Scheme type classification (incubation, acceleration, funding, etc.)",
          "Eligibility and non-eligibility criteria",
          "Expected outcomes and success metrics",
          "External links and supporting resources",
          "Program status management (draft, active, closed)",
        ],
      },
      {
        heading: "Scheme Types",
        content:
          "Scheme types are reusable classifications that categorize programs. They help standardize program categorization across the incubator's portfolio and make it easier for startups to understand what type of support a program offers.",
        list: [
          "Create custom scheme types specific to your organization",
          "Search and browse existing scheme types",
          "Reuse scheme types across multiple programs",
          "Examples: Technology Incubation, Social Enterprise Acceleration, Seed Funding, Research Commercialization",
        ],
      },
      {
        heading: "Governing Bodies",
        content:
          "Programs are often run under the mandate or funding of a governing body — a government department, corporate CSR arm, or institutional partner. The governing body system lets incubators track which entity sponsors or mandates each program.",
        list: [
          "Create governing body entries with organizational details",
          "Search and select from existing governing bodies",
          "Associate programs with one or more governing bodies",
          "Track program compliance and reporting requirements",
        ],
      },
      {
        heading: "Custom Application Questions",
        content:
          "Each program defines the questions startups must answer when applying. These questions form the application form that startups fill out. The question system supports a wide range of input formats to capture exactly the information your evaluation process needs.",
        list: [
          "MCQ — Multiple choice question with predefined options",
          "TEXT — Short text answer (single line)",
          "LONG_TEXT — Detailed text response (paragraph)",
          "FILE_UPLOAD — Document, image, or file attachment",
          "DATE — Date picker for timelines and deadlines",
          "NUMBER — Numeric input for metrics and amounts",
          "CHECKBOX — Multi-select from a list of options",
          "DROPDOWN — Single selection from a dropdown list",
          "Questions can be marked as required or optional",
          "Questions are ordered for consistent presentation",
          "Questions can be updated or removed after creation",
        ],
      },
      {
        heading: "Evaluation Criteria",
        content:
          "Beyond application questions, programs define evaluation criteria that panel members use to score applications. Each criterion has a weightage that determines its importance in the final score calculation. Criteria contain multiple-choice scoring options where each option carries a numeric score.",
        list: [
          "Define evaluation questions with clear scoring rubrics",
          "Assign weightage (importance multiplier) to each criterion",
          "Create multiple-choice options each carrying a specific numeric score",
          "Toggle criteria active/inactive without deletion",
          "Reorder criteria to match your evaluation workflow",
          "Criteria apply to all applications within the program",
        ],
      },
      {
        heading: "Funding Configuration",
        content:
          "Programs that involve financial support can configure their funding parameters directly within the program setup. This links the program to the broader funding management system.",
        list: [
          "Total funding amount allocated to the program",
          "Currency configuration (default: INR)",
          "Funding type: GRANT, EQUITY, DEBT, CONVERTIBLE_NOTE, REVENUE_SHARE",
          "Funding availability toggle — enable/disable disbursement at program level",
          "Funding is disbursed to startups through the Funding Management module",
        ],
      },
      {
        heading: "Program Managers",
        content:
          "Incubation portal users can be designated as Program Managers for specific programs. This gives them elevated access to all operations related to their assigned programs — including application review, startup management, and mentor coordination — without needing full admin access to the entire portal.",
      },
    ],
  },
  {
    slug: "incubation-program-management",
    title: "Program Management",
    category: "Incubation Portal",
    description:
      "Program Management encompasses the full lifecycle of startup applications within a program — from receiving applications, through review and evaluation, to final onboarding or rejection. It includes batch management, change requests, document workflows, and data collection operations.",
    learn: [
      "How applications flow through the review pipeline",
      "How change requests and document requests work",
      "How batches organize startups within programs",
      "How to manage the startup-to-program lifecycle",
      "How bulk operations streamline administration",
    ],
    sections: [
      {
        heading: "Application Pipeline",
        content:
          "When startups apply to a program, their applications enter a structured pipeline. Admins manage applications through multiple status stages, with the ability to request modifications, additional documents, and panel evaluations at each stage.",
        list: [
          "View all program registrations with advanced search and filtering",
          "Access detailed application views with all answers and documents",
          "Change application status through the defined workflow",
          "Track the complete history of status changes with timestamps",
          "Request changes or documents at any stage",
          "Assign applications to panel members for evaluation",
          "Final outcomes: onboard (accept) or reject applicants",
        ],
      },
      {
        heading: "Application Status Workflow",
        content:
          "Applications move through a clearly defined status workflow. Each transition is logged with the user who made the change and an optional comment, creating a complete audit trail.",
        list: [
          "NEW — Application freshly submitted by the startup",
          "CHANGES_REQUESTED — Admin requires modifications to submitted information",
          "CHANGES_RECEIVED — Startup has responded to change requests",
          "REVIEWED — Admin has completed initial review",
          "UNDER_EVALUATION — Application assigned to panel for scoring",
          "EVALUATED — Panel scoring is complete",
          "DOCS_REQUESTED — Additional supporting documents required",
          "DOCS_RECEIVED — Startup has submitted requested documents",
          "VERIFIED — All information and documents verified",
          "ONBOARDED — Startup accepted into the program",
          "REJECTED — Application not approved (with reason)",
        ],
      },
      {
        heading: "Change Requests",
        content:
          "Admins can request modifications to specific parts of an application. Each change request targets a specific aspect and creates a conversation thread between the admin and the startup. Changes can be approved, rejected, or re-requested if the response is insufficient.",
        list: [
          "GENERAL — General information update required",
          "FILE — Specific file or document replacement needed",
          "QUESTION — Answer to a specific application question needs revision",
          "Startups receive notification when changes are requested",
          "Admins can view pending, completed, and received change responses",
          "Individual changes can be re-requested, approved, or rejected",
          "Change request history maintained for audit purposes",
        ],
      },
      {
        heading: "Document Requests",
        content:
          "Beyond change requests, admins can request entirely new documents from applicants. Document requests are used when additional supporting evidence is needed — pitch decks, financial statements, incorporation certificates, or any other documentation your review process requires.",
        list: [
          "Request documents from individual applications",
          "Request documents from startups directly (association-level)",
          "Bulk document requests across multiple startups",
          "View all document requests by program with status tracking",
          "Review individual document responses",
          "Reopen document requests if submitted material is inadequate",
          "Startups can resubmit documents after feedback",
        ],
      },
      {
        heading: "Batch Management",
        content:
          "Batches (cohorts) are groups of startups within a program that go through the incubation journey together. They have defined start/end dates, target sizes, and can be managed independently within the program structure.",
        list: [
          "Create batches under any program with title, dates, and capacity",
          "View all batches for a program with status indicators",
          "Update batch details and timelines",
          "Change batch status through its lifecycle",
          "View batch-specific registrations and enrolled startups",
          "Bulk-register multiple startups into a batch simultaneously",
          "Delete batches that haven't yet enrolled startups",
        ],
      },
      {
        heading: "Startup Management within Programs",
        content:
          "Admins can manage startups at the program level — adding existing ecosystem startups, creating new startup entries, removing associations, and viewing program-specific startup directories.",
        list: [
          "Search EcoSync ecosystem startups to add to programs",
          "Add existing startups to programs (skip application flow)",
          "Create new startup entries directly and assign to programs",
          "Remove startups from programs (with association cleanup)",
          "View startups filtered by specific program",
          "Get detailed startup information in the incubation context",
          "Bulk registration for onboarding multiple startups at once",
        ],
      },
      {
        heading: "Data Collection Requests",
        content:
          "Beyond document requests, the Data Collection system allows admins to create structured data collection forms sent to multiple startups simultaneously. This is used for periodic reporting, milestone updates, or any standardized information gathering.",
        list: [
          "Create data collection requests with custom fields",
          "Assign data collection to specific startups or entire batches",
          "View all data collection requests by program",
          "Track individual assignment statuses and responses",
          "Review submitted data and mark as accepted or request revision",
          "Close data collection requests when all responses are gathered",
          "Update request parameters after creation",
        ],
      },
    ],
  },
  {
    slug: "incubation-evaluation-panel",
    title: "Evaluation Panel",
    category: "Incubation Portal",
    description:
      "The Evaluation Panel system enables structured, fair assessment of startup applications through designated panel members who score applications using weighted criteria. Multiple evaluators can independently assess the same application, and their scores are aggregated into a comprehensive evaluation summary.",
    learn: [
      "How panel members are invited and managed",
      "How panel members are assigned to specific programs",
      "How the evaluation form and scoring works",
      "How weighted scores are calculated and aggregated",
      "How evaluation summaries compare applications",
    ],
    sections: [
      {
        heading: "Panel Member Management",
        content:
          "Panel members are incubation portal users who have been designated to participate in application evaluations. They are typically domain experts, industry professionals, or senior staff who bring specialized knowledge to the assessment process.",
        list: [
          "Invite existing portal users as panel members",
          "Panel member designation is added to their user profile",
          "View all active panel members across the organization",
          "Panel members see a dedicated evaluations surface in their portal",
          "Access to pending evaluations that need their attention",
          "Panel members can only evaluate applications in their assigned programs",
        ],
      },
      {
        heading: "Program Assignment",
        content:
          "Panel members are assigned to specific programs. This scoping ensures that evaluators only see applications relevant to their area of expertise. A panel member can be assigned to multiple programs, and each program can have multiple evaluators.",
        list: [
          "Assign panel members to programs where their expertise is relevant",
          "Remove panel members from programs when no longer needed",
          "View panel composition for any program",
          "Multiple evaluators can be assigned to the same program",
          "Each evaluator scores independently — no visibility into others' scores until complete",
        ],
      },
      {
        heading: "Evaluation Form",
        content:
          "When a panel member opens an application for evaluation, they see the evaluation form built from the program's evaluation criteria. Each criterion presents its scoring options (defined during Program Creation), and the panel member selects scores and optionally adds comments.",
        list: [
          "Evaluation form auto-generated from program's evaluation criteria",
          "Each criterion shows its question text and scoring options",
          "Panel members select a score for each criterion",
          "Optional comments can be added per criterion for qualitative feedback",
          "Evaluations can be saved as DRAFT for later completion",
          "Final submission locks the evaluation from further changes",
        ],
      },
      {
        heading: "Scoring Mechanism",
        content:
          "The scoring system uses a weighted approach where each criterion's score is multiplied by its assigned weightage. This allows program managers to emphasize the criteria that matter most for their specific program's goals.",
        list: [
          "Raw score: The numeric value of the selected option for each criterion",
          "Weighted score: Raw score multiplied by the criterion's weightage",
          "Total score: Sum of all weighted scores for the application",
          "Multiple evaluators score independently",
          "Average score calculated across all evaluators per criterion",
          "Final ranking based on aggregate weighted scores",
        ],
      },
      {
        heading: "Evaluation Summary",
        content:
          "After evaluators have scored an application, the summary view aggregates all scores into a comprehensive overview. This helps program managers make informed accept/reject decisions based on collective expert assessment.",
        list: [
          "Per-evaluator score breakdown showing individual assessments",
          "Average score per criterion across all evaluators",
          "Total weighted score for the application",
          "Evaluator comments compiled by criterion",
          "Comparative ranking capability across all applicants in the program",
          "Summary accessible from both the application detail and program overview",
        ],
      },
    ],
  },
  {
    slug: "incubation-startup-management",
    title: "Startup Management",
    category: "Incubation Portal",
    description:
      "The Startup Management module provides incubation admins with a comprehensive directory of all startups associated with their organization. It tracks the full association lifecycle, provides detailed startup profiles in the incubation context, and links to all related data — funding, office allocations, facility bookings, mentorships, and evaluations.",
    learn: [
      "How to view and manage the startup directory",
      "How startup-tenant associations work",
      "What information is available in startup detail views",
      "How to track startup progress across programs",
      "How funding and resource allocation connects to startups",
    ],
    sections: [
      {
        heading: "Startup Directory",
        content:
          "The startup directory is the central hub for all startups that have ever been associated with the incubator — whether through applications, direct onboarding, or program enrollment. It provides a filterable, searchable list view with key metrics visible at a glance.",
        list: [
          "View all startups with list view showing key information",
          "Search by startup name, founder, or sector",
          "Filter by program association, batch, status, or stage",
          "Quick overview cards showing stage, program, and association status",
          "Pagination and sorting for large startup portfolios",
        ],
      },
      {
        heading: "Association Lifecycle",
        content:
          "The relationship between a startup and the incubator is tracked through association statuses. These statuses reflect the current state of the engagement and determine what access the startup has to incubation resources.",
        list: [
          "ONBOARDED — Startup has been accepted and added to the incubator",
          "ACTIVE — Startup is actively participating in programs and using resources",
          "SUSPENDED — Access temporarily restricted (e.g., payment default, policy violation)",
          "OFFBOARDED — Startup has completed or exited the incubation relationship",
          "Association status determines access to facilities, office space, and portal features",
          "Status changes are logged with timestamps for audit",
        ],
      },
      {
        heading: "Startup Detail View",
        content:
          "Clicking into a startup reveals a comprehensive profile showing all data the incubator has about that startup — from their application details to current resource allocations.",
        list: [
          "Startup overview with company information and team details",
          "All program associations and their current status",
          "Application/registration history with status",
          "Evaluation scores and panel feedback",
          "Funding disbursement history and pending requests",
          "Office space allocations (current and historical)",
          "Facility bookings (meeting rooms, event spaces)",
          "Mentor associations and session history",
        ],
      },
      {
        heading: "Startup-to-Program Connections",
        content:
          "Startups can be associated with multiple programs within the same incubator. Each association is independent — a startup might be ACTIVE in one program and OFFBOARDED from another. This flexible model supports incubators that run multiple concurrent programs serving different needs.",
        list: [
          "One startup can participate in multiple programs simultaneously",
          "Independent status tracking per program association",
          "Program-level view shows only startups in that specific program",
          "Cross-program view shows the startup's complete incubation journey",
          "Bulk operations available for managing startups across programs",
        ],
      },
    ],
  },
  {
    slug: "incubation-office-space",
    title: "Office Space Management",
    category: "Incubation Portal",
    description:
      "The Office Space Management module enables incubators to list, price, allocate, and monetize their physical workspace. It supports the full lifecycle from listing spaces with tiered pricing, through request/approval workflows, to subscription-based recurring bookings with payment processing and payout management.",
    learn: [
      "How to create and manage office space listings",
      "How tiered pricing works for different space configurations",
      "How the request and allocation workflow operates",
      "How recurring subscriptions and payments are handled",
      "How payouts and revenue tracking works",
    ],
    sections: [
      {
        heading: "Office Space Listings",
        content:
          "Incubators create office space listings that describe their available workspaces. Each listing includes details about the space type, capacity, amenities, and location within the facility.",
        list: [
          "Create office spaces with name, description, and capacity",
          "Define space type (private office, hot desk, dedicated desk, meeting room, etc.)",
          "Add amenities list (WiFi, printer, AC, parking, etc.)",
          "Upload images and floor plans",
          "Set availability hours and working days",
          "Toggle space active/inactive without deletion",
          "Update space details at any time",
        ],
      },
      {
        heading: "Pricing Tiers",
        content:
          "Each office space can have multiple pricing tiers to accommodate different usage patterns. This allows offering daily, weekly, monthly, or custom-duration pricing for the same space.",
        list: [
          "Add multiple pricing tiers per space",
          "Configure price, duration, and billing cycle per tier",
          "Define included services per pricing tier",
          "Update pricing without affecting existing allocations",
          "Delete pricing tiers that are no longer offered",
          "View pricing breakdown for any space",
        ],
      },
      {
        heading: "Availability & Calendar",
        content:
          "The availability system tracks which spaces are occupied, reserved, or available at any given time. A calendar view provides visual insight into space utilization across your facility.",
        list: [
          "Real-time availability checking for any date range",
          "Calendar view showing all bookings and allocations",
          "Conflict detection prevents double-booking",
          "Visual indicators for occupied, reserved, and available slots",
        ],
      },
      {
        heading: "Request & Approval Workflow",
        content:
          "Startups can request office spaces through the Startup Portal. Requests land in the incubator's queue where admins review the details and either approve or reject the request. Approved requests proceed to allocation.",
        list: [
          "View all incoming office space requests",
          "Access request details including startup info and requirements",
          "Approve requests — triggers allocation creation",
          "Reject requests with reason (communicated to the startup)",
          "Filter requests by status, date, or requesting startup",
        ],
      },
      {
        heading: "Allocations & Bookings",
        content:
          "Once a request is approved or a direct allocation is made, the space is formally assigned to a startup. Allocations track the duration, associated booking records, and can be extended or ended early.",
        list: [
          "Allocate spaces directly to startups (bypass request flow)",
          "View all active and historical allocations",
          "End allocations early when startups move out",
          "Extend allocations beyond original end date",
          "Confirm, activate, complete, or cancel bookings",
          "Track booking lifecycle from creation to completion",
        ],
      },
      {
        heading: "Payments & Revenue",
        content:
          "Office space usage is billable. The payment system tracks charges, processes payments through Razorpay, and manages refund workflows.",
        list: [
          "View all payments across all office spaces",
          "Access individual payment details and invoices",
          "Initiate refunds for cancelled bookings or overpayments",
          "Payment status tracking (pending, completed, failed, refunded)",
          "Invoice generation per booking or allocation period",
        ],
      },
      {
        heading: "Subscriptions",
        content:
          "For recurring office space usage, subscriptions provide automatic billing. Startups can subscribe to a space with monthly or custom-interval payments processed automatically.",
        list: [
          "View all active office subscriptions",
          "Access subscription details and payment history",
          "Pause subscriptions (e.g., temporary closure, holiday period)",
          "Resume paused subscriptions",
          "Cancel subscriptions with prorated refund calculations",
        ],
      },
      {
        heading: "Payouts",
        content:
          "Revenue from office space usage flows into a payout system. Incubators can track their earnings and manage withdrawals to their configured bank accounts.",
        list: [
          "View all payout records",
          "Access payout summary with total earnings and pending amounts",
          "Individual payout details with transaction references",
          "Payout account configuration (bank details, UPI)",
          "Document management for payout account verification",
          "Account status tracking (pending verification, active, suspended)",
        ],
      },
    ],
  },
  {
    slug: "incubation-facility-management",
    title: "Facility Management",
    category: "Incubation Portal",
    description:
      "The Facility Management module handles bookable shared resources within the incubator — meeting rooms, conference halls, event spaces, labs, prototyping areas, and any other time-slotted facility. It provides availability management, booking workflows, calendar views, and usage analytics.",
    learn: [
      "How to create and configure bookable facilities",
      "How time-slot based availability works",
      "How booking requests are managed and approved",
      "How calendar views provide operational visibility",
      "How usage tracking informs resource planning",
    ],
    sections: [
      {
        heading: "Facility Setup",
        content:
          "Facilities represent bookable shared resources. Unlike office spaces (which are allocated long-term), facilities are booked for specific time slots — a meeting room for 2 hours, a conference hall for a day, or a lab for a week.",
        list: [
          "Create facilities with name, description, and capacity",
          "Define facility type (meeting room, conference hall, lab, event space, etc.)",
          "Set operating hours and available days",
          "Configure booking rules (min/max duration, advance notice required)",
          "Add amenities and equipment list",
          "Upload images and layout diagrams",
          "Toggle facility active/inactive",
        ],
      },
      {
        heading: "Availability Management",
        content:
          "Facility availability is managed on a date-and-time basis. Admins can check availability for specific dates and the system accounts for existing bookings, blocked periods, and operating hours.",
        list: [
          "Check availability for any facility on a specific date",
          "View available time slots accounting for existing bookings",
          "Block specific dates or time ranges for maintenance",
          "Operating hours define the bookable window each day",
          "Capacity limits prevent overbooking",
        ],
      },
      {
        heading: "Booking Management",
        content:
          "Startups request facility bookings specifying their desired date, time slots, and purpose. Admins review and approve or reject these requests. The system supports multi-slot bookings for extended usage.",
        list: [
          "View all booking requests with status filtering",
          "Access individual booking details (who, when, why, how long)",
          "Approve bookings — slot is reserved for the startup",
          "Reject bookings with reason notification",
          "Cancel approved bookings (with notification to the startup)",
          "Reschedule bookings to new time slots",
          "View bookings for a specific startup",
        ],
      },
      {
        heading: "Calendar Views",
        content:
          "Calendar views provide at-a-glance visibility into facility utilization across the organization.",
        list: [
          "Facility-specific calendar showing all bookings for a single resource",
          "Tenant-wide calendar showing all facility bookings across the organization",
          "Color-coded booking status (pending, confirmed, completed, cancelled)",
          "Filter by facility type, status, or requesting startup",
        ],
      },
      {
        heading: "Reports & Analytics",
        content:
          "Usage tracking helps incubators understand how their facilities are being utilized and make data-driven decisions about resource planning.",
        list: [
          "Facility overview report with utilization percentages",
          "Usage statistics per facility (bookings count, hours used, peak times)",
          "Most-used and least-used facilities identification",
          "Startup-level facility usage tracking",
          "Trend analysis over time periods",
        ],
      },
    ],
  },
  {
    slug: "incubation-funding",
    title: "Funding Management",
    category: "Incubation Portal",
    description:
      "The Funding Management module provides comprehensive tools for tracking funding sources, allocating funds to programs, disbursing money to startups in tranches or milestones, processing startup funding requests, and maintaining a complete audit trail of all financial operations.",
    learn: [
      "How funding sources are recorded and categorized",
      "How funds are allocated from sources to programs",
      "How disbursements to startups work (tranches, milestones)",
      "How startups submit and track funding requests",
      "How the financial audit trail is maintained",
    ],
    sections: [
      {
        heading: "Funding Sources",
        content:
          "Incubators record where their funding originates. Each source represents a pool of money available for disbursement — whether from government grants, corporate sponsors, internal budgets, or investor contributions.",
        list: [
          "GOVERNMENT_GRANT — Funding from government programs and schemes",
          "CSR — Corporate Social Responsibility funds from companies",
          "INTERNAL — Organization's own operational budget",
          "ANGEL_FUND — Angel investor pool contributions",
          "VENTURE_FUND — Venture capital fund allocations",
          "CORPORATE — Direct corporate partnership funding",
          "DONATION — Philanthropic donations and grants",
          "OTHER — Any other funding source type",
          "Each source tracks: amount, currency, date received, reference documents",
          "Sources can be created, updated, and archived",
        ],
      },
      {
        heading: "Program Allocations",
        content:
          "Funds from sources are allocated to specific programs. This creates a clear money trail showing where each rupee comes from and where it's going. The system prevents over-allocation — you cannot allocate more than the source's available balance.",
        list: [
          "Allocate funds from any source to any program",
          "Track allocated vs. available balance per source",
          "View all allocations for a program (total funding pool)",
          "Update allocation amounts as needs change",
          "Remove allocations if program scope changes",
          "Over-allocation prevention with balance validation",
        ],
      },
      {
        heading: "Disbursements",
        content:
          "Disbursements are the actual transfer of funds from the incubator to startups. They support multiple disbursement types, can be made in tranches (multiple installments), and follow a lifecycle from creation through approval to final payment.",
        list: [
          "Disbursement types: GRANT, EQUITY, LOAN, PRIZE, SCHOLARSHIP, REIMBURSEMENT, OPERATING_EXPENSE",
          "Status lifecycle: PENDING, APPROVED, DISBURSED, CANCELLED, ON_HOLD",
          "Tranche numbering for multi-installment disbursements",
          "Each disbursement linked to a program and startup",
          "Supporting document attachment per disbursement",
          "Admin approval required before disbursement",
          "Complete audit trail with timestamps and approver info",
        ],
      },
      {
        heading: "Funding Requests from Startups",
        content:
          "Startups enrolled in programs can submit funding requests directly through their portal. These requests land in the admin's queue for review. Admins can approve (optionally with a different amount than requested) or reject with a reason.",
        list: [
          "Startups submit requests with desired amount and justification",
          "Requests are tagged to the specific program and association",
          "Status flow: PENDING, APPROVED, REJECTED",
          "Admin can set approved amount different from requested amount",
          "Approved requests auto-create disbursement records",
          "Startups can cancel pending requests",
          "Rejection includes reason communicated to the startup",
        ],
      },
      {
        heading: "Portfolio & Analytics",
        content:
          "The funding module provides portfolio-level views and analytics to help incubators understand their financial position across all programs.",
        list: [
          "Funding overview — total sourced, allocated, disbursed, and remaining",
          "Program-level funding portfolio (per-program breakdown)",
          "Complete funding history audit trail",
          "Individual disbursement tracking with status",
          "Source utilization percentages",
        ],
      },
    ],
  },
  {
    slug: "incubation-announcements",
    title: "Announcements",
    category: "Incubation Portal",
    description:
      "The Announcement system enables incubation admins to communicate important updates, events, policy changes, and general information to targeted audiences within their portal. It supports rich content, audience targeting, attachments, read tracking, and publishing workflows.",
    learn: [
      "How to create and publish announcements",
      "How audience targeting and exclusions work",
      "How attachments and media are handled",
      "How read tracking and engagement metrics work",
      "How pinning and archival features organize content",
    ],
    sections: [
      {
        heading: "Creating Announcements",
        content:
          "Announcements are rich communications that admins create and publish to their portal audience. They support detailed content, categorization, and scheduling.",
        list: [
          "Create announcements with title, body, and category",
          "Rich text content for detailed communications",
          "Save as draft before publishing",
          "Schedule publication for a future date",
          "Tag announcements for easy categorization",
        ],
      },
      {
        heading: "Targeting & Distribution",
        content:
          "Announcements can be targeted to specific audiences rather than broadcasting to everyone. The targeting system allows admins to select exactly who should see each announcement.",
        list: [
          "Add specific targets: individual users, programs, batches, or startups",
          "Remove targets to narrow the audience",
          "Add exclusions to explicitly hide from certain users or groups",
          "Remove exclusions if access should be restored",
          "View the complete target and exclusion list for any announcement",
          "Untargeted announcements are visible to all portal users",
        ],
      },
      {
        heading: "Publishing Workflow",
        content:
          "Announcements go through a publish/unpublish lifecycle that gives admins full control over visibility.",
        list: [
          "Publish — Makes the announcement visible to targeted audience",
          "Unpublish — Hides the announcement without deleting it",
          "Pin — Keeps the announcement at the top of the list regardless of date",
          "Unpin — Returns the announcement to chronological ordering",
          "Delete — Soft-delete removes from view but preserves data",
          "Restore — Recover deleted announcements",
        ],
      },
      {
        heading: "Attachments",
        content:
          "Announcements can include file attachments — documents, images, PDFs, or any supporting material that recipients might need.",
        list: [
          "Add multiple attachments to a single announcement",
          "Support for documents, images, and media files",
          "Remove individual attachments after upload",
          "Attachments accessible only to targeted recipients",
        ],
      },
      {
        heading: "Engagement Tracking",
        content:
          "The system tracks who has read each announcement, providing admins with visibility into how effectively their communications are reaching their audience.",
        list: [
          "Read tracking — see which recipients have opened the announcement",
          "Statistics view — read count, read percentage, time to read",
          "Unread recipient identification for follow-up",
          "Activity logging for audit purposes",
        ],
      },
    ],
  },
  {
    slug: "incubation-task-management",
    title: "Task Management",
    category: "Incubation Portal",
    description:
      "The Task Management module provides a full-featured project management toolkit for incubation teams. It supports task creation with assignment, subtasks, attachments, comments, status tracking, and team-level visibility into work progress.",
    learn: [
      "How to create and assign tasks to team members",
      "How subtasks break down complex work items",
      "How attachments and comments enable collaboration",
      "How status tracking and statistics provide oversight",
      "How different views surface relevant work",
    ],
    sections: [
      {
        heading: "Task Creation & Assignment",
        content:
          "Tasks represent work items that need to be completed by the incubation team. They are created with a title, description, priority, and optionally assigned to a specific team member.",
        list: [
          "Create tasks with title, description, and priority level",
          "Assign tasks to specific team members",
          "Set due dates and deadline reminders",
          "Categorize tasks by type or project area",
          "Link tasks to specific programs or startups for context",
          "Reassign tasks between team members",
        ],
      },
      {
        heading: "Subtasks",
        content:
          "Complex tasks can be broken into subtasks — smaller, actionable items that collectively complete the parent task. Subtasks have their own completion status and can be reordered to reflect priority.",
        list: [
          "Add multiple subtasks to any task",
          "Update subtask titles and details",
          "Toggle subtask completion (done/not done)",
          "Reorder subtasks to reflect execution priority",
          "Remove subtasks that are no longer needed",
          "Parent task progress reflects subtask completion",
        ],
      },
      {
        heading: "Attachments & Comments",
        content:
          "Tasks support file attachments for relevant documents and a comment thread for team discussion and status updates.",
        list: [
          "Add file attachments (documents, images, spreadsheets)",
          "Remove attachments when no longer relevant",
          "Add comments for discussion and status updates",
          "Update or delete your own comments",
          "Comment threads provide chronological conversation history",
        ],
      },
      {
        heading: "Status Tracking",
        content:
          "Tasks move through status stages that reflect their progress. The system tracks when statuses change and who made the change.",
        list: [
          "Update task status through defined workflow stages",
          "Status history logged with timestamps",
          "Overdue detection based on due dates",
          "Archive completed or cancelled tasks",
          "Bulk status operations for efficiency",
        ],
      },
      {
        heading: "Views & Filtering",
        content:
          "Multiple views help team members find the work most relevant to them.",
        list: [
          "All Tasks — Complete task list with search and filters",
          "My Tasks — Tasks assigned to the current user",
          "Created By Me — Tasks I created for others",
          "Overdue Tasks — Tasks past their due date",
          "Task Statistics — Counts by status, overdue metrics, completion rates",
          "Team Members — View who is available for assignment",
        ],
      },
    ],
  },
  {
    slug: "incubation-mentor-management",
    title: "Mentor Management",
    category: "Incubation Portal",
    description:
      "The Mentor Management module allows incubators to discover, invite, and manage mentor associations. It provides oversight of mentor sessions with startups, tracks engagement analytics, and manages the financial relationship between the incubator and its mentor network.",
    learn: [
      "How to discover and invite mentors to your incubator",
      "How mentor association lifecycle works",
      "How to monitor mentor sessions with startups",
      "How mentor analytics and spending are tracked",
      "How mentor-startup matching operates",
    ],
    sections: [
      {
        heading: "Mentor Discovery",
        content:
          "Incubators can browse the EcoSync mentor marketplace to find mentors with relevant expertise for their startups. The discovery system surfaces mentors by industry, expertise area, availability, and pricing.",
        list: [
          "Browse mentors from the EcoSync ecosystem marketplace",
          "Filter by expertise, industry, pricing, and availability",
          "View mentor profiles with qualifications and reviews",
          "Identify mentors already associated with your incubator",
          "Access pending mentor applications (mentors who applied to join)",
        ],
      },
      {
        heading: "Invitations & Applications",
        content:
          "Mentors can be invited by the incubator or can apply to join. Both paths result in an association that must be approved before the mentor can engage with the incubator's startups.",
        list: [
          "Invite specific mentors to join your incubator network",
          "View mentor applications (self-initiated requests to join)",
          "Review mentor profiles before approving association",
          "Set association terms (scope, duration, compensation model)",
        ],
      },
      {
        heading: "Association Lifecycle",
        content:
          "Mentor associations have a defined lifecycle from approval through active engagement to eventual conclusion.",
        list: [
          "Approve association — Mentor joins the incubator's network",
          "Reject association — Decline with optional reason",
          "Update association — Modify terms, scope, or compensation",
          "End association — Formally conclude the relationship",
          "Association status determines mentor's access to startups",
          "Multiple mentors can be associated simultaneously",
        ],
      },
      {
        heading: "Session Monitoring",
        content:
          "Incubators can monitor all mentor sessions happening within their network — providing oversight of mentor engagement with startups.",
        list: [
          "View all mentor sessions across the incubator",
          "Filter by mentor, startup, status, or date range",
          "Access individual session details (duration, notes, status)",
          "Track session completion rates",
          "Monitor session quality through startup feedback",
        ],
      },
      {
        heading: "Analytics & Spending",
        content:
          "The analytics surfaces help incubators understand how their mentor investment is being utilized and the value being delivered to startups.",
        list: [
          "Mentor analytics — sessions conducted, hours invested, startups mentored",
          "Spending tracking — total cost, per-mentor spend, per-startup allocation",
          "Per-startup mentor usage — how much mentoring each startup is receiving",
          "ROI indicators — mapping mentor engagement to startup milestones",
          "Trend analysis over time for budget planning",
        ],
      },
    ],
  },
  {
    slug: "incubation-billing-notifications",
    title: "Billing, Chat & Notifications",
    category: "Incubation Portal",
    description:
      "Supporting modules that round out the incubation portal experience — billing and subscription management, in-portal chat for team and support communication, notification preferences, invoices, and add-on service requests.",
    learn: [
      "How billing and subscription management works",
      "How in-portal chat enables team communication",
      "How notifications keep users informed",
      "How invoices are generated and accessed",
      "How add-on services extend portal capabilities",
    ],
    sections: [
      {
        heading: "Billing & Subscriptions",
        content:
          "The billing module manages the incubator's subscription to the EcoSync platform itself — the SaaS payment that keeps their portal active and determines their plan features.",
        list: [
          "Billing dashboard showing current plan, next payment, and usage",
          "Create payment orders for plan renewal or upgrades",
          "Verify payment completion (Razorpay integration)",
          "View billing history and past transactions",
          "Plan comparison showing what's included vs. available on upgrade",
        ],
      },
      {
        heading: "Invoices",
        content:
          "Invoices are generated for subscription payments and any other billable services used by the incubator.",
        list: [
          "View all invoices in chronological order",
          "Access individual invoice details (amount, date, items, tax)",
          "Download invoices for accounting and records",
          "Invoice status tracking (paid, pending, overdue)",
        ],
      },
      {
        heading: "Add-on Service Requests",
        content:
          "Beyond their subscription plan, incubators can request additional services or features through the add-on system.",
        list: [
          "Browse available add-on services",
          "Submit requests for specific add-ons",
          "Track request status (pending, approved, active, rejected)",
          "View all submitted requests and their outcomes",
          "Cancel pending requests that are no longer needed",
        ],
      },
      {
        heading: "Chat & Messaging",
        content:
          "The portal includes a built-in messaging system for communication between team members and with EcoSync support.",
        list: [
          "Support Chat — Direct communication with EcoSync platform support",
          "View chat history and mark messages as read",
          "Universal Chat — Conversations between portal team members",
          "Create new conversations with one or more participants",
          "Send, edit, and delete messages within conversations",
          "Unread message counts and real-time delivery",
          "Message search across all conversations",
        ],
      },
      {
        heading: "Notifications",
        content:
          "The notification system keeps users informed about events relevant to their role — new applications, task assignments, booking requests, funding approvals, and more.",
        list: [
          "Real-time push notifications via Socket.IO",
          "Notification list with filters (all, unread, by type)",
          "Unread count badge for immediate awareness",
          "Mark individual notifications as read",
          "Mark all notifications as read in one action",
          "Archive old notifications to clean the inbox",
          "Clear all archived notifications",
          "Notification preferences — control which events generate notifications",
        ],
      },
      {
        heading: "Dashboard & Analytics",
        content:
          "The incubation portal dashboard provides at-a-glance metrics and trends for the entire organization.",
        list: [
          "Key metrics: total startups, active programs, pending applications, active mentors",
          "Application timeline chart showing volume over time",
          "Startups by stage breakdown (idea, MVP, growth, scale)",
          "Quick links to pending actions requiring admin attention",
        ],
      },
    ],
  },
  {
    slug: "incubation-public-repository",
    title: "Public Repository",
    category: "Incubation Portal",
    description:
      "The Public Repository module allows incubators to create structured data repositories that can be accessed publicly via API keys. This enables incubators to share curated startup directories, program listings, or resource catalogs with external websites, apps, or partner platforms.",
    learn: [
      "How to create and manage public repositories",
      "How API key authentication works for external access",
      "How to manage items within repositories",
      "How bulk operations work for large datasets",
      "How analytics track repository usage",
    ],
    sections: [
      {
        heading: "Repository Creation",
        content:
          "Repositories are named collections of structured data items that can be accessed externally. Each repository gets an auto-generated API key that external systems use to read the data.",
        list: [
          "Create repositories with name and description",
          "Auto-generated API key for external access",
          "Regenerate API keys if compromised",
          "Toggle repository visibility (active/inactive)",
          "Configure access permissions and rate limits",
        ],
      },
      {
        heading: "Item Management",
        content:
          "Items are the individual data entries within a repository. They can represent startups, resources, events, or any structured data the incubator wants to share externally.",
        list: [
          "Add items with structured JSON data",
          "View all items with pagination and search",
          "Update individual item content",
          "Delete items that should no longer be public",
          "Bulk add items for efficient data loading",
          "Bulk delete items for cleanup operations",
        ],
      },
      {
        heading: "Analytics & Access Logs",
        content:
          "Track how external systems are using your repository data.",
        list: [
          "Repository statistics (total items, total API calls, unique consumers)",
          "Access logs showing when and how the API was called",
          "Usage trends over time for capacity planning",
        ],
      },
    ],
  },
];
