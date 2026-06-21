import PolicyLayout from "@/component/policy/PolicyLayout";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Privacy Policy — How We Protect Your Data",
  description:
    "Learn how EcoSync collects, uses, and protects your personal information. Our privacy policy explains data handling, user rights, and security measures.",
  keywords: [
    "ecosync privacy policy",
    "data protection ecosync",
    "ecosync personal data",
    "privacy policy startup platform",
    "ecosync gdpr compliance",
  ],
  path: "/privacy-policy",
});

const sections = [
  {
    title: "Information We Collect",
    content: [
      "We collect information you provide directly to us when you create an account, fill out your profile, submit applications, book sessions, or contact our support team. This includes your name, email address, phone number, professional details, and any other information you choose to share.",
      "We also collect information automatically when you use our platform, including your IP address, browser type, operating system, device identifiers, pages visited, time spent on pages, and interaction patterns. This data helps us improve platform performance and personalize your experience.",
      "When you use payment features (session bookings, office subscriptions, package purchases), payment processing is handled securely through Razorpay. We do not store your complete credit card or bank account details on our servers.",
    ],
  },
  {
    title: "How We Use Your Information",
    content: [
      "We use your personal information to provide, maintain, and improve the EcoSync platform services. This includes processing your account registration, facilitating connections with other ecosystem participants, enabling mentorship session bookings, processing payments, and delivering notifications about platform activity.",
      "We use your profile data to power our discovery and matching algorithms, helping mentors find mentees, investors find startups, and professionals find relevant opportunities. You control your visibility settings and can opt out of discovery at any time.",
      "We may use aggregated, anonymized data for analytics, platform improvement, and research purposes. This data cannot be used to identify individual users.",
    ],
  },
  {
    title: "Data Sharing and Disclosure",
    content: [
      "We do not sell your personal information to third parties. We share your data only in the following circumstances: with your explicit consent, with service providers who assist us in operating the platform (hosting, payment processing, email delivery), when required by law or legal process, or to protect the rights and safety of our users and the public.",
      "When you participate in incubation programs, your application data is shared with the relevant incubator administration as part of the program workflow. Mentor profiles are visible to ecosystem participants based on the mentor's visibility settings.",
      "In the event of a merger, acquisition, or sale of assets, user data may be transferred as part of the transaction. We will notify affected users before their data is subject to a different privacy policy.",
    ],
  },
  {
    title: "Data Security",
    content: [
      "We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. This includes encryption of data in transit (TLS/SSL), secure server infrastructure, access controls, and regular security audits.",
      "Your authentication credentials are protected using bcrypt hashing. Session tokens are managed with short expiration periods and secure cookie settings. Multi-factor authentication is available for additional account security.",
      "Despite our efforts, no method of electronic storage or transmission is 100% secure. We encourage users to choose strong passwords, enable two-factor authentication, and report any suspicious account activity immediately.",
    ],
  },
  {
    title: "Your Rights and Choices",
    content: [
      "You have the right to access, correct, update, or delete your personal information at any time through your account settings. You can download a copy of your data, update your privacy preferences, or request account deletion.",
      "You can control notification preferences, discovery visibility, profile visibility, and data sharing settings from your account settings page. These changes take effect immediately.",
      "If you are located in the European Economic Area (EEA) or other jurisdictions with data protection laws, you may have additional rights including the right to data portability, the right to restrict processing, and the right to object to processing.",
    ],
  },
  {
    title: "Cookies and Tracking",
    content: [
      "We use cookies and similar technologies to maintain your session, remember your preferences, and analyze platform usage. Essential cookies are required for platform functionality; analytics and preference cookies can be managed through your cookie settings.",
      "For detailed information about our cookie practices, please refer to our dedicated Cookie Policy page.",
    ],
  },
  {
    title: "Data Retention",
    content: [
      "We retain your personal information for as long as your account is active or as needed to provide services. If you request account deletion, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes (such as fraud prevention or financial record-keeping).",
      "Anonymized and aggregated data may be retained indefinitely for analytics and platform improvement purposes.",
    ],
  },
  {
    title: "Children's Privacy",
    content: [
      "EcoSync is not intended for individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that a user is under 16, we will promptly delete their account and associated data.",
    ],
  },
  {
    title: "International Data Transfers",
    content: [
      "EcoSync is operated from India. If you access our platform from outside India, your data may be transferred to and processed in India. By using our platform, you consent to this transfer. We take appropriate measures to ensure your data is protected in accordance with applicable laws.",
    ],
  },
  {
    title: "Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes through the platform or via email. Your continued use of EcoSync after changes take effect constitutes acceptance of the updated policy.",
      "We encourage you to review this page periodically for the latest information about our privacy practices.",
    ],
  },
  {
    title: "Contact Us",
    content: [
      "If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at legal@ecosync.co.in or through our contact page. Our Data Protection team will respond to your inquiry within 7 business days.",
      "Opernova Technologies LLP, responsible for the operation of EcoSync, is the data controller for the purposes of applicable data protection laws.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="Your privacy matters to us. This policy explains how EcoSync collects, uses, stores, and protects your personal information when you use our platform."
      lastUpdated="June 21, 2026"
      sections={sections}
    />
  );
}
