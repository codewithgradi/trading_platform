export type Feature = { title: string; description: string; icon: string };
export type Step = { title: string; description: string };
export type Showcase = { title: string; description: string; checks: string[]; button: string; href: string; variant: "client" | "trader"; side: "left" | "right" };
export type TeamMember = { id: string; name: string; role: string; bio: string; avatarUrl: string };
export type PublicContent = {
  site: { name: string; tagline: string; email: string; phone: string; location: string; seoTitle: string; seoDescription: string; linkedin: string; instagram: string; logoUrl: string };
  hero: { eyebrow: string; title: string; description: string; cta: string; ctaHref: string; secondary: string; secondaryHref: string; imageUrl: string; focalX: number; focalY: number; overlay: number };
  features: { eyebrow: string; title: string; subtitle: string; items: Feature[] };
  showcase: { eyebrow: string; title: string; subtitle: string; rows: Showcase[] };
  steps: { eyebrow: string; title: string; subtitle: string; items: Step[] };
  preview: { eyebrow: string; title: string; description: string; cta: string };
  about: { eyebrow: string; title: string; body: string; mission: string; imageUrl: string; figures: { value: string; label: string }[] };
  contact: { eyebrow: string; title: string; subtitle: string };
  risk: { title: string; body: string };
  legal_terms: { title: string; body: string };
  legal_privacy: { title: string; body: string };
  legal_risk: { title: string; body: string };
};

export const defaultContent: PublicContent = {
  site: { name: "Northline", tagline: "A clearer view of your capital.", email: "hello@northline.co.za", phone: "+27 21 012 4800", location: "Cape Town, South Africa", seoTitle: "Northline | A clearer view of your capital", seoDescription: "Thoughtful trading, transparent reporting and a direct line of sight to your capital. Explore a more considered way to invest with Northline.", linkedin: "https://www.linkedin.com", instagram: "https://www.instagram.com", logoUrl: "" },
  hero: { eyebrow: "A MORE CONSIDERED WAY FORWARD", title: "Your capital deserves a clearer view.", description: "Professional trading, transparent reporting and every important number in one place. Move forward with confidence, not guesswork.", cta: "Get in touch", ctaHref: "/#contact", secondary: "Explore how it works", secondaryHref: "/#how-it-works", imageUrl: "/images/hero-city.jpg", focalX: 50, focalY: 50, overlay: 68 },
  features: { eyebrow: "THE NORTHLINE APPROACH", title: "Confidence is built on clarity.", subtitle: "The right expertise matters. So does knowing exactly where you stand, every step of the way.", items: [
    { icon: "users", title: "Experienced hands", description: "Your capital is managed by dedicated traders with a measured, disciplined approach." },
    { icon: "scan", title: "Nothing out of sight", description: "Clear reporting makes it easier to understand what is happening and why." },
    { icon: "activity", title: "A live perspective", description: "Follow your balance and activity as they change, all from one secure portal." },
    { icon: "shield", title: "Control stays with you", description: "Request withdrawals and raise questions directly, whenever you need to." },
  ] },
  showcase: { eyebrow: "BUILT AROUND YOUR VIEW", title: "Clarity, wherever you look.", subtitle: "A simple, connected experience for the people behind every decision.", rows: [
    { title: "The full picture, in real time.", description: "Your personal portal turns complex activity into a clear view of your balance, your history and the people managing your capital.", checks: ["Live balance and performance history", "A complete, searchable transaction record", "Updates that arrive when something changes"], button: "Explore the client portal", href: "/login", variant: "client", side: "left" },
    { title: "Better tools for better decisions.", description: "Our traders work in a connected environment designed for attentive management, careful record-keeping and timely communication.", checks: ["One view of every assigned client", "Considered trade and balance workflows", "Direct conversations, without the wait"], button: "How we work", href: "/#how-it-works", variant: "trader", side: "right" },
  ] },
  steps: { eyebrow: "THE JOURNEY", title: "Simple from the first step.", subtitle: "A considered process that keeps you informed from the first conversation onward.", items: [
    { title: "Let's get acquainted", description: "We learn about your goals, your time horizon and the way you prefer to stay informed." },
    { title: "Meet your trader", description: "You are matched with a dedicated trader who looks after your account." },
    { title: "Your capital at work", description: "Trades are managed with care and recorded transparently in your account." },
    { title: "Stay in the know", description: "Log in to see your balance, follow activity and reach us whenever you need." },
  ] },
  preview: { eyebrow: "ALWAYS IN THE LOOP", title: "A direct line to what matters.", description: "Balance updates, withdrawal progress and answers to your questions: all right where you expect them.", cta: "Log in to your portal" },
  about: { eyebrow: "ABOUT NORTHLINE", title: "A human approach to a changing market.", body: "We founded Northline around a simple conviction: people deserve to feel informed, not in the dark, about the capital they entrust to others. That means pairing experienced trading with thoughtful service and technology that makes the important things easy to see.", mission: "Our mission is to make professional trading feel more personal, accountable and understandable.", imageUrl: "/images/studio.jpg", figures: [{ value: "01", label: "Clear point of contact" }, { value: "24/7", label: "Access to your portal" }, { value: "100%", label: "Visibility of activity" }] },
  contact: { eyebrow: "START A CONVERSATION", title: "Let's talk about what comes next.", subtitle: "Have a question about Northline? Tell us a little about yourself and our team will get back to you." },
  risk: { title: "An important note on risk", body: "All trading carries risk, including the possibility of losing some or all of your capital. The value of your account can go down as well as up. Past performance is not a reliable indicator of future results. Please consider your circumstances and seek independent advice before making a decision." },
  legal_terms: { title: "Terms of use", body: "These terms govern your use of the Northline website and portal. Information on this site is for general information only and does not constitute personal financial advice. You are responsible for keeping your login details secure. Contact our team if you need help understanding your account or these terms." },
  legal_privacy: { title: "Privacy policy", body: "We collect information you provide to us so we can communicate with you, manage your account and meet our legal obligations. We use appropriate safeguards to protect your information and do not sell your personal data. You may request access to, correction of or deletion of your personal information by contacting our team." },
  legal_risk: { title: "Risk disclosure", body: "Trading in financial markets involves substantial risk. Prices may fluctuate significantly and losses can exceed expectations. There are no guaranteed returns. Historical results, illustrations and portfolio examples should not be taken as a promise of future performance. Only commit capital you can afford to put at risk, and seek independent professional advice where appropriate." },
};

