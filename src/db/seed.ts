import "dotenv/config";
import { randomUUID, scrypt as scryptCb, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";

import { db, pool } from "@/db";
import {
  aboutContent,
  accounts,
  auditLog,
  contactSubmissions,
  faqs,
  features,
  feedback,
  feedbackMessages,
  heroContent,
  legalPages,
  notifications,
  profiles,
  siteSettings,
  steps,
  teamMembers,
  testimonials,
  tradeAllocations,
  traderClients,
  trades,
  transactions,
  withdrawalRequests,
} from "@/db/schema";

const scrypt = promisify(scryptCb) as (p: string, s: string, l: number) => Promise<Buffer>;

async function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return date;
};

const round = (value: number) => Math.round(value * 100) / 100;

async function main() {
  console.log("Resetting tables…");
  await db.execute(sql`
    truncate table
      audit_log, notifications, feedback_messages, feedback, trade_allocations, trades,
      withdrawal_requests, transactions, accounts, trader_clients, sessions, contact_submissions,
      cms_versions, legal_pages, testimonials, faqs, team_members, about_content, steps, features,
      hero_content, site_settings, profiles
    restart identity cascade
  `);

  console.log("Creating people…");
  const adminPwd = await hash("Admin123!");
  const traderPwd = await hash("Trader123!");
  const clientPwd = await hash("Client123!");

  const [admin] = await db
    .insert(profiles)
    .values({
      email: "admin@meridiancp.com",
      passwordHash: adminPwd,
      role: "admin",
      fullName: "Priya Raman",
      phone: "+1 (212) 555-0142",
      bio: "Chief operating officer. Oversees platform governance, compliance and client onboarding.",
      onboardingCompleted: false,
      createdAt: daysAgo(400),
    })
    .returning();

  const traderSeeds = [
    {
      email: "dana.whitfield@meridiancp.com",
      fullName: "Dana Whitfield",
      phone: "+1 (212) 555-0188",
      bio: "Eleven years trading G10 FX and index futures. Systematic trend following with discretionary overlay.",
    },
    {
      email: "marcus.oyelowo@meridiancp.com",
      fullName: "Marcus Oyelowo",
      phone: "+1 (212) 555-0190",
      bio: "Former commodities desk lead. Focused on energy spreads and volatility-aware position sizing.",
    },
    {
      email: "elena.sorokina@meridiancp.com",
      fullName: "Elena Sorokina",
      phone: "+1 (212) 555-0191",
      bio: "Equity index and single-name momentum. Risk-first allocator with a strict drawdown mandate.",
    },
  ];

  const traderRows = await db
    .insert(profiles)
    .values(
      traderSeeds.map((trader, index) => ({
        ...trader,
        passwordHash: traderPwd,
        role: "trader",
        onboardingCompleted: index > 0,
        createdAt: daysAgo(360 - index * 20),
      })),
    )
    .returning();

  const clientSeeds = [
    ["Amelia Rhodes", "amelia.rhodes@northstarfm.com", 184920.44],
    ["Jonas Berg", "jonas.berg@bergholdings.se", 92410.1],
    ["Priyanka Shah", "priyanka.shah@shahventures.in", 311500.0],
    ["Tomas Novak", "tomas.novak@novakassoc.cz", 48250.75],
    ["Grace Okonkwo", "grace.okonkwo@okonkwogroup.ng", 157300.2],
    ["Hiroshi Tanaka", "hiroshi.tanaka@tanakacap.jp", 268740.6],
    ["Sofia Marchetti", "sofia.marchetti@marchetti.it", 73120.35],
    ["Liam O'Donnell", "liam.odonnell@odonnellfamily.ie", 129880.9],
    ["Nadia Haddad", "nadia.haddad@haddadtrust.ae", 205600.0],
    ["Felix Brandt", "felix.brandt@brandtwerk.de", 61475.5],
    ["Ines Duarte", "ines.duarte@duarteholdings.pt", 98230.15],
    ["Caleb Mensah", "caleb.mensah@mensahfamily.gh", 142060.8],
  ] as const;

  const clientRows = await db
    .insert(profiles)
    .values(
      clientSeeds.map(([fullName, email], index) => ({
        email,
        passwordHash: clientPwd,
        role: "client",
        fullName,
        phone: `+1 (646) 555-${String(1000 + index * 7).slice(0, 4)}`,
        onboardingCompleted: index > 0,
        status: index === 11 ? "suspended" : "active",
        createdAt: daysAgo(300 - index * 14),
      })),
    )
    .returning();

  await db.insert(traderClients).values(
    clientRows.map((client, index) => ({
      traderId: traderRows[index % traderRows.length].id,
      clientId: client.id,
      assignedAt: daysAgo(290 - index * 12),
    })),
  );

  console.log("Building ledgers…");
  for (let i = 0; i < clientRows.length; i += 1) {
    const client = clientRows[i];
    const trader = traderRows[i % traderRows.length];
    const finalBalance = clientSeeds[i][2];

    const entries: {
      type: "deposit" | "withdrawal" | "trade_outcome" | "adjustment";
      amount: number;
      createdAt: Date;
      note: string;
    }[] = [];

    const opening = round(finalBalance * 0.62);
    entries.push({
      type: "deposit",
      amount: opening,
      createdAt: daysAgo(120 - i * 2, 9),
      note: "Initial funding — wire transfer",
    });

    if (i % 3 === 0) {
      entries.push({
        type: "deposit",
        amount: round(finalBalance * 0.12),
        createdAt: daysAgo(58 - i, 11),
        note: "Top-up allocation",
      });
    }

    for (let d = 95; d > 0; d -= Math.max(2, Math.floor(Math.random() * 5))) {
      const swing = (Math.random() - 0.38) * finalBalance * 0.012;
      entries.push({
        type: "trade_outcome",
        amount: round(swing),
        createdAt: daysAgo(d, 8 + (d % 8)),
        note: swing >= 0 ? "Session profit allocated" : "Session loss allocated",
      });
    }

    if (i % 4 === 1) {
      entries.push({
        type: "withdrawal",
        amount: -round(finalBalance * 0.08),
        createdAt: daysAgo(26, 15),
        note: "Scheduled distribution",
      });
    }
    if (i % 5 === 2) {
      entries.push({
        type: "adjustment",
        amount: round(finalBalance * 0.004),
        createdAt: daysAgo(14, 16),
        note: "Fee rebate — quarterly review",
      });
    }

    entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const provisional = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const correction = round(finalBalance - provisional);
    entries.push({
      type: "trade_outcome",
      amount: correction,
      createdAt: daysAgo(1, 14),
      note: correction >= 0 ? "Session profit allocated" : "Session loss allocated",
    });

    let balance = 0;
    let deposited = 0;
    let withdrawn = 0;
    const ledger = entries.map((entry) => {
      const before = balance;
      balance = round(balance + entry.amount);
      if (entry.type === "deposit") deposited = round(deposited + entry.amount);
      if (entry.type === "withdrawal") withdrawn = round(withdrawn + Math.abs(entry.amount));
      return {
        clientId: client.id,
        traderId: trader.id,
        type: entry.type,
        amount: entry.amount,
        balanceBefore: before,
        balanceAfter: balance,
        note: entry.note,
        status: "completed",
        reference: entry.type === "deposit" ? `WIRE-${randomUUID().slice(0, 8).toUpperCase()}` : null,
        idempotencyKey: randomUUID(),
        createdAt: entry.createdAt,
      };
    });

    await db.insert(transactions).values(ledger);
    await db.insert(accounts).values({
      clientId: client.id,
      balance,
      currency: "USD",
      totalDeposited: deposited,
      totalWithdrawn: withdrawn,
      updatedAt: ledger[ledger.length - 1].createdAt,
    });

    const latest = ledger.slice(-3);
    await db.insert(notifications).values(
      latest.map((entry) => ({
        userId: client.id,
        type: "balance" as const,
        title: `${entry.type === "deposit" ? "Deposit" : entry.type === "withdrawal" ? "Withdrawal" : entry.type === "adjustment" ? "Adjustment" : "Trade outcome"} · $${Math.abs(entry.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        body: `Your balance ${entry.amount >= 0 ? "increased" : "decreased"} from $${entry.balanceBefore.toLocaleString("en-US", { minimumFractionDigits: 2 })} to $${entry.balanceAfter.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Note: ${entry.note}`,
        data: { amount: entry.amount, balanceAfter: entry.balanceAfter },
        readAt: Math.random() > 0.6 ? new Date() : null,
        createdAt: entry.createdAt,
      })),
    );
  }

  console.log("Seeding trades…");
  const instruments = ["EUR/USD", "GBP/JPY", "ES Futures", "NQ Futures", "Brent Crude", "Gold", "USD/CHF"];
  for (const trader of traderRows) {
    const tradeValues = Array.from({ length: 28 }).map((_, index) => {
      const closed = index > 2;
      const pnl = closed ? round((Math.random() - 0.36) * 6400) : 0;
      const entry = round(100 + Math.random() * 900);
      return {
        traderId: trader.id,
        instrument: instruments[index % instruments.length],
        direction: index % 2 === 0 ? "long" : "short",
        size: round(1 + Math.random() * 12),
        entry,
        exit: closed ? round(entry * (1 + (Math.random() - 0.5) * 0.04)) : null,
        pnl,
        status: closed ? "closed" : "open",
        notes: closed ? "Closed at target per risk plan." : "Running with trailing stop.",
        openedAt: daysAgo(60 - index * 2, 9),
        closedAt: closed ? daysAgo(59 - index * 2, 16) : null,
      };
    });
    const inserted = await db.insert(trades).values(tradeValues).returning();

    const book = clientRows.filter((_, index) => traderRows[index % traderRows.length].id === trader.id);
    for (const trade of inserted.slice(0, 8)) {
      if (!book.length) break;
      await db.insert(tradeAllocations).values(
        book.map((client) => ({
          tradeId: trade.id,
          clientId: client.id,
          amount: round(trade.pnl / book.length),
          createdAt: trade.closedAt ?? trade.openedAt,
        })),
      );
    }
  }

  console.log("Seeding withdrawals, feedback and audit…");
  await db.insert(withdrawalRequests).values([
    {
      clientId: clientRows[0].id,
      amount: 12000,
      method: "bank_transfer",
      destination: "Chase ••4821",
      status: "pending",
      createdAt: daysAgo(1, 12),
    },
    {
      clientId: clientRows[2].id,
      amount: 25000,
      method: "wire",
      destination: "HSBC ••9043",
      status: "pending",
      createdAt: daysAgo(2, 9),
    },
    {
      clientId: clientRows[4].id,
      amount: 7500,
      method: "bank_transfer",
      destination: "First Bank ••1180",
      status: "approved",
      reviewedBy: traderRows[1].id,
      reviewedAt: daysAgo(5, 11),
      createdAt: daysAgo(6, 10),
    },
    {
      clientId: clientRows[1].id,
      amount: 5000,
      method: "stablecoin",
      destination: "USDC 0x8f…21a4",
      status: "processed",
      reviewedBy: traderRows[1].id,
      reviewedAt: daysAgo(20, 10),
      processedAt: daysAgo(19, 14),
      createdAt: daysAgo(21, 9),
    },
    {
      clientId: clientRows[3].id,
      amount: 30000,
      method: "wire",
      destination: "KB ••7712",
      status: "rejected",
      reviewedBy: traderRows[0].id,
      reason: "Requested amount exceeded the available balance after pending allocations.",
      reviewedAt: daysAgo(12, 13),
      createdAt: daysAgo(13, 8),
    },
  ]);

  const feedbackRows = await db
    .insert(feedback)
    .values([
      {
        clientId: clientRows[0].id,
        assignedTo: traderRows[0].id,
        category: "question",
        subject: "Understanding last week's allocation",
        message:
          "I noticed three separate trade outcomes on Tuesday. Could you walk me through how they were allocated to my account?",
        status: "in_review",
        priority: "normal",
        createdAt: daysAgo(3, 11),
      },
      {
        clientId: clientRows[5].id,
        assignedTo: traderRows[2].id,
        category: "concern",
        subject: "Drawdown in the energy book",
        message:
          "The last two weeks have been choppy. I'd like to understand the risk limits being applied before I add capital.",
        status: "open",
        priority: "high",
        createdAt: daysAgo(1, 16),
      },
      {
        clientId: clientRows[7].id,
        assignedTo: traderRows[1].id,
        category: "praise",
        subject: "Reporting is excellent",
        message: "Just wanted to say the ledger detail makes my accountant's life far easier. Thank you.",
        status: "resolved",
        priority: "low",
        firstResponseAt: daysAgo(9, 10),
        createdAt: daysAgo(10, 9),
      },
    ])
    .returning();

  await db.insert(feedbackMessages).values([
    {
      feedbackId: feedbackRows[0].id,
      authorId: traderRows[0].id,
      body: "Of course — each outcome maps to a closed position. I'll send the breakdown by instrument today.",
      createdAt: daysAgo(2, 9),
    },
    {
      feedbackId: feedbackRows[2].id,
      authorId: traderRows[1].id,
      body: "Thank you, Liam. We built the ledger exactly for that reason. Shout if you need a CSV export.",
      createdAt: daysAgo(9, 10),
    },
  ]);

  await db.insert(contactSubmissions).values([
    {
      name: "Rebecca Lindqvist",
      email: "rebecca@lindqvistfamilyoffice.se",
      company: "Lindqvist Family Office",
      message:
        "We manage a SEK 240m family office and are evaluating managed trading partners for a 5% sleeve. Could we schedule an introduction?",
      status: "new",
      createdAt: daysAgo(1, 13),
    },
    {
      name: "Owen Mathers",
      email: "owen.mathers@mathersgroup.co.uk",
      company: "Mathers Group",
      message:
        "Interested in how your reporting works and what reporting frequency clients receive. Also keen to understand your risk limits.",
      status: "read",
      createdAt: daysAgo(6, 10),
    },
  ]);

  await db.insert(auditLog).values([
    {
      actorId: admin.id,
      actorName: admin.fullName,
      action: "user.create",
      entity: "profiles",
      entityId: clientRows[0].id,
      after: { email: clientRows[0].email, role: "client" },
      createdAt: daysAgo(90, 10),
    },
    {
      actorId: traderRows[0].id,
      actorName: traderRows[0].fullName,
      action: "balance.trade_outcome",
      entity: "accounts",
      entityId: clientRows[0].id,
      before: { balance: 180420.44 },
      after: { balance: 184920.44, amount: 4500 },
      createdAt: daysAgo(1, 14),
    },
    {
      actorId: admin.id,
      actorName: admin.fullName,
      action: "cms.publish",
      entity: "cms",
      entityId: "site",
      after: { label: "Launch content" },
      createdAt: daysAgo(30, 9),
    },
  ]);

  console.log("Seeding CMS…");
  const settingsValues = {
    companyName: "Meridian Capital Partners",
    wordmark: "Meridian",
    tagline:
      "A managed trading firm built on disciplined execution, strict risk limits and complete client transparency.",
    email: "desk@meridiancp.com",
    phone: "+1 (212) 555-0100",
    addressLine: "28 Liberty Street, 41st Floor, New York, NY 10005",
    linkedinUrl: "https://www.linkedin.com/company/meridian-capital-partners",
    xUrl: "https://x.com/meridiancp",
    seoTitle: "Meridian Capital Partners — Managed trading with a live client portal",
    seoDescription:
      "Meridian Capital Partners trades on behalf of its clients. Professional traders, strict risk limits, and a live portal that itemises every balance movement.",
    riskDisclosure:
      "Trading financial instruments carries a substantial risk of loss and is not suitable for every investor. The value of your capital can fall as well as rise, and you may receive back less than you invested. Past performance figures shown on this site are historical and are not a guarantee or reliable indicator of future results. Nothing on this site constitutes personal investment advice.",
    updatedBy: admin.id,
  };

  const heroValues = {
    eyebrow: "Now onboarding Q3 allocations",
    headline: "We trade. You see every move.",
    subheadline:
      "Meridian Capital Partners manages client capital with professional traders and reports every position, deposit and withdrawal in a portal that updates the moment your balance changes.",
    primaryCtaLabel: "Log in to your portal",
    primaryCtaHref: "/login",
    secondaryCtaLabel: "Talk to the desk",
    secondaryCtaHref: "/#contact",
    statLabelOne: "Assets under management",
    statValueOne: "$182M",
    statLabelTwo: "Average client tenure",
    statValueTwo: "4.6 yrs",
    statLabelThree: "Reporting latency",
    statValueThree: "< 2 sec",
    updatedBy: admin.id,
  };

  const aboutValues = {
    heading: "Built by traders who were tired of opaque reporting.",
    story:
      "Meridian was founded in 2014 by three desk traders who kept hearing the same complaint from clients: they had no idea what was happening to their money between quarterly statements. We rebuilt the model around a single rule — if it moves the balance, the client sees it immediately, with the figure before and the figure after.",
    mission:
      "Our mission is simple: professional execution, strict risk limits, and reporting so clear that a client never has to ask what a number means.",
    figureLabelOne: "Founded",
    figureValueOne: "2014",
    figureLabelTwo: "Client accounts",
    figureValueTwo: "740+",
    figureLabelThree: "Capital protected by risk limits",
    figureValueThree: "100%",
    updatedBy: admin.id,
  };

  const featureValues = [
    {
      icon: "UserCheck",
      title: "Professional traders",
      body: "Every client is assigned a named trader with a documented strategy, risk mandate and published track record.",
      sortOrder: 0,
    },
    {
      icon: "Eye",
      title: "Transparent reporting",
      body: "Each ledger entry shows the type, amount, balance before and balance after. No aggregated black boxes.",
      sortOrder: 1,
    },
    {
      icon: "Activity",
      title: "Real-time balance",
      body: "Your portal reflects trade outcomes, deposits and withdrawals within seconds of them being booked.",
      sortOrder: 2,
    },
    {
      icon: "Lock",
      title: "Controlled withdrawals",
      body: "Requests move through review, approval and settlement with a timeline you can follow at every stage.",
      sortOrder: 3,
    },
  ];

  const stepValues = [
    {
      title: "Onboard",
      body: "We verify your identity, agree your mandate and risk tolerance, and open your account.",
      sortOrder: 0,
    },
    {
      title: "Allocate",
      body: "Your funds are allocated to a named Meridian trader whose strategy matches your mandate.",
      sortOrder: 1,
    },
    {
      title: "We trade",
      body: "Positions are managed within hard risk limits. Outcomes are allocated to your account as they close.",
      sortOrder: 2,
    },
    {
      title: "You track",
      body: "Watch your balance, ledger and notifications live in the portal, and request withdrawals any time.",
      sortOrder: 3,
    },
  ];

  const faqValues = [
    {
      question: "Who actually places the trades?",
      answer:
        "A named Meridian trader assigned to your account. You can see who they are, their mandate and their performance summary inside your portal.",
      sortOrder: 0,
    },
    {
      question: "How quickly do I see a change in my balance?",
      answer:
        "Immediately. When a trader books a result, a deposit clears or a withdrawal settles, your portal updates and you receive a notification stating the amount, the previous balance and the new balance.",
      sortOrder: 1,
    },
    {
      question: "How do withdrawals work?",
      answer:
        "Submit a request from the portal. It moves through review, approval and settlement, and you can follow each stage on a status timeline. Approved amounts are debited from your ledger atomically so your balance is never ambiguous.",
      sortOrder: 2,
    },
    {
      question: "What are the fees?",
      answer:
        "A flat management fee plus a performance fee on new high-water-mark profits. Exact terms are set out in your mandate before you fund the account — there are no hidden spreads.",
      sortOrder: 3,
    },
    {
      question: "Can I lose money?",
      answer:
        "Yes. Trading carries a substantial risk of loss. We apply strict per-account drawdown limits, but no strategy eliminates risk, and past performance never guarantees future results.",
      sortOrder: 4,
    },
    {
      question: "Can I speak to a human?",
      answer:
        "Always. Raise a concern from the portal and your trader responds in-thread, or contact the desk directly by phone and email during market hours.",
      sortOrder: 5,
    },
  ];

  const testimonialValues = [
    {
      quote:
        "The reporting is the reason we stayed. I can trace every dollar of performance to a dated entry — my auditor has never had a question we couldn't answer in ten seconds.",
      author: "Amelia Rhodes",
      authorRole: "CFO, Northstar Family Management",
      rating: 5,
      approved: true,
      visible: true,
      sortOrder: 0,
    },
    {
      quote:
        "I've worked with three managed trading firms. Meridian is the only one where I know my trader's name, their mandate, and what they did yesterday.",
      author: "Jonas Berg",
      authorRole: "Principal, Berg Holdings",
      rating: 5,
      approved: true,
      visible: true,
      sortOrder: 1,
    },
    {
      quote:
        "Withdrawals used to be a two-week email chain. Now I submit a request and watch it move through the stages. It settled in 36 hours.",
      author: "Priyanka Shah",
      authorRole: "Director, Shah Ventures",
      rating: 4,
      approved: true,
      visible: true,
      sortOrder: 2,
    },
    {
      quote:
        "They were straight with me about a losing month before I even logged in. That honesty is worth more than a good quarter.",
      author: "Grace Okonkwo",
      authorRole: "Founder, Okonkwo Group",
      rating: 5,
      approved: true,
      visible: true,
      sortOrder: 3,
    },
  ];

  const teamValues = [
    {
      name: "Priya Raman",
      role: "Chief Operating Officer",
      initials: "PR",
      bio: "Runs governance, onboarding and compliance. Previously operations lead at a multi-strategy fund.",
      sortOrder: 0,
    },
    {
      name: "Dana Whitfield",
      role: "Head of FX & Index",
      initials: "DW",
      bio: "Eleven years trading G10 FX and index futures with a systematic trend-following core.",
      sortOrder: 1,
    },
    {
      name: "Marcus Oyelowo",
      role: "Senior Trader, Commodities",
      initials: "MO",
      bio: "Former commodities desk lead focused on energy spreads and volatility-aware sizing.",
      sortOrder: 2,
    },
    {
      name: "Elena Sorokina",
      role: "Senior Trader, Equities",
      initials: "ES",
      bio: "Equity index and single-name momentum, with a strict per-account drawdown mandate.",
      sortOrder: 3,
    },
  ];

  const legalValues = [
    {
      slug: "terms",
      title: "Terms of Service",
      sortOrder: 0,
      body: `<p>These terms govern your use of the Meridian Capital Partners client portal and the managed trading services provided under your signed mandate.</p><h2>1. Eligibility and accounts</h2><p>Portal accounts are created by Meridian on your behalf. You are responsible for keeping your credentials confidential and for all activity conducted under your login.</p><h2>2. Managed trading</h2><p>Meridian trades on your behalf within the risk mandate agreed in writing. We do not provide personal investment advice, and allocations are made at the discretion of your assigned trader within those limits.</p><h2>3. Reporting</h2><p>Balance movements are recorded in your ledger with the amount, the balance before and the balance after. Where a discrepancy is identified, Meridian will correct it by posting a clearly labelled adjustment rather than amending history.</p><h2>4. Withdrawals</h2><p>Withdrawal requests are reviewed for available balance and settlement instructions. Approved requests are debited at the time of approval and settled to your nominated account.</p><h2>5. Termination</h2><p>Either party may terminate the mandate with written notice. On termination, open positions attributable to your account are closed in an orderly fashion and the resulting balance is returned.</p>`,
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      sortOrder: 1,
      body: `<p>This policy explains what personal data Meridian Capital Partners collects, why we collect it and how we protect it.</p><h2>Data we collect</h2><ul><li>Identity and contact details provided during onboarding</li><li>Account activity: balances, transactions, withdrawal requests and support threads</li><li>Technical data such as session records and device information used to secure your account</li></ul><h2>How we use it</h2><p>We use your data to operate your account, meet regulatory obligations, detect fraud and improve the service. We never sell personal data.</p><h2>Retention</h2><p>Financial records are retained for the period required by applicable regulation. Support threads and marketing enquiries are retained for up to 24 months unless you request deletion.</p><h2>Your rights</h2><p>You may request access to, correction of or deletion of your personal data by contacting the desk. We respond to verified requests within 30 days.</p>`,
    },
    {
      slug: "risk-disclosure",
      title: "Risk Disclosure",
      sortOrder: 2,
      body: `<p><strong>Trading carries a substantial risk of loss and is not suitable for every investor.</strong></p><h2>Capital at risk</h2><p>The value of your capital can fall as well as rise. You may receive back less than you invested, and in adverse conditions losses can be rapid.</p><h2>Past performance</h2><p>Performance figures published on this site or shown in your portal are historical. They are not a guarantee, projection or reliable indicator of future results.</p><h2>Leverage</h2><p>Strategies may use leveraged instruments such as futures and CFDs. Leverage magnifies both gains and losses relative to the capital committed.</p><h2>No personal advice</h2><p>Nothing on this site or in the portal constitutes personal investment, tax or legal advice. Seek independent professional advice if you are unsure whether managed trading is appropriate for your circumstances.</p>`,
    },
  ];

  for (const status of ["draft", "published"] as const) {
    await db.insert(siteSettings).values({ ...settingsValues, status });
    await db.insert(heroContent).values({ ...heroValues, status });
    await db.insert(aboutContent).values({ ...aboutValues, status });
    await db.insert(features).values(featureValues.map((row) => ({ ...row, status, updatedBy: admin.id })));
    await db.insert(steps).values(stepValues.map((row) => ({ ...row, status, updatedBy: admin.id })));
    await db.insert(faqs).values(faqValues.map((row) => ({ ...row, status, updatedBy: admin.id })));
    await db
      .insert(testimonials)
      .values(testimonialValues.map((row) => ({ ...row, status, updatedBy: admin.id })));
    await db.insert(teamMembers).values(teamValues.map((row) => ({ ...row, status, updatedBy: admin.id })));
    await db.insert(legalPages).values(legalValues.map((row) => ({ ...row, status, updatedBy: admin.id })));
  }

  await db.insert(notifications).values([
    {
      userId: traderRows[0].id,
      type: "withdrawal",
      title: "New withdrawal request · $12,000.00",
      body: "Amelia Rhodes requested a withdrawal to Chase ••4821. Review it in your queue.",
      createdAt: daysAgo(1, 12),
    },
    {
      userId: traderRows[2].id,
      type: "feedback",
      title: "New concern raised",
      body: "Hiroshi Tanaka raised a high-priority concern about drawdown in the energy book.",
      createdAt: daysAgo(1, 16),
    },
    {
      userId: admin.id,
      type: "system",
      title: "New enquiry from the website",
      body: "Rebecca Lindqvist (Lindqvist Family Office) sent a message through the contact form.",
      createdAt: daysAgo(1, 13),
    },
  ]);

  console.log("Seed complete.");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
