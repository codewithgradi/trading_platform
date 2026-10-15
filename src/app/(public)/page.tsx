import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BellRing,
  Eye,
  LineChart,
  Lock,
  ShieldCheck,
  Star,
  UserCheck,
  Wallet,
} from "lucide-react";

import { ContactForm } from "@/components/features/contact-form";
import { DashboardMock } from "@/components/features/dashboard-mock";
import { FaqAccordion } from "@/components/features/public-chrome";
import { Button, Reveal } from "@/components/ui/primitives";
import { getCmsBundle } from "@/lib/cms";

export const revalidate = 300;

const iconMap: Record<string, typeof ShieldCheck> = {
  ShieldCheck,
  Activity,
  BarChart3,
  Eye,
  LineChart,
  Lock,
  UserCheck,
  Wallet,
  BellRing,
};

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsBundle("published");
  return {
    title: cms.settings?.seoTitle || undefined,
    description: cms.settings?.seoDescription || undefined,
    openGraph: {
      title: cms.settings?.seoTitle || undefined,
      description: cms.settings?.seoDescription || undefined,
    },
  };
}

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className="h-3.5 w-3.5"
          strokeWidth={1.6}
          fill={value <= Math.round(rating) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default async function LandingPage() {
  const cms = await getCmsBundle("published");
  const { hero, about, settings } = cms;

  return (
    <>
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="grid-backdrop absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            {hero?.eyebrow ? (
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-medium text-ink-2">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--positive)]" />
                  {hero.eyebrow}
                </p>
              </Reveal>
            ) : null}
            <Reveal delay={0.05}>
              <h1 className="mt-5 text-[40px] font-bold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[56px] lg:text-[64px]">
                {hero?.headline ?? "We trade. You watch every move."}
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-2 sm:text-[17.5px]">
                {hero?.subheadline ??
                  "Meridian Capital Partners manages client capital with professional traders, and reports every position, deposit and withdrawal in a live portal."}
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={hero?.primaryCtaHref ?? "/login"}>
                  <Button size="lg" className="w-full sm:w-auto">
                    {hero?.primaryCtaLabel ?? "Log in"}
                  </Button>
                </Link>
                <Link href={hero?.secondaryCtaHref ?? "#contact"}>
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    {hero?.secondaryCtaLabel ?? "Get in touch"}
                  </Button>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-line pt-7">
                {[
                  { label: hero?.statLabelOne, value: hero?.statValueOne },
                  { label: hero?.statLabelTwo, value: hero?.statValueTwo },
                  { label: hero?.statLabelThree, value: hero?.statValueThree },
                ]
                  .filter((item) => item.label && item.value)
                  .map((item) => (
                    <div key={item.label}>
                      <dt className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
                        {item.label}
                      </dt>
                      <dd className="tnum mt-1.5 text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
                        {item.value}
                      </dd>
                    </div>
                  ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:pl-6">
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ----------------------------- What we do ---------------------------- */}
      <section id="what-we-do" className="border-t border-line py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">What we do</p>
            <h2 className="mt-3 max-w-2xl text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
              We trade on behalf of our clients — and show our work.
            </h2>
            <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
              You allocate capital. A dedicated Meridian trader runs the strategy. Every outcome lands in
              your ledger within seconds, with the balance before and after spelled out in plain numbers.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
            {cms.features.map((feature, index) => {
              const Icon = iconMap[feature.icon] ?? ShieldCheck;
              return (
                <Reveal key={feature.id} delay={index * 0.06}>
                  <article className="h-full bg-bg p-6">
                    <Icon className="h-5 w-5 text-ink" strokeWidth={1.7} />
                    <h3 className="mt-4 text-[15.5px] font-semibold tracking-tight text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{feature.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------- How it works --------------------------- */}
      <section id="how-it-works" className="border-t border-line bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">How it works</p>
            <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
              Four steps from first conversation to live reporting.
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {cms.steps.map((step, index) => (
              <Reveal key={step.id} delay={index * 0.07}>
                <li className="relative border-t border-line-strong pt-5">
                  <span className="tnum text-[12px] font-bold tracking-wider text-ink-3">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-[16px] font-semibold tracking-tight text-ink">{step.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------- Portal preview -------------------------- */}
      <section id="performance" className="border-t border-line py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                Your live portal
              </p>
              <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
                No monthly PDF. A dashboard that moves when your money does.
              </h2>
              <ul className="mt-8 space-y-6">
                {[
                  {
                    icon: Wallet,
                    title: "Live balance",
                    body: "Your balance updates the moment a trade is booked, a deposit clears or a withdrawal settles.",
                  },
                  {
                    icon: UserCheck,
                    title: "Your assigned trader",
                    body: "See who manages your capital, their track record and the trades allocated to your account.",
                  },
                  {
                    icon: BellRing,
                    title: "Notifications on every change",
                    body: "Each alert states what changed, the amount, the old balance, the new balance and the time.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink">
                      <item.icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight text-ink">{item.title}</h3>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-9 inline-block">
                <Button>Log in to your portal</Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <DashboardMock />
          </Reveal>
        </div>
      </section>

      {/* -------------------------------- About ------------------------------ */}
      <section className="border-t border-line bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">About us</p>
                <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
                  {about?.heading ?? "Built by traders who were tired of opaque reporting."}
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="space-y-4 text-[15px] leading-relaxed text-ink-2">
                <p>{about?.story}</p>
                <p className="border-l-2 border-ink pl-4 text-ink">{about?.mission}</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <dl className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-[var(--border)] sm:grid-cols-3">
              {[
                { label: about?.figureLabelOne, value: about?.figureValueOne },
                { label: about?.figureLabelTwo, value: about?.figureValueTwo },
                { label: about?.figureLabelThree, value: about?.figureValueThree },
              ]
                .filter((item) => item.label && item.value)
                .map((item) => (
                  <div key={item.label} className="bg-bg px-6 py-7">
                    <dt className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
                      {item.label}
                    </dt>
                    <dd className="tnum mt-2 text-[30px] font-bold tracking-tight text-ink">{item.value}</dd>
                  </div>
                ))}
            </dl>
          </Reveal>

          {cms.team.length ? (
            <div className="mt-14">
              <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                The desk
              </h3>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cms.team.map((member, index) => (
                  <Reveal key={member.id} delay={index * 0.06}>
                    <li className="rounded-xl border border-line bg-bg p-5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-[13px] font-semibold text-ink">
                        {member.initials || member.name.charAt(0)}
                      </span>
                      <p className="mt-4 text-[14.5px] font-semibold tracking-tight text-ink">
                        {member.name}
                      </p>
                      <p className="text-[12.5px] text-ink-3">{member.role}</p>
                      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{member.bio}</p>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* ---------------------------- Testimonials --------------------------- */}
      <section id="testimonials" className="border-t border-line py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                  Client voices
                </p>
                <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
                  What our clients say
                </h2>
              </div>
              {cms.testimonials.length ? (
                <div className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                  <span className="tnum text-[26px] font-bold tracking-tight text-ink">
                    {cms.averageRating.toFixed(1)}
                  </span>
                  <div>
                    <Stars rating={cms.averageRating} className="text-[var(--warning)]" />
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      Average of {cms.testimonials.length} verified client reviews
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cms.testimonials.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.06}>
                <figure className="flex h-full flex-col rounded-xl border border-line p-6">
                  <Stars rating={item.rating} className="text-[var(--warning)]" />
                  <blockquote className="mt-4 flex-1 text-[14.5px] leading-relaxed text-ink">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-5 border-t border-line pt-4">
                    <p className="text-[13.5px] font-semibold text-ink">{item.author}</p>
                    <p className="text-[12.5px] text-ink-3">{item.authorRole}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- FAQ -------------------------------- */}
      <section id="faq" className="border-t border-line bg-surface py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">FAQ</p>
              <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
                Questions, answered plainly.
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
                Still unsure about something? Send us a note below and a member of the desk will reply
                personally.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <FaqAccordion items={cms.faqs} />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ Contact ------------------------------ */}
      <section id="contact" className="border-t border-line py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">Contact</p>
              <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
                Talk to the desk.
              </h2>
              <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-2">
                Tell us what you&apos;re trying to achieve. We&apos;ll walk you through our strategy,
                reporting and risk controls — no obligation.
              </p>
              <dl className="mt-8 space-y-4 text-[14px]">
                <div>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                    Email
                  </dt>
                  <dd className="mt-1 text-ink">{settings?.email}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                    Phone
                  </dt>
                  <dd className="mt-1 text-ink">{settings?.phone}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                    Office
                  </dt>
                  <dd className="mt-1 text-ink">{settings?.addressLine}</dd>
                </div>
              </dl>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-xl border border-line p-6 sm:p-8">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------- Risk disclosure -------------------------- */}
      <section className="border-t border-line bg-surface py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex gap-4 rounded-xl border border-line bg-bg p-6">
            <Lock className="h-5 w-5 shrink-0 text-ink-3" strokeWidth={1.7} />
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">Risk disclosure</h2>
              <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-ink-2">
                {settings?.riskDisclosure}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
