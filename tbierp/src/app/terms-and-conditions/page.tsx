import PolicyLayout from "@/component/policy/PolicyLayout";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Terms and Conditions — Platform Usage Agreement",
  description:
    "Read the terms and conditions governing your use of the EcoSync platform. Understand user responsibilities, platform rules, and service agreements.",
  keywords: [
    "ecosync terms and conditions",
    "ecosync user agreement",
    "platform terms of service",
    "ecosync legal terms",
    "ecosync usage policy",
  ],
  path: "/terms-and-conditions",
});

const sections = [
  {
    title: "Acceptance of Terms",
    content: [
      "By accessing or using the EcoSync platform (ecosync.network and ecosync.co), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you may not use our services. These terms apply to all users, including founders, mentors, investors, freelancers, professionals, students, and incubation staff.",
      "We reserve the right to modify these terms at any time. Material changes will be communicated through the platform or via email at least 14 days before taking effect. Continued use after changes constitutes acceptance.",
    ],
  },
  {
    title: "Account Registration and Eligibility",
    content: [
      "You must be at least 16 years of age to create an account on EcoSync. By registering, you represent that you meet this age requirement and that all information provided is accurate, complete, and current.",
      "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use or security breach.",
      "We reserve the right to suspend or terminate accounts that violate these terms, provide false information, or engage in harmful behavior. Account suspension decisions can be appealed through our support team.",
    ],
  },
  {
    title: "Platform Services",
    content: [
      "EcoSync provides a unified startup ecosystem platform with multiple interconnected services including social networking, mentorship marketplace, job board, events, communities, investor tools, freelancer marketplace, and incubation management portals.",
      "We strive to maintain platform availability and performance but do not guarantee uninterrupted access. Scheduled maintenance, emergency fixes, and force majeure events may cause temporary service disruptions.",
      "Features and pricing are subject to change. We will provide reasonable notice before discontinuing major features or making changes that materially affect your use of the platform.",
    ],
  },
  {
    title: "User Conduct",
    content: [
      "You agree to use EcoSync in a lawful, respectful, and professional manner. Prohibited activities include: impersonation, harassment, spam, distribution of malware, unauthorized data collection, interference with platform operations, and any illegal activity.",
      "Content you post must not be defamatory, obscene, discriminatory, infringing on intellectual property rights, or otherwise harmful. We reserve the right to remove content that violates these standards and to take action against offending accounts.",
      "You agree not to use automated tools, bots, or scrapers to access the platform without explicit written permission. Rate limiting and access controls are in place to ensure fair usage for all participants.",
    ],
  },
  {
    title: "Intellectual Property",
    content: [
      "The EcoSync platform, including its design, code, branding, logos, and documentation, is the intellectual property of Opernova Technologies LLP. You may not reproduce, distribute, or create derivative works without written permission.",
      "Content you create and post on EcoSync (posts, articles, comments, profile information) remains your intellectual property. By posting content, you grant EcoSync a non-exclusive, worldwide, royalty-free license to display, distribute, and promote your content within the platform and its marketing materials.",
      "You retain full ownership of your startup data, application materials, business plans, and other proprietary information submitted through the platform. Incubators access your application data only within the context of their program evaluation workflow.",
    ],
  },
  {
    title: "Mentorship and Session Terms",
    content: [
      "Mentorship sessions facilitated through EcoSync are agreements between the mentor and mentee. EcoSync serves as a facilitator and payment processor, not a party to the mentorship relationship.",
      "Session cancellation and refund policies are defined per-mentor in their booking settings. Mentors set their own rates, availability, and cancellation windows. EcoSync processes refunds according to the established policies.",
      "EcoSync does not guarantee the quality, accuracy, or outcomes of mentorship advice. Mentors are independent professionals and their guidance should not be considered as professional legal, financial, or medical advice.",
    ],
  },
  {
    title: "Payments and Fees",
    content: [
      "All payments on the platform are processed through Razorpay. By making a payment, you agree to Razorpay's terms of service in addition to ours. We do not store complete payment card details.",
      "Platform fees (commission on sessions, subscription fees for incubators, freelancer platform fees) are clearly disclosed before each transaction. Fee schedules are available in the relevant portal settings.",
      "In case of payment disputes, please contact our support team within 30 days of the transaction. We will investigate and resolve disputes in accordance with our refund policy and applicable consumer protection laws.",
    ],
  },
  {
    title: "Incubation Portal Terms",
    content: [
      "Incubators subscribing to EcoSync's multi-tenant SaaS portal agree to additional terms governing their tenant account, data responsibilities, and subscriber obligations. Tenant administrators are responsible for their portal's content and user management.",
      "Incubator tenants must comply with applicable laws regarding the data of startups and individuals within their portal. EcoSync provides tools for data management but tenant administrators bear responsibility for their usage.",
      "Subscription cancellation results in portal deactivation after the current billing period. Data export is available for 30 days following cancellation, after which tenant data is permanently deleted.",
    ],
  },
  {
    title: "Limitation of Liability",
    content: [
      "EcoSync is provided on an 'as is' and 'as available' basis. We make no warranties, express or implied, regarding the platform's suitability for any particular purpose, reliability, or availability.",
      "To the maximum extent permitted by law, Opernova Technologies LLP shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including loss of profits, data, or business opportunities.",
      "Our total liability for any claim arising from these terms or your use of EcoSync shall not exceed the amount you paid to us in the 12 months preceding the claim, or INR 10,000, whichever is greater.",
    ],
  },
  {
    title: "Dispute Resolution",
    content: [
      "Any disputes arising from these terms or your use of EcoSync shall be governed by the laws of India. You agree to first attempt to resolve disputes informally by contacting our support team.",
      "If informal resolution is not possible within 30 days, disputes shall be settled through binding arbitration in accordance with the Arbitration and Conciliation Act, 1996, with the seat of arbitration in Pune, Maharashtra.",
      "You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.",
    ],
  },
  {
    title: "Termination",
    content: [
      "You may terminate your account at any time through your account settings or by contacting support. Upon termination, your access to the platform ceases and your data is handled according to our data retention policies.",
      "We may terminate or suspend your account immediately, without prior notice, if you violate these terms, engage in harmful behavior, or if required by law. We will provide a reason for termination when legally permissible.",
    ],
  },
  {
    title: "Governing Law",
    content: [
      "These Terms and Conditions are governed by and construed in accordance with the laws of India, without regard to conflict of law principles. The courts of Pune, Maharashtra shall have exclusive jurisdiction over any legal proceedings.",
      "If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force and effect.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout
      title="Terms and Conditions"
      subtitle="These terms govern your access to and use of the EcoSync platform. Please read them carefully before using our services."
      lastUpdated="June 21, 2026"
      sections={sections}
    />
  );
}
