import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  Mail,
  ScanEye,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Brand, SiteHeader } from "@/components/public/site-header";
import { Reveal } from "@/components/public/reveal";
import { LaptopMockup } from "@/components/public/laptop-mockup";
import {
  FaqAccordion,
  TestimonialCarousel,
} from "@/components/public/public-interactions";
import { ContactForm } from "@/components/public/contact-form";
import { formatCurrency } from "@/lib/format";
import type { PublicContent, TeamMember } from "@/lib/content";
import { initials } from "@/lib/format";

const featureIcons: Record<string, LucideIcon> = {
  users: UsersRound,
  scan: ScanEye,
  activity: Activity,
  shield: ShieldCheck,
  wallet: Wallet,
  globe: Globe2,
  clock: Clock3,
  sparkle: Sparkles,
};
const safeHref = (href: string) =>
  href.startsWith("/") || href.startsWith("#") || href.startsWith("https://")
    ? href
    : "/#contact";

function SectionIntro({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal className="section-intro">
      <span className="eyebrow">
        <span className="eyebrow-line" />
        {eyebrow}
      </span>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </Reveal>
  );
}

export function PublicFooter({ content }: { content: PublicContent }) {
  const { site, risk } = content;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand inverse name={site.name} logoUrl={site.logoUrl} />
            <p>{site.tagline}</p>
          </div>
          <div className="footer-links">
            <div>
              <h4>Explore</h4>
              <Link href="/#about">About us</Link>
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#performance">The platform</Link>
              <Link href="/#faq">FAQs</Link>
            </div>
            <div>
              <h4>Resources</h4>
              <Link href="/legal/terms">Terms of use</Link>
              <Link href="/legal/privacy">Privacy policy</Link>
              <Link href="/legal/risk">Risk disclosure</Link>
              <Link href="/login">Client login</Link>
            </div>
            <div>
              <h4>Connect</h4>
              <a href={`mailto:${site.email}`}>{site.email}</a>
              <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>
              <a
                href={safeHref(site.linkedin)}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn <ArrowUpRight size={13} />
              </a>
              <a
                href={safeHref(site.instagram)}
                target="_blank"
                rel="noreferrer"
              >
                Instagram <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </div>
        <div className="footer-risk">
          <ShieldCheck size={19} strokeWidth={1.6} />
          <div>
            <strong>{risk.title}</strong>
            <p>{risk.body}</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </span>
          <span>Built on clarity. Based in South Africa.</span>
          <Link href="#home">Back to top ↑</Link>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({
  content,
  faqs,
  testimonials,
  team,
}: {
  content: PublicContent;
  faqs: { id: string; question: string; answer: string }[];
  testimonials: {
    id: string;
    quote: string;
    name: string;
    role: string;
    avatarUrl?: string | null;
    rating: number;
  }[];
  team: TeamMember[];
}) {
  const { site, hero, features, showcase, steps, preview, about, contact } =
    content;
  const topOverlay = Math.min(0.85, Math.max(0.35, hero.overlay / 100 - 0.13));
  const bottomOverlay = Math.min(
    0.94,
    Math.max(0.5, hero.overlay / 100 + 0.07),
  );
  return (
    <>
      <SiteHeader name={site.name} logoUrl={site.logoUrl} />
      <main id="home">
        <section className="hero">
          <div className="hero-media">
            {hero.imageUrl && (
              <Image
                src={hero.imageUrl}
                alt="Cape Town skyline at twilight"
                fill
                priority
                sizes="100vw"
                quality={95}
                className="object-cover"
                style={{ objectPosition: `${hero.focalX}% ${hero.focalY}%` }}
              />

              // <img
              //   src={hero.imageUrl}
              //   alt="Cape Town skyline at twilight"
              //   style={{
              //     position: "absolute",
              //     top: 0,
              //     left: 0,
              //     width: "100%",
              //     height: "100%",
              //     objectFit: "cover",
              //     objectPosition: `${hero.focalX}% ${hero.focalY}%`,
              //     // imageRendering: "crisp-edges",
              //   }}
              // />
            )}
          </div>
          <div
            className="hero-shade"
            style={{
              background: `linear-gradient(180deg, rgba(10,8,20,${topOverlay}), rgba(10,8,20,${bottomOverlay}))`,
            }}
          />
          <div className="container hero-content">
            <div className="hero-copy">
              <span className="hero-eyebrow">
                <span />
                {hero.eyebrow}
              </span>
              <h1>{hero.title}</h1>
              <p>{hero.description}</p>
              <div className="hero-actions">
                <Link
                  className="button button-large"
                  href={safeHref(hero.ctaHref)}
                >
                  {hero.cta} <ArrowUpRight size={17} />
                </Link>
                <Link
                  className="hero-secondary"
                  href={safeHref(hero.secondaryHref)}
                >
                  {hero.secondary} <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
          <div className="hero-bottom container">
            <span>INDEPENDENT THINKING. CLEARER PERSPECTIVE.</span>
            <a href="#approach" aria-label="Scroll to explore">
              SCROLL TO EXPLORE{" "}
              <span>
                <ArrowDown size={15} />
              </span>
            </a>
          </div>
        </section>

        <section
          id="approach"
          className="section section-white features-section"
        >
          <div className="container">
            <SectionIntro
              eyebrow={features.eyebrow}
              title={features.title}
              subtitle={features.subtitle}
            />
            <div className="features-grid">
              {features.items.map((item, index) => {
                const Icon = featureIcons[item.icon] || Activity;
                return (
                  <Reveal
                    key={`${item.title}-${index}`}
                    className="feature"
                    delay={index * 0.075}
                  >
                    <span className="icon-badge">
                      <Icon size={23} strokeWidth={1.7} />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="performance"
          className="section section-band showcase-section"
        >
          <div className="container">
            <SectionIntro
              eyebrow={showcase.eyebrow}
              title={showcase.title}
              subtitle={showcase.subtitle}
            />
            <div className="showcase-stack">
              {showcase.rows.map((row, index) => (
                <div
                  className={`showcase-row ${row.side === "right" ? "showcase-reverse" : ""}`}
                  key={`${row.title}-${index}`}
                >
                  <Reveal className="showcase-visual" delay={0.05}>
                    <LaptopMockup variant={row.variant} />
                  </Reveal>
                  <Reveal className="showcase-copy" delay={0.12}>
                    <span className="eyebrow">
                      <span className="eyebrow-line" />
                      {String(index + 1).padStart(2, "0")} / THE PLATFORM
                    </span>
                    <h3>{row.title}</h3>
                    <p>{row.description}</p>
                    <ul>
                      {row.checks.map((check, i) => (
                        <li key={i}>
                          <span>
                            <Check size={13} strokeWidth={2.5} />
                          </span>
                          {check}
                        </li>
                      ))}
                    </ul>
                    <Link href={safeHref(row.href)} className="button">
                      {row.button} <ArrowUpRight size={16} />
                    </Link>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="section section-white steps-section"
        >
          <div className="container">
            <SectionIntro
              eyebrow={steps.eyebrow}
              title={steps.title}
              subtitle={steps.subtitle}
            />
            <div className="steps-grid">
              {steps.items.map((step, index) => (
                <Reveal
                  key={`${step.title}-${index}`}
                  className="step"
                  delay={index * 0.09}
                >
                  <div className="step-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </Reveal>
              ))}
            </div>
            <p className="steps-footnote">
              A thoughtful process. A more informed perspective.
            </p>
          </div>
        </section>

        <section className="portal-preview">
          <div className="container portal-preview-inner">
            <Reveal className="preview-copy">
              <span className="eyebrow light">
                <span className="eyebrow-line" />
                {preview.eyebrow}
              </span>
              <h2>{preview.title}</h2>
              <p>{preview.description}</p>
              <Link href="/login" className="button button-light">
                {preview.cta} <ArrowUpRight size={16} />
              </Link>
            </Reveal>
            <Reveal className="preview-cards" delay={0.15}>
              <div className="preview-balance">
                <span className="preview-label">
                  YOUR ACCOUNT BALANCE{" "}
                  <span className="preview-live">
                    <i /> LIVE
                  </span>
                </span>
                <strong>{formatCurrency(184750.5)}</strong>
                <span className="preview-change">
                  <ArrowUpRight size={14} /> +4.8% this month
                </span>
              </div>
              <div className="preview-notification">
                <span className="notification-mini-icon">
                  <Check size={16} />
                </span>
                <span>
                  <strong>Balance updated</strong>
                  <small>
                    Your latest trade outcome is now reflected in your account.
                  </small>
                  <em>Just now</em>
                </span>
              </div>
              <div className="preview-dot one" />
              <div className="preview-dot two" />
            </Reveal>
          </div>
        </section>

        <section id="about" className="section section-white about-section">
          <div className="container about-grid">
            <Reveal className="about-image">
              <Image
                src={about.imageUrl || "/images/studio.jpg"}
                alt="A quiet, light-filled Northline workspace"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                unoptimized={about.imageUrl.startsWith("http")}
              />
              <div className="about-image-caption">
                <span>01 / THE PEOPLE BEHIND THE PERSPECTIVE</span>
                <ArrowUpRight size={17} />
              </div>
            </Reveal>
            <Reveal className="about-copy" delay={0.08}>
              <span className="eyebrow">
                <span className="eyebrow-line" />
                {about.eyebrow}
              </span>
              <h2>{about.title}</h2>
              <p>{about.body}</p>
              <blockquote>{about.mission}</blockquote>
              <div className="about-figures">
                {about.figures.map((figure, i) => (
                  <div key={i}>
                    <strong>{figure.value}</strong>
                    <span>{figure.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          {team.length > 0 && (
            <Reveal className="container team-grid" delay={0.1}>
              <div className="team-intro">
                <span className="eyebrow">
                  <span className="eyebrow-line" />
                  THE TEAM
                </span>
                <h3>People you can talk to.</h3>
                <p>
                  Experienced, approachable and accountable for every client
                  relationship.
                </p>
              </div>
              <div className="team-cards">
                {team.map((member) => (
                  <div key={member.id} className="team-card">
                    <span
                      className="team-avatar"
                      style={
                        member.avatarUrl
                          ? { backgroundImage: `url(${member.avatarUrl})` }
                          : undefined
                      }
                    >
                      {member.avatarUrl ? null : initials(member.name)}
                    </span>
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                    <p>{member.bio}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </section>

        <section
          id="testimonials"
          className="section section-band testimonials-section"
        >
          <div className="container">
            <SectionIntro
              eyebrow="WORDS THAT MATTER"
              title="Better heard from our clients."
              subtitle="We believe trust is earned in the details, every day."
            />
            <TestimonialCarousel items={testimonials} />
          </div>
        </section>

        <section id="faq" className="section section-white faq-section">
          <div className="container faq-grid">
            <Reveal className="faq-heading">
              <span className="eyebrow">
                <span className="eyebrow-line" />
                GOOD TO KNOW
              </span>
              <h2>Questions worth asking.</h2>
              <p>
                Honest answers to the things we are asked most often. Need more
                detail? We are always happy to talk.
              </p>
              <Link href="/#contact" className="text-link">
                Ask us directly <ArrowUpRight size={16} />
              </Link>
            </Reveal>
            <Reveal>
              <FaqAccordion items={faqs} />
            </Reveal>
          </div>
        </section>

        <section id="contact" className="section section-band contact-section">
          <div className="container">
            <SectionIntro
              eyebrow={contact.eyebrow}
              title={contact.title}
              subtitle={contact.subtitle}
            />
            <div className="contact-grid">
              <Reveal className="contact-info">
                <div className="contact-info-top">
                  <span className="small-label">GET IN TOUCH</span>
                  <h3>Good conversations start here.</h3>
                  <p>
                    Whether you are exploring your options or already know what
                    you need, we are here to listen.
                  </p>
                </div>
                <div className="contact-detail">
                  <span>
                    <Mail size={19} />
                  </span>
                  <div>
                    <small>EMAIL US</small>
                    <a href={`mailto:${site.email}`}>{site.email}</a>
                  </div>
                  <ChevronRight size={16} />
                </div>
                <div className="contact-detail">
                  <span>
                    <Clock3 size={19} />
                  </span>
                  <div>
                    <small>GIVE US A CALL</small>
                    <a href={`tel:${site.phone.replace(/\s/g, "")}`}>
                      {site.phone}
                    </a>
                  </div>
                  <ChevronRight size={16} />
                </div>
                <div className="contact-detail">
                  <span>
                    <Building2 size={19} />
                  </span>
                  <div>
                    <small>FIND US</small>
                    <strong>{site.location}</strong>
                  </div>
                </div>
                <div className="contact-info-foot">
                  We usually respond within one business day.
                </div>
              </Reveal>
              <Reveal className="contact-form-card" delay={0.1}>
                <div className="form-card-head">
                  <span className="small-label">SEND AN ENQUIRY</span>
                  <span className="form-card-number">01 — 03</span>
                </div>
                <ContactForm />
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter content={content} />
    </>
  );
}
