import PolicyLayout from "@/component/policy/PolicyLayout";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Shipping and Returns Policy — Digital Service Delivery",
  description:
    "Understand how EcoSync delivers digital services, handles access provisioning, and manages service-related returns for our platform offerings.",
  keywords: [
    "ecosync shipping policy",
    "digital service delivery",
    "ecosync returns policy",
    "platform service delivery",
    "ecosync access provisioning",
  ],
  path: "/shipping-and-returns",
});

const sections = [
  {
    title: "Nature of Services",
    content: [
      "EcoSync is a digital platform that provides online services. We do not ship physical goods. All services — including mentorship sessions, platform subscriptions, event access, office space bookings, and marketplace transactions — are delivered digitally through the platform.",
      "This policy explains how our digital services are provisioned, activated, and how returns or service reversals are handled when applicable.",
    ],
  },
  {
    title: "Service Delivery",
    content: [
      "Account access: Upon registration, your account is activated instantly. You can immediately access all features available to your role(s) without any waiting period.",
      "Mentorship sessions: Confirmed sessions are delivered at the scheduled time via integrated video conferencing. The service is considered delivered when the session is conducted or when the scheduled time passes (in case of no-show).",
      "Platform subscriptions: Subscription features are activated immediately upon successful payment. Premium features, add-ons, and incubation portal access are provisioned within minutes of payment confirmation.",
      "Event access: Paid event registrations grant immediate access to event details and updates. Virtual event access links are provided before the scheduled event time.",
    ],
  },
  {
    title: "Office Space and Facility Bookings",
    content: [
      "Office space subscriptions: Access to physical office spaces is granted upon approval by the incubator administrator. The approval process typically takes 1-3 business days after payment.",
      "Facility reservations: Meeting room and facility bookings are confirmed instantly (if auto-approval is enabled) or within 24 hours (if manual approval is required by the incubator). Confirmation notifications include all access details.",
      "Physical access credentials (keycards, access codes) are issued by the respective incubator and are outside EcoSync's delivery scope.",
    ],
  },
  {
    title: "Freelancer Marketplace Deliverables",
    content: [
      "Project deliverables in the freelancer marketplace are exchanged directly between the freelancer and client through the platform's file sharing and milestone delivery system.",
      "Deliverable approval and payment release follow the milestone-based workflow. Clients review submissions and either approve (triggering payment) or request revisions.",
      "EcoSync facilitates the exchange but does not guarantee delivery timelines between freelancers and clients. These are governed by the individual project agreements between parties.",
    ],
  },
  {
    title: "Service Activation Issues",
    content: [
      "If a paid service is not activated within the expected timeframe, please contact our support team immediately. Common resolution steps include: payment verification, account status check, and manual service provisioning.",
      "Payment confirmed but service not activated: In rare cases of system delays, services are typically auto-provisioned within 1 hour. If the delay exceeds 2 hours, contact support for immediate resolution.",
      "If we are unable to deliver the purchased service (due to technical issues on our end), you will receive a full refund as per our Refund Policy.",
    ],
  },
  {
    title: "Returns and Service Reversals",
    content: [
      "Since our services are digital and often consumed in real-time, traditional 'returns' do not apply. However, the following reversals are supported:",
      "Unused session credits: Can be retained in your account or refunded per our Refund Policy terms. Unused credits from cancelled mentors are automatically refunded.",
      "Subscription downgrades: Feature access is reduced at the end of the current billing period. No refund is issued for the remaining period of the higher tier.",
      "Account deletion: Upon account deletion, all active subscriptions are cancelled and eligible refunds are processed automatically. Non-refundable consumed services are not reversed.",
    ],
  },
  {
    title: "Service Unavailability",
    content: [
      "In the event of extended platform downtime (exceeding 24 consecutive hours) due to issues within our control, affected users with active paid subscriptions will receive a pro-rated credit for the downtime period.",
      "Scheduled maintenance windows (announced at least 48 hours in advance) do not qualify for service credits. We schedule maintenance during off-peak hours to minimize disruption.",
      "Third-party service outages (Razorpay, Jitsi, hosting infrastructure) that affect platform functionality are addressed as quickly as possible but do not independently trigger service credits unless they result in extended unavailability of core features.",
    ],
  },
  {
    title: "Incubation Portal Service Delivery",
    content: [
      "New incubation portal tenants: Portal provisioning (subdomain setup, admin account creation, module configuration) is completed within 24 hours of subscription activation. Setup assistance is provided during onboarding.",
      "Add-on features: Additional modules or capacity upgrades for incubation portals are activated within 4 hours of payment confirmation.",
      "Custom domain setup: Custom domain configuration for incubation portals requires DNS propagation and may take up to 48 hours to fully activate after configuration.",
    ],
  },
  {
    title: "Communication About Delivery",
    content: [
      "You will receive email and in-app notifications at each stage of service delivery: payment confirmation, service activation, and any relevant access details.",
      "For subscription renewals, you will be notified before the renewal date. Failed renewal payments trigger a grace period notification before service suspension.",
      "All delivery-related communications are sent to your registered email address. Ensure your contact information is current in your account settings.",
    ],
  },
  {
    title: "Contact for Delivery Issues",
    content: [
      "For any service delivery issues, activation delays, or questions about your purchased services, please contact our support team at support@ecosync.co.in with your transaction reference and a description of the issue.",
      "Our support team operates Monday through Saturday, 9:00 AM to 7:00 PM IST. Emergency service issues are monitored 24/7 through our automated systems.",
    ],
  },
];

export default function ShippingAndReturnsPage() {
  return (
    <PolicyLayout
      title="Shipping and Returns Policy"
      subtitle="EcoSync is a digital platform. This policy explains how our services are delivered, activated, and how returns are handled for our digital offerings."
      lastUpdated="June 21, 2026"
      sections={sections}
    />
  );
}