export const fallbackFaqs = [
  { id: "faq-1", question: "How will I know what is happening with my account?", answer: "Your secure portal shows your current balance, transaction history and notifications when important activity takes place. Your dedicated trader is also available for questions.", rating: 0 },
  { id: "faq-2", question: "Can I request a withdrawal?", answer: "Yes. You can submit a withdrawal request from your portal. We show its status at each stage, and your balance is updated once the request has been processed.", rating: 0 },
  { id: "faq-3", question: "Who will manage my capital?", answer: "Every client is assigned a dedicated trader. You can see who they are and contact our team directly through your portal.", rating: 0 },
  { id: "faq-4", question: "Is my capital guaranteed?", answer: "No. Trading always involves risk, including the possibility of losing capital. We believe in being clear about that from the outset. Please read our risk disclosure before making a decision.", rating: 0 },
  { id: "faq-5", question: "How do I get started?", answer: "Send us a message through the contact form. We will arrange a conversation to understand your needs and explain our process before you make any decisions.", rating: 0 },
];
export const fallbackTestimonials = [
  { id: "quote-1", quote: "I can see the full picture without having to chase for an update. The clarity of the portal has made a real difference to how comfortable I feel.", name: "Nomsa Mokoena", role: "Client, Cape Town", rating: 5, avatarUrl: "" },
  { id: "quote-2", quote: "The team communicates plainly and responds when it matters. I appreciate having a direct relationship with the person looking after my account.", name: "Daniel Jacobs", role: "Client, Johannesburg", rating: 5, avatarUrl: "" },
  { id: "quote-3", quote: "Thoughtful people and an easy way to follow what is going on. It feels refreshingly straightforward.", name: "Thandi Ndlovu", role: "Client, Durban", rating: 4, avatarUrl: "" },
];
export const fallbackTeam: TeamMember[] = [
  { id: "team-1", name: "Amina Patel", role: "Managing Director", bio: "Amina leads Northline with a focus on clarity, governance and long-term client trust.", avatarUrl: "" },
  { id: "team-2", name: "Thabo Maseko", role: "Lead Trader", bio: "Thabo guides our trading approach with discipline and careful risk management.", avatarUrl: "" },
  { id: "team-3", name: "Zanele Khumalo", role: "Client Success Lead", bio: "Zanele ensures every client conversation is handled with care and attention.", avatarUrl: "" },
];
