export const ACTIONS = Object.freeze({
  C: "C",
  R: "R",
  U: "U",
  D: "D",
  F: "F",
});

export const ALL_ACTIONS = [ACTIONS.C, ACTIONS.R, ACTIONS.U, ACTIONS.D, ACTIONS.F];

export const MODULE_KEYS = Object.freeze({
  TENANT_SETTINGS: "TENANT_SETTINGS",
  USER_MANAGEMENT: "USER_MANAGEMENT",
  ROLE_MANAGEMENT: "ROLE_MANAGEMENT",
  PROGRAM_CREATION: "PROGRAM_CREATION",
  PROGRAM_MANAGEMENT: "PROGRAM_MANAGEMENT",
  STARTUP_MANAGEMENT: "STARTUP_MANAGEMENT",
  OFFICE_SPACE: "OFFICE_SPACE",
  FACILITY: "FACILITY",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  TASK: "TASK",
  MENTOR: "MENTOR",
  PANEL: "PANEL",
  FUNDING: "FUNDING",
  PUBLIC_REPOSITORY: "PUBLIC_REPOSITORY",
  NOTIFICATION: "NOTIFICATION",
  CHAT: "CHAT",
  BILLING: "BILLING",
  INVOICE: "INVOICE",
  ADDON_REQUEST: "ADDON_REQUEST",
});

const def = (
  key,
  displayName,
  description,
  { category = "Operations", isCore = false, displayOrder = 0 } = {}
) => ({
  key,
  moduleName: displayName,
  moduleDescription: description,
  category,
  isCore,
  displayOrder,
  actions: [...ALL_ACTIONS],
});

export const MODULE_REGISTRY = [
  def(MODULE_KEYS.TENANT_SETTINGS, "Tenant Settings", "Tenant profile, branding and configuration.", { category: "Administration", displayOrder: 1 }),
  def(MODULE_KEYS.USER_MANAGEMENT, "User Management", "Invite and manage incubation portal users.", { category: "Administration", displayOrder: 2 }),
  def(MODULE_KEYS.ROLE_MANAGEMENT, "Role Management", "Create roles and assign module permissions.", { category: "Administration", displayOrder: 3 }),
  def(MODULE_KEYS.PROGRAM_CREATION, "Program Creation", "Create programs, scheme types, governing bodies and scheme/evaluation questions.", { category: "Programs", displayOrder: 10 }),
  def(MODULE_KEYS.PROGRAM_MANAGEMENT, "Program Management", "Manage batches, applications, registrations, evaluations and data collection.", { category: "Programs", displayOrder: 11 }),
  def(MODULE_KEYS.STARTUP_MANAGEMENT, "Startup Management", "Tenant-side startup directory and associations.", { category: "Startups", displayOrder: 20 }),
  def(MODULE_KEYS.OFFICE_SPACE, "Office Space", "Office spaces, pricing, allocations and bookings.", { category: "Workspaces", displayOrder: 30 }),
  def(MODULE_KEYS.FACILITY, "Facility", "Facility management, time slots and bookings.", { category: "Workspaces", displayOrder: 31 }),
  def(MODULE_KEYS.ANNOUNCEMENT, "Announcements", "Announcements with targeting, attachments and activity.", { category: "Engagement", displayOrder: 40 }),
  def(MODULE_KEYS.TASK, "Tasks", "Task management with assignments, subtasks and attachments.", { category: "Operations", displayOrder: 41 }),
  def(MODULE_KEYS.MENTOR, "Mentorship", "Mentor associations, packages and sessions.", { category: "Mentorship", displayOrder: 50 }),
  def(MODULE_KEYS.PANEL, "Panel", "Panel member management and assignments.", { category: "Programs", displayOrder: 51 }),
  def(MODULE_KEYS.FUNDING, "Funding", "Funding sources, allocations, disbursements and documents.", { category: "Finance", displayOrder: 60 }),
  def(MODULE_KEYS.PUBLIC_REPOSITORY, "Public Repository", "Public repository management.", { category: "Content", displayOrder: 70 }),
  def(MODULE_KEYS.NOTIFICATION, "Notifications", "In-app notification preferences.", { category: "Engagement", displayOrder: 80 }),
  def(MODULE_KEYS.CHAT, "Chat", "In-tenant chat across portal users.", { category: "Engagement", displayOrder: 81 }),
  def(MODULE_KEYS.BILLING, "Billing", "Tenant billing access.", { category: "Billing", isCore: true, displayOrder: 90 }),
  def(MODULE_KEYS.INVOICE, "Invoices", "Invoice viewing and downloads.", { category: "Billing", isCore: true, displayOrder: 91 }),
  def(MODULE_KEYS.ADDON_REQUEST, "Add-on Requests", "Request and manage platform add-ons.", { category: "Billing", isCore: true, displayOrder: 92 }),
];

export const CORE_MODULE_KEYS = MODULE_REGISTRY.filter(m => m.isCore).map(m => m.key);

export function isValidModuleKey(key) {
  return Object.prototype.hasOwnProperty.call(MODULE_KEYS, key);
}
