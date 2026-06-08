'use client'
import { LegalLayout, LegalH2, LegalP, LegalList } from '../marketing-sections'

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      meta="Effective Date: July 1, 2025  ·  Operator: Carter King"
      navId="prkey" ftId="prftkey"
    >
      <LegalP>
        Clavis (&#x201C;we,&#x201D; &#x201C;us,&#x201D; or &#x201C;our&#x201D;) is a credit card wallet optimizer that helps users track card rewards, monitor perks and credits, and identify which card to use at a given merchant. This Privacy Policy describes what personal information we collect, how we use and protect it, and the rights you have with respect to your data.
      </LegalP>
      <LegalP>By creating an account or using the Service, you acknowledge that you have read and agree to this Privacy Policy.</LegalP>

      <LegalH2>1. Information We Collect</LegalH2>
      <LegalP><strong style={{ color: 'var(--text-primary)' }}>a. Account Information</strong> — When you register, we collect your email address and a password. Passwords are hashed by Supabase before storage; we never have access to your plain-text password.</LegalP>
      <LegalP><strong style={{ color: 'var(--text-primary)' }}>b. Card Information You Enter</strong> — You may manually enter details about your credit or debit cards, which may include:</LegalP>
      <LegalList items={[
        'card name or nickname;',
        'last four digits of the card number;',
        'annual fee;',
        'rewards rates by purchase category; and',
        'current balance (optional).',
      ]} />
      <LegalP>We do not collect full card numbers, CVVs, PINs, or any banking login credentials. Clavis does not connect to your bank or card issuer and does not use Plaid or any open banking integration.</LegalP>
      <LegalP><strong style={{ color: 'var(--text-primary)' }}>c. Purchase History You Log</strong> — You may manually log individual purchases, including the merchant name, category, amount, and estimated rewards earned. All purchase data is entered by you — we do not retrieve it from any financial institution.</LegalP>
      <LegalP><strong style={{ color: 'var(--text-primary)' }}>d. Email Preferences</strong> — If you opt in to weekly email summaries, we retain your email address and send digests of your card perks and credits through Resend, our email delivery provider. You may unsubscribe at any time using the link included in every email.</LegalP>
      <LegalP><strong style={{ color: 'var(--text-primary)' }}>e. Usage and Technical Data</strong> — Clavis is hosted on Vercel, which may automatically collect standard server log data such as IP address, browser type, device type, and pages visited. Supabase may similarly log database access events. This data is used solely for service operation, security monitoring, and performance analysis. We do not operate additional third-party analytics tools beyond what Vercel and Supabase collect by default.</LegalP>
      <LegalP><strong style={{ color: 'var(--text-primary)' }}>f. Support Communications</strong> — If you contact us for support, we retain the content of your message and your email address in order to respond. Support requests may be directed to <a href="mailto:carterking18@gmail.com" style={{ color: 'var(--blue)' }}>carterking18@gmail.com</a>.</LegalP>

      <LegalH2>2. How We Use Your Information</LegalH2>
      <LegalP>We use the information you provide to:</LegalP>
      <LegalList items={[
        'operate and maintain your Clavis account;',
        'calculate estimated rewards and generate card-use recommendations;',
        'send weekly perk and credit summaries if you have opted in;',
        'respond to support and account inquiries;',
        'detect and prevent fraudulent or abusive use of the Service; and',
        'improve and develop features of the Service.',
      ]} />
      <LegalP>We do not use your data for advertising purposes and we do not sell your personal information to third parties.</LegalP>

      <LegalH2>3. Third-Party Service Providers</LegalH2>
      <LegalP>We share data with the following service providers solely to operate the Service:</LegalP>
      <LegalList items={[
        <>Supabase — authentication and database storage. Supabase&#x2019;s privacy policy is available at supabase.com/privacy.</>,
        <>Resend — delivery of optional weekly email summaries. Resend&#x2019;s privacy policy is available at resend.com/privacy.</>,
        <>Vercel — web application hosting. Vercel may collect standard server log data as described above. Vercel&#x2019;s privacy policy is available at vercel.com/legal/privacy-policy.</>,
      ]} />
      <LegalP>We do not share personal information with any other third parties except as required by law.</LegalP>

      <LegalH2>4. Cookies and Tracking Technologies</LegalH2>
      <LegalP>Clavis uses cookies and session tokens solely to maintain your authenticated login session and provide core application functionality. We do not use advertising cookies, tracking pixels, or cross-site behavioral tracking. Disabling cookies in your browser will prevent you from logging in to the Service.</LegalP>

      <LegalH2>5. Data Security</LegalH2>
      <LegalP>Data is stored and transmitted using industry-standard encryption provided by Supabase. Passwords are hashed prior to storage. We do not store full card numbers, CVVs, or banking credentials.</LegalP>
      <LegalP>No method of electronic storage or transmission is completely secure. While we take reasonable precautions to protect your information, we cannot guarantee absolute security.</LegalP>

      <LegalH2>6. Data Retention and Deletion</LegalH2>
      <LegalP>We retain your account data for as long as your account remains active. If you request deletion of your account, we will permanently delete all associated personal data — including card information, purchase history, and email preferences — within thirty (30) days of your request. This deletion is irreversible.</LegalP>
      <LegalP>To request account deletion, contact us at <a href="mailto:carterking18@gmail.com" style={{ color: 'var(--blue)' }}>carterking18@gmail.com</a>.</LegalP>

      <LegalH2>7. Your Rights</LegalH2>
      <LegalP>You have the right to:</LegalP>
      <LegalList items={[
        'Access — request a copy of the personal information we hold about you;',
        'Correction — update inaccurate information in your account;',
        'Deletion — request permanent deletion of your account and all associated data;',
        'Opt-out — unsubscribe from marketing emails at any time; and',
        'Data portability — receive a copy of your data in a portable format upon request.',
      ]} />
      <LegalP>Residents of California, Virginia, Colorado, and certain other states may have additional rights under applicable state privacy laws, including the right to opt out of the sale of personal information (we do not sell personal information) and the right to non-discrimination for exercising privacy rights. To exercise any of the rights listed above, contact us at <a href="mailto:carterking18@gmail.com" style={{ color: 'var(--blue)' }}>carterking18@gmail.com</a>.</LegalP>

      <LegalH2>8. Children&#x2019;s Privacy</LegalH2>
      <LegalP>The Service is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has submitted personal information through the Service, please contact us and we will delete it promptly.</LegalP>

      <LegalH2>9. Changes to This Policy</LegalH2>
      <LegalP>We may update this Privacy Policy from time to time. When we do, we will revise the Effective Date above. For material changes, we will notify registered users by email. Your continued use of the Service following any update constitutes acceptance of the revised policy.</LegalP>

      <LegalH2>10. Contact</LegalH2>
      <LegalP>Questions or requests regarding this Privacy Policy may be directed to:</LegalP>
      <LegalP>
        Carter King<br/>
        New Hampshire, United States<br/>
        <a href="mailto:carterking18@gmail.com" style={{ color: 'var(--blue)' }}>carterking18@gmail.com</a>
      </LegalP>
    </LegalLayout>
  )
}
