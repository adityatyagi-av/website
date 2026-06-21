import PolicyLayout from "@/component/policy/PolicyLayout";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Refund Policy — Cancellations and Refund Terms",
  description:
    "Understand EcoSync's refund policy for mentorship sessions, subscriptions, office space bookings, and event registrations. Clear terms for cancellations and refunds.",
  keywords: [
    "ecosync refund policy",
    "ecosync cancellation policy",
    "mentorship session refund",
    "ecosync subscription refund",
    "ecosync payment refund",
  ],
  path: "/refund-policy",
});

const sections = [
  {
    title: "Overview",
    content: [
      "This Refund Policy outlines the terms and conditions under which refunds are provided for various paid services on the EcoSync platform. Different services have different refund terms based on their nature and delivery method.",
      "All refunds are processed through Razorpay, our payment gateway partner. Refund processing times depend on your payment method and bank, typically ranging from 5 to 10 business days after approval.",
    ],
  },
  {
    title: "Mentorship Session Refunds",
    content: [
      "Mentorship session refund eligibility depends on the cancellation timing relative to the scheduled session and the mentor's configured cancellation policy. Each mentor sets their own free cancellation window (minimum 24 hours by default).",
      "Full refund: If you cancel within the mentor's free cancellation window (typically 24+ hours before the session), you receive a full refund of the session fee.",
      "Partial refund: If you cancel after the free cancellation window but before the session starts, a partial refund may be issued based on the mentor's policy (typically 50% of the session fee).",
      "No refund: If you do not attend the session (no-show) without prior cancellation, no refund is issued. The mentor is compensated for their reserved time.",
      "Mentor-initiated cancellation: If a mentor cancels a confirmed session, you receive an automatic full refund regardless of timing.",
    ],
  },
  {
    title: "Session Package Refunds",
    content: [
      "Session packages (bundles) can be refunded on a pro-rated basis for unused sessions within 14 days of purchase. After 14 days, unused sessions remain available until the package expiry date but are not refundable.",
      "If a mentor deactivates their profile or becomes unavailable before you use all sessions in a package, you will receive a pro-rated refund for the remaining unused sessions.",
      "Partially used packages: Refund amount = (Total package price / Total sessions) x Remaining unused sessions, minus any discount originally applied.",
    ],
  },
  {
    title: "Office Space Subscription Refunds",
    content: [
      "Office space subscriptions operate on a billing cycle basis. Cancellation stops future billing but does not refund the current billing period. Your access remains active until the end of the paid period.",
      "New subscriptions: A 48-hour cooling-off period applies to new office space subscriptions. If you cancel within 48 hours of your first payment, you receive a full refund.",
      "Pro-rated refunds for office subscriptions are only issued in cases where the incubator terminates the space availability or if the office is unusable due to circumstances outside your control.",
    ],
  },
  {
    title: "Event Registration Refunds",
    content: [
      "Free events: No refund applicable. You can cancel your registration at any time.",
      "Paid events: Refund eligibility depends on the event organizer's cancellation policy, which is displayed during the registration process.",
      "Event cancellation by organizer: If an event is cancelled by the organizer, all paid attendees receive a full automatic refund within 5-7 business days.",
      "Event rescheduling: If an event is rescheduled, your registration transfers to the new date. If you cannot attend the new date, you may request a refund within 7 days of the rescheduling announcement.",
    ],
  },
  {
    title: "Incubation Portal Subscriptions",
    content: [
      "Incubation portal subscriptions (for incubator tenants) are billed on a monthly or annual basis. Monthly subscriptions can be cancelled at any time; access continues until the end of the current billing period.",
      "Annual subscriptions: A pro-rated refund is available within the first 30 days if the platform does not meet your requirements. After 30 days, annual subscriptions are non-refundable but can be cancelled to prevent renewal.",
      "Add-on services purchased for the incubation portal follow the same refund terms as the base subscription.",
    ],
  },
  {
    title: "Freelancer Marketplace Refunds",
    content: [
      "Payments for freelancer gigs and projects are held in escrow until milestones are approved by the client. If a milestone is disputed, funds remain in escrow until resolution.",
      "If a project is cancelled before any milestones are completed, the client receives a full refund of any held escrow amounts. Platform fees on cancelled projects are also refunded.",
      "For milestone-based disputes, our support team mediates between client and freelancer. Refund decisions are made based on the evidence of work delivered and the original scope agreement.",
    ],
  },
  {
    title: "How to Request a Refund",
    content: [
      "Most refund-eligible cancellations are processed automatically through the platform when you use the cancel button within the eligible window. The refund is initiated instantly and processed by Razorpay.",
      "For situations requiring manual review, contact our support team at support@ecosync.co.in with your transaction details, reason for refund, and any supporting information. We respond to refund requests within 3 business days.",
      "Required information for manual refund requests: transaction ID or booking reference, date of purchase, reason for refund request, and your registered email address.",
    ],
  },
  {
    title: "Refund Processing Times",
    content: [
      "Once a refund is approved, processing times vary by payment method: UPI refunds take 1-3 business days, credit/debit card refunds take 5-7 business days, and net banking refunds take 7-10 business days.",
      "You will receive an email notification when your refund is initiated and another when it is completed by the payment gateway. If you do not receive your refund within the expected timeframe, please contact support.",
    ],
  },
  {
    title: "Non-Refundable Items",
    content: [
      "The following are not eligible for refunds: platform account fees (if applicable), completed mentorship sessions where both parties participated, expired session packages past their validity period, event tickets used for attended events, and any service where the full value has already been delivered.",
      "Refunds will not be issued for dissatisfaction with mentoring advice, investment outcomes, hiring results, or other subjective assessments of service quality. Our reviews and ratings system exists to help users make informed choices.",
    ],
  },
  {
    title: "Disputes and Escalation",
    content: [
      "If you disagree with a refund decision, you may escalate through our support team within 14 days of the decision. Escalated cases are reviewed by a senior team member who was not involved in the original decision.",
      "As a last resort, unresolved payment disputes may be pursued through Razorpay's dispute resolution process or through the legal remedies outlined in our Terms and Conditions.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      title="Refund Policy"
      subtitle="Clear and fair refund terms for all paid services on EcoSync, including mentorship sessions, subscriptions, events, and marketplace transactions."
      lastUpdated="June 21, 2026"
      sections={sections}
    />
  );
}
