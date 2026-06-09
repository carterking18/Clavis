'use client'
import { LegalLayout } from '../marketing-sections'

const FAQS = [
  {
    q: 'What is Clavis?',
    a: 'Clavis helps you get the most out of the cards you already have. Add your cards, and Clavis tells you which one to use at any given merchant, tracks the perks and credits you’re entitled to, and shows you how much you’re earning — or leaving on the table — over time.',
  },
  {
    q: 'How does "Tap" work?',
    a: 'Search for or select the merchant or category you’re spending at, and Clavis recommends the best card from your wallet for that purchase based on its rewards rate and any matching perks you have. Enter the amount to see your estimated reward, then log the purchase ("Tap Clavis") to track it in your history.',
  },
  {
    q: 'How does Clavis pick the "Recommended" card?',
    a: 'Clavis looks at your card’s reward multipliers for that spending category, factors in the dollar value of points, miles, or cash back, and checks whether you have a relevant perk or credit — like a dining credit — that would make a specific card more valuable to use right now. If two cards are equally good, you’ll see "Tied," and you can always manually override the pick by selecting a different card.',
  },
  {
    q: 'What’s the difference between Wallet, Perks, and History?',
    a: [
      'Wallet is where you manage your cards — add or edit them, set annual fees and reward rates, and see whether each card has "paid for itself" through perks and rewards captured.',
      'Perks tracks recurring credits and benefits tied to your cards, like travel or dining credits, shows how much you have left to use, and flags ones expiring soon.',
      'History is your log of past purchases ("taps") and the rewards you earned from each one.',
    ],
  },
  {
    q: 'What is "Insights"?',
    a: 'Insights surfaces personalized opportunities: perks about to expire, past purchases where a different card in your wallet would have earned you more ("left on the table"), and recommendations for cards that could fit your spending patterns better.',
  },
  {
    q: 'Is the "estimated reward" a guarantee of what I’ll earn?',
    a: 'No — it’s an estimate based on the reward rate and category you select. Actual rewards depend on your card issuer’s terms, how the purchase is categorized by your bank, and other factors outside Clavis’s control. See our Terms of Service for more detail.',
  },
  {
    q: 'Do I need to link my bank account or enter my card number?',
    a: 'No. You manually add basic info about each card — name, last four digits, annual fee, and reward rates. Clavis does not ask for full card numbers, CVVs, or banking login credentials, and does not connect to your bank or card issuer.',
  },
  {
    q: 'How does Clavis calculate whether a card has "paid for itself"?',
    a: 'In the Wallet tab, Clavis adds up the value of perks you’ve captured and rewards you’ve earned on a card, and compares that total to its annual fee. Once captured value meets or exceeds the fee, the card is marked "Paid off."',
  },
  {
    q: 'What are the weekly summary emails?',
    a: 'If enabled, Clavis sends a weekly email recapping perks expiring soon and credits you haven’t used yet, so nothing falls through the cracks. You can turn these on or off anytime from the Perks tab, or unsubscribe directly from the email itself.',
  },
  {
    q: 'I think a card’s reward rate or annual fee is wrong — what do I do?',
    a: 'Open the card from your Wallet tab, scroll to the bottom of the edit panel, and click "Suggest a correction." Let us know what looks off and what you believe the correct value is — we review these submissions to keep card data accurate for everyone.',
  },
  {
    q: 'Is my data sold or shared with third parties?',
    a: ['No — your data is never sold or shared. See our Privacy Policy for the full details on what we collect and how it’s used.'],
  },
  {
    q: 'How do I delete my account or my data?',
    a: `Open the Account menu in the top-right corner of your dashboard and select "Delete account." You’ll be asked to type DELETE to confirm. This immediately and permanently removes your account and all associated data — cards, perks, purchase history, and email preferences. This action is irreversible. You can also reach us at carterking18@gmail.com if you need help.`,
  },
]

export default function FAQ() {
  return (
    <LegalLayout title="Frequently Asked Questions" navId="faqkey" ftId="faqftkey">
      {FAQS.map((item, i) => (
        <div key={i} style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: i < FAQS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <div style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            {item.q}
          </div>
          {Array.isArray(item.a) ? item.a.map((p, pi) => (
            <p key={pi} style={{ fontSize: '14.5px', lineHeight: '1.7', color: 'var(--text-secondary)', marginBottom: pi < item.a.length - 1 ? '10px' : 0 }}>{p}</p>
          )) : (
            <p style={{ fontSize: '14.5px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>{item.a}</p>
          )}
        </div>
      ))}

      <div style={{ marginTop: '8px', padding: '18px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Still have a question?</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Reach out anytime at <a href="mailto:carterking18@gmail.com" style={{ color: 'var(--blue)' }}>carterking18@gmail.com</a> — we read every message.
        </div>
      </div>
    </LegalLayout>
  )
}
