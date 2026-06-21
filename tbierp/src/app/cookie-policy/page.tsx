import PolicyLayout from "@/component/policy/PolicyLayout";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Cookie Policy — How We Use Cookies and Tracking",
  description:
    "Learn about the cookies and tracking technologies used on EcoSync. Understand cookie types, purposes, and how to manage your cookie preferences.",
  keywords: [
    "ecosync cookie policy",
    "ecosync cookies",
    "tracking technologies ecosync",
    "cookie preferences",
    "ecosync data tracking",
  ],
  path: "/cookie-policy",
});

const sections = [
  {
    title: "What Are Cookies?",
    content: [
      "Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences, maintain your session, and provide analytics about how the site is used. EcoSync uses cookies and similar technologies (local storage, session storage) to operate effectively.",
      "This Cookie Policy explains what cookies we use, why we use them, and how you can control your cookie preferences. This policy should be read alongside our Privacy Policy for a complete understanding of our data practices.",
    ],
  },
  {
    title: "Essential Cookies",
    content: [
      "These cookies are strictly necessary for the platform to function. They enable core features like authentication, session management, and security protections. Without these cookies, you cannot use EcoSync.",
      "Examples include: authentication tokens (JWT stored in secure cookies), CSRF protection tokens, session identifiers, tenant context for incubation portal access, and load balancer session persistence cookies.",
      "Essential cookies cannot be disabled as they are fundamental to platform security and functionality. They do not collect marketing data and are cleared when you log out or your session expires.",
    ],
  },
  {
    title: "Functional Cookies",
    content: [
      "Functional cookies remember your preferences and settings to provide a personalized experience. They are not strictly necessary but significantly improve your platform usage.",
      "Examples include: language and locale preferences, timezone settings, notification preferences, sidebar collapse state, theme preferences, recently viewed pages, and dashboard layout configurations.",
      "These cookies persist between sessions (typically 30-90 days) so your preferences are maintained across visits. You can disable functional cookies, but some personalization features will not work correctly.",
    ],
  },
  {
    title: "Analytics Cookies",
    content: [
      "Analytics cookies help us understand how users interact with the platform so we can identify issues, measure feature adoption, and improve the overall experience. All analytics data is aggregated and cannot identify individual users.",
      "We may use analytics services to track: page views and navigation patterns, feature usage frequency, error rates and performance metrics, device and browser information, and session duration.",
      "Analytics cookies can be disabled through your cookie preferences without affecting platform functionality. We recommend keeping them enabled to help us build a better product for the ecosystem.",
    ],
  },
  {
    title: "Marketing and Advertising Cookies",
    content: [
      "EcoSync currently does not use third-party advertising or retargeting cookies. We do not serve ads on our platform and we do not share your browsing behavior with advertising networks.",
      "If we introduce marketing cookies in the future, we will update this policy and request your explicit consent before placing any marketing-related cookies on your device.",
    ],
  },
  {
    title: "Third-Party Cookies",
    content: [
      "Some cookies may be set by third-party services integrated into our platform. These include: Razorpay (payment processing — necessary for secure transactions), Jitsi (video conferencing — session cookies for video calls), and any embedded content from external sources.",
      "Third-party cookies are governed by the respective third party's privacy and cookie policies. We recommend reviewing Razorpay's privacy policy for details about their payment-related cookies.",
      "We carefully evaluate all third-party integrations and only work with partners who maintain strong data protection standards.",
    ],
  },
  {
    title: "Local Storage and Session Storage",
    content: [
      "In addition to cookies, we use browser local storage and session storage for certain platform features. These technologies serve similar purposes to cookies but have different persistence and scope characteristics.",
      "Local storage is used for: caching user preferences, storing draft content (unsaved posts, form progress), offline data access where supported, and UI state management.",
      "Session storage is used for: temporary navigation state, form submission protection against duplicates, and session-specific UI contexts. Session storage is automatically cleared when you close your browser tab.",
    ],
  },
  {
    title: "Managing Your Cookie Preferences",
    content: [
      "You can manage your cookie preferences through your browser settings. Most browsers allow you to: view and delete existing cookies, block all cookies or only third-party cookies, set preferences for specific websites, and receive notifications when cookies are being set.",
      "Browser-specific instructions: Chrome (Settings > Privacy and Security > Cookies), Firefox (Settings > Privacy & Security > Cookies), Safari (Preferences > Privacy > Cookies), Edge (Settings > Cookies and Site Permissions).",
      "Please note that blocking essential cookies will prevent you from using EcoSync. Blocking functional cookies may reduce personalization. We recommend keeping essential and functional cookies enabled for the best experience.",
    ],
  },
  {
    title: "Cookie Duration",
    content: [
      "Session cookies: Automatically deleted when you close your browser. Used for authentication sessions and temporary state.",
      "Persistent cookies: Remain on your device for a set period (ranging from 24 hours to 12 months depending on purpose). Used for preferences, analytics, and remember-me functionality.",
      "Authentication cookies: Our JWT tokens have configurable expiration (default 7 days for access tokens, 30 days for refresh tokens). These are cleared on logout.",
    ],
  },
  {
    title: "Do Not Track",
    content: [
      "EcoSync respects Do Not Track (DNT) browser signals. When DNT is enabled, we disable non-essential analytics cookies and limit tracking to what is strictly necessary for platform functionality.",
      "Note that enabling DNT does not affect essential cookies or first-party functional cookies necessary for your personalized experience on EcoSync.",
    ],
  },
  {
    title: "Updates to This Policy",
    content: [
      "We may update this Cookie Policy periodically to reflect changes in our cookie practices, new features, or regulatory requirements. The 'Last updated' date at the top of this page indicates when the policy was last revised.",
      "For significant changes that affect your cookie preferences, we will notify you through the platform and provide an opportunity to review and update your settings.",
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <PolicyLayout
      title="Cookie Policy"
      subtitle="This policy explains how EcoSync uses cookies and similar technologies to recognize you, remember your preferences, and help us understand how our platform is used."
      lastUpdated="June 21, 2026"
      sections={sections}
    />
  );
}
