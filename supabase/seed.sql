-- Idempotent non-auth demo data. Run AFTER supabase/seed.ts has created Auth users and profiles.
-- `supabase db reset` can apply this file safely before that step; the CMS and public content still load.
-- All account amounts are numeric(18,2) and all accounts are denominated in ZAR.

-- Assign twenty clients evenly across the three traders.
with clients as (select id, row_number() over(order by email) as n from public.profiles where role='client'),
traders as (select id, row_number() over(order by email) as n from public.profiles where role='trader')
insert into public.trader_clients(client_id,trader_id)
select c.id,t.id from clients c join traders t on t.n=((c.n-1)%3)+1
on conflict(client_id) do nothing;

insert into public.accounts(client_id,balance,currency)
select id,0.00,'ZAR' from public.profiles where role='client'
on conflict(client_id) do nothing;

-- Fifty-four positions across three traders; the most recent three are still open.
with trader_order as (select id,row_number() over(order by email) as trader_number from public.profiles where role='trader')
insert into public.trades(id,trader_id,instrument,direction,size,entry,exit,pnl,status,notes,opened_at,closed_at)
select md5(t.id::text||':trade:'||s.n)::uuid,t.id,
  (array['JSE Top 40 Index','Gold (ZAR)','FTSE/JSE Banks','Platinum (ZAR)','Satrix 40 ETF'])[((s.n+t.trader_number-2)%5)+1],
  case when s.n%3=0 then 'sell' else 'buy' end,
  (1.0000+s.n*0.1250)::numeric(18,4),
  (18000+s.n*245+t.trader_number*83)::numeric(18,4),
  case when s.n=18 then null else (18120+s.n*251+t.trader_number*83)::numeric(18,4) end,
  case when s.n=18 then 0.00 when (s.n+t.trader_number)%4=0 then -(650+s.n*89)::numeric(18,2) else (780+s.n*112)::numeric(18,2) end,
  case when s.n=18 then 'open' else 'closed' end,
  'Demo trade '||lpad(s.n::text,2,'0'),
  now()-make_interval(days=>90-s.n*5, hours=>4),
  case when s.n=18 then null else now()-make_interval(days=>90-s.n*5) end
from trader_order t cross join generate_series(1,18) s(n)
on conflict(id) do nothing;

-- Every closed trade has allocations that sum exactly to its realised outcome.
with allocation_base as (
  select t.id as trade_id,tc.client_id,t.pnl,
    row_number() over(partition by t.id order by tc.client_id) as n,
    count(*) over(partition by t.id) as total
  from public.trades t join public.trader_clients tc on tc.trader_id=t.trader_id
  where t.status='closed' and t.notes like 'Demo trade %'
)
insert into public.trade_allocations(id,trade_id,client_id,amount,created_at)
select md5(trade_id::text||':'||client_id::text)::uuid,trade_id,client_id,
  case when n=total then pnl-round(pnl/total,2)*(total-1) else round(pnl/total,2) end,
  (select closed_at from public.trades where id=trade_id)
from allocation_base
on conflict(trade_id,client_id) do nothing;

-- Chronological ledger generation, per customer. Account balance is derived from the
-- exact cents in its own chain; allocations become matching trade-outcome entries.
do $$
declare c record; day_number integer; event record; running_balance numeric(18,2);
begin
  for c in
    select p.id,p.full_name,tc.trader_id,row_number() over(order by p.email)::integer as n
    from public.profiles p left join public.trader_clients tc on tc.client_id=p.id
    where p.role='client' order by p.email
  loop
    if exists(select 1 from public.transactions where client_id=c.id) then continue; end if;
    running_balance := 0.00;
    for day_number in reverse 89..0 loop
      for event in
        select event_rows.kind,event_rows.amount,event_rows.note,event_rows.reference
        from (
          select 1 as seq,'deposit'::text as kind,(5000+(c.n-1)*36000)::numeric(18,2) as amount,'Opening allocation'::text as note,null::text as reference where day_number=89
          union all
          select 2,'deposit',(1250+((c.n+day_number)%8)*410)::numeric(18,2),'Additional funds allocated',null::text where day_number<89 and day_number%18=0
          union all
          select 3,'trade_outcome',ta.amount,'Trade outcome · '||t.instrument,t.id::text
          from public.trade_allocations ta join public.trades t on t.id=ta.trade_id
          where ta.client_id=c.id and t.closed_at::date=(now()::date-day_number)
          union all
          select 4,'withdrawal',-(450+((c.n+day_number)%5)*150)::numeric(18,2),'Processed withdrawal',null::text where day_number>0 and day_number%26=0
          union all
          select 5,'adjustment',(case when (c.n+day_number)%3=0 then -75 else 125 end)::numeric(18,2),'Reconciliation adjustment',null::text where day_number>0 and day_number%43=0
        ) event_rows order by event_rows.seq,event_rows.reference
      loop
        if running_balance+event.amount < 0 then continue; end if;
        insert into public.transactions(client_id,trader_id,type,amount,balance_before,balance_after,note,reference,status,created_at)
        values(c.id,c.trader_id,event.kind,event.amount,running_balance,running_balance+event.amount,event.note,event.reference,'completed',now()-make_interval(days=>day_number)+make_interval(secs=>case event.kind when 'deposit' then 1 when 'trade_outcome' then 3 when 'withdrawal' then 4 else 5 end));
        running_balance := running_balance+event.amount;
      end loop;
    end loop;
    update public.accounts set balance=running_balance,updated_at=now() where client_id=c.id;
  end loop;
end $$;

-- Pending, approved, rejected and processed examples for the withdrawal queue.
with client_order as (
  select p.id,tc.trader_id,row_number() over(order by p.email)::integer as n
  from public.profiles p join public.trader_clients tc on tc.client_id=p.id where p.role='client'
), latest_withdrawal as (
  select distinct on (client_id) client_id,abs(amount) as amount,created_at
  from public.transactions where type='withdrawal' order by client_id,created_at desc
)
insert into public.withdrawal_requests(id,client_id,amount,status,note,reviewed_by,reason,created_at,reviewed_at,processed_at)
select md5('demo-withdrawal:'||c.id::text)::uuid,c.id,
  case when c.n%4=0 then coalesce(w.amount,750) else (650+c.n*95)::numeric(18,2) end,
  case c.n%4 when 0 then 'processed' when 1 then 'pending' when 2 then 'approved' else 'rejected' end,
  'Demo withdrawal request',case when c.n%4=1 then null else c.trader_id end,
  case when c.n%4=3 then 'We need to confirm the requested account details before this can proceed.' else null end,
  case when c.n%4=0 then w.created_at-interval '1 day' else now()-make_interval(days=>c.n%13+1) end,
  case when c.n%4=1 then null when c.n%4=0 then w.created_at-interval '12 hours' else now()-make_interval(days=>c.n%13) end,
  case when c.n%4=0 then w.created_at else null end
from client_order c left join latest_withdrawal w on w.client_id=c.id
on conflict(id) do nothing;
update public.transactions t set reference=w.id::text
from public.withdrawal_requests w where w.client_id=t.client_id and w.status='processed'
  and t.id=(select t2.id from public.transactions t2 where t2.client_id=w.client_id and t2.type='withdrawal' order by t2.created_at desc limit 1)
  and t.reference is null;

-- Client notifications and useful trader inbox alerts.
with recent as (
  select t.*,row_number() over(partition by t.client_id order by t.created_at desc) as n
  from public.transactions t
)
insert into public.notifications(id,user_id,type,title,body,data,created_at)
select md5('demo-notification:'||r.id::text)::uuid,r.client_id,'balance',
  case r.type when 'trade_outcome' then 'Trade outcome applied' when 'deposit' then 'Deposit received' when 'withdrawal' then 'Withdrawal processed' else 'Your balance has changed' end,
  'Your account balance has been updated. Open your ledger to see the full details.',
  jsonb_build_object('amount',r.amount,'before',r.balance_before,'after',r.balance_after),r.created_at+interval '2 minutes'
from recent r where r.n<=3
on conflict(id) do nothing;
insert into public.notifications(id,user_id,type,title,body,data,created_at)
select md5('demo-trader-alert:'||w.id::text)::uuid,tc.trader_id,'withdrawal','Withdrawal request awaiting review',
  'A client has submitted a withdrawal request. Review it in your queue.',jsonb_build_object('requestId',w.id),w.created_at
from public.withdrawal_requests w join public.trader_clients tc on tc.client_id=w.client_id where w.status='pending'
on conflict(id) do nothing;

-- Varied customer conversations with two-message threads.
with client_order as (
  select p.id,tc.trader_id,row_number() over(order by p.email)::integer as n
  from public.profiles p join public.trader_clients tc on tc.client_id=p.id where p.role='client'
)
insert into public.feedback(id,client_id,assigned_to,category,subject,message,status,priority,created_at,updated_at)
select md5('demo-feedback:'||c.id::text)::uuid,c.id,c.trader_id,
  case c.n%3 when 0 then 'concern' when 1 then 'question' else 'feedback' end,
  (array['Understanding my latest account update','A question about withdrawal timing','Feedback on the client portal','Checking a recent trade outcome','Help with my account details'])[((c.n-1)%5)+1],
  (array['I noticed the latest balance movement and would appreciate a little more context around it.','Could you let me know what to expect next and whether there is anything you need from me?','The portal has been easy to use. I wanted to share a thought about the information on my account.','I have a question about a recent entry in my transaction history. Please could you clarify it?','I would appreciate a quick conversation about the next steps for my account.'])[((c.n-1)%5)+1],
  case c.n%3 when 0 then 'open' when 1 then 'in_review' else 'resolved' end,
  case when c.n%3=0 then 'high' else 'normal' end,
  now()-make_interval(days=>c.n%25+1),now()-make_interval(days=>c.n%10)
from client_order c
on conflict(id) do nothing;
insert into public.feedback_messages(id,feedback_id,author_id,body,created_at)
select md5('demo-reply:'||f.id::text)::uuid,f.id,f.assigned_to,
  'Thank you for raising this. I have reviewed your account and will follow up with a clear update shortly.',f.created_at+interval '5 hours'
from public.feedback f where f.assigned_to is not null and f.subject in ('Understanding my latest account update','A question about withdrawal timing','Feedback on the client portal','Checking a recent trade outcome','Help with my account details')
on conflict(id) do nothing;
insert into public.feedback_messages(id,feedback_id,author_id,body,created_at)
select md5('demo-followup:'||f.id::text)::uuid,f.id,f.client_id,
  'Thank you for the update. I appreciate the clear explanation and will keep an eye on my portal.',f.created_at+interval '1 day'
from public.feedback f where f.status='resolved' and f.subject in ('Understanding my latest account update','A question about withdrawal timing','Feedback on the client portal','Checking a recent trade outcome','Help with my account details')
on conflict(id) do nothing;

-- Private trader notes for customer records.
with client_order as (select p.id,tc.trader_id from public.profiles p join public.trader_clients tc on tc.client_id=p.id where p.role='client')
insert into public.customer_notes(id,client_id,trader_id,body,created_at)
select md5('demo-note:'||c.id::text)::uuid,c.id,c.trader_id,'Called client to confirm next review date and answer questions about recent performance.',now()-interval '6 days' from client_order c where (select count(*) from public.customer_notes where client_id=c.id)=0
on conflict(id) do nothing;
with client_order as (select p.id,tc.trader_id from public.profiles p join public.trader_clients tc on tc.client_id=p.id where p.role='client')
insert into public.customer_notes(id,client_id,trader_id,body,created_at)
select md5('demo-note2:'||c.id::text)::uuid,c.id,c.trader_id,'Shared monthly account summary and checked in on risk preferences.',now()-interval '2 days' from client_order c
on conflict(id) do nothing;

-- A readable, filterable history of account changes.
with recent as (select t.*,row_number() over(partition by t.client_id order by t.created_at desc) as n from public.transactions t)
insert into public.audit_log(id,actor_id,action,entity,entity_id,before_value,after_value,created_at)
select md5('demo-audit:'||r.id::text)::uuid,r.trader_id,'balance.'||r.type,'account',r.client_id::text,
  jsonb_build_object('balance',r.balance_before),jsonb_build_object('balance',r.balance_after,'amount',r.amount),r.created_at
from recent r where r.n<=4
on conflict(id) do nothing;
insert into public.contact_submissions(id,name,email,phone,message,status,created_at) values
(md5('demo-contact:1')::uuid,'Lerato Phiri','lerato.phiri@example.co.za','+27 82 455 0182','I would like to understand how your onboarding process works and what information you need from me.','new',now()-interval '2 hours'),
(md5('demo-contact:2')::uuid,'Michael Botha','michael.botha@example.co.za',null,'Could someone from the team contact me to talk through your approach to reporting?','new',now()-interval '1 day'),
(md5('demo-contact:3')::uuid,'Ayanda Zulu','ayanda.zulu@example.co.za','+27 71 292 8900','I have a few questions about the client portal and how withdrawals are handled.','responded',now()-interval '4 days')
on conflict(id) do nothing;

-- Published website copy and editable drafts. The application also has safe first-run defaults.
with documents(key,value) as (values
('site', $json${"name":"Northline","tagline":"A clearer view of your capital.","email":"hello@northline.co.za","phone":"+27 21 012 4800","location":"Cape Town, South Africa","seoTitle":"Northline | A clearer view of your capital","seoDescription":"Thoughtful trading, transparent reporting and a direct line of sight to your capital.","linkedin":"https://www.linkedin.com","instagram":"https://www.instagram.com","logoUrl":""}$json$::jsonb),
('hero', $json${"eyebrow":"A MORE CONSIDERED WAY FORWARD","title":"Your capital deserves a clearer view.","description":"Professional trading, transparent reporting and every important number in one place. Move forward with confidence, not guesswork.","cta":"Get in touch","ctaHref":"/#contact","secondary":"Explore how it works","secondaryHref":"/#how-it-works","imageUrl":"/images/hero-city.jpg","focalX":50,"focalY":50,"overlay":68}$json$::jsonb),
('features', $json${"eyebrow":"THE NORTHLINE APPROACH","title":"Confidence is built on clarity.","subtitle":"The right expertise matters. So does knowing exactly where you stand, every step of the way.","items":[{"icon":"users","title":"Experienced hands","description":"Your capital is managed by dedicated traders with a measured, disciplined approach."},{"icon":"scan","title":"Nothing out of sight","description":"Clear reporting makes it easier to understand what is happening and why."},{"icon":"activity","title":"A live perspective","description":"Follow your balance and activity as they change, all from one secure portal."},{"icon":"shield","title":"Control stays with you","description":"Request withdrawals and raise questions directly, whenever you need to."}]}$json$::jsonb),
('showcase', $json${"eyebrow":"BUILT AROUND YOUR VIEW","title":"Clarity, wherever you look.","subtitle":"A simple, connected experience for the people behind every decision.","rows":[{"title":"The full picture, in real time.","description":"Your personal portal turns complex activity into a clear view of your balance, your history and the people managing your capital.","checks":["Live balance and performance history","A complete, searchable transaction record","Updates that arrive when something changes"],"button":"Explore the client portal","href":"/login","variant":"client","side":"left"},{"title":"Better tools for better decisions.","description":"Our traders work in a connected environment designed for attentive management, careful record-keeping and timely communication.","checks":["One view of every assigned client","Considered trade and balance workflows","Direct conversations, without the wait"],"button":"How we work","href":"/#how-it-works","variant":"trader","side":"right"}]}$json$::jsonb),
('steps', $json${"eyebrow":"THE JOURNEY","title":"Simple from the first step.","subtitle":"A considered process that keeps you informed from the first conversation onward.","items":[{"title":"Let's get acquainted","description":"We learn about your goals, your time horizon and the way you prefer to stay informed."},{"title":"Meet your trader","description":"You are matched with a dedicated trader who looks after your account."},{"title":"Your capital at work","description":"Trades are managed with care and recorded transparently in your account."},{"title":"Stay in the know","description":"Log in to see your balance, follow activity and reach us whenever you need."}]}$json$::jsonb),
('preview', $json${"eyebrow":"ALWAYS IN THE LOOP","title":"A direct line to what matters.","description":"Balance updates, withdrawal progress and answers to your questions: all right where you expect them.","cta":"Log in to your portal"}$json$::jsonb),
('about', $json${"eyebrow":"ABOUT NORTHLINE","title":"A human approach to a changing market.","body":"We founded Northline around a simple conviction: people deserve to feel informed, not in the dark, about the capital they entrust to others. That means pairing experienced trading with thoughtful service and technology that makes the important things easy to see.","mission":"Our mission is to make professional trading feel more personal, accountable and understandable.","imageUrl":"/images/studio.jpg","figures":[{"value":"01","label":"Clear point of contact"},{"value":"24/7","label":"Access to your portal"},{"value":"100%","label":"Visibility of activity"}]}$json$::jsonb),
('contact', $json${"eyebrow":"START A CONVERSATION","title":"Let's talk about what comes next.","subtitle":"Have a question about Northline? Tell us a little about yourself and our team will get back to you."}$json$::jsonb),
('risk', $json${"title":"An important note on risk","body":"All trading carries risk, including the possibility of losing some or all of your capital. The value of your account can go down as well as up. Past performance is not a reliable indicator of future results. Please consider your circumstances and seek independent advice before making a decision."}$json$::jsonb),
('legal_terms', $json${"title":"Terms of use","body":"These terms govern your use of the Northline website and portal. Information on this site is for general information only and does not constitute personal financial advice. You are responsible for keeping your login details secure. Contact our team if you need help understanding your account or these terms."}$json$::jsonb),
('legal_privacy', $json${"title":"Privacy policy","body":"We collect information you provide to us so we can communicate with you, manage your account and meet our legal obligations. We use appropriate safeguards to protect your information and do not sell your personal data. You may request access to, correction of or deletion of your personal information by contacting our team."}$json$::jsonb),
('legal_risk', $json${"title":"Risk disclosure","body":"Trading in financial markets involves substantial risk. Prices may fluctuate significantly and losses can exceed expectations. There are no guaranteed returns. Historical results, illustrations and portfolio examples should not be taken as a promise of future performance. Only commit capital you can afford to put at risk, and seek independent professional advice where appropriate."}$json$::jsonb)
)
insert into public.cms_documents(key,published,draft,version)
select key,value,case when key='hero' then jsonb_set(value,'{title}','"Your capital, with more perspective."'::jsonb) when key='about' then jsonb_set(value,'{mission}','"A more personal approach to every decision."'::jsonb) else value end,1
from documents on conflict(key) do nothing;

insert into public.faqs(id,question,answer,status,sort_order) values
(md5('faq:1')::uuid,'How will I know what is happening with my account?','Your secure portal shows your current balance, transaction history and notifications when important activity takes place. Your dedicated trader is also available for questions.','published',1),
(md5('faq:2')::uuid,'Can I request a withdrawal?','Yes. You can submit a withdrawal request from your portal. We show its status at each stage, and your balance is updated once the request has been processed.','published',2),
(md5('faq:3')::uuid,'Who will manage my capital?','Every client is assigned a dedicated trader. You can see who they are and contact our team directly through your portal.','published',3),
(md5('faq:4')::uuid,'Is my capital guaranteed?','No. Trading always involves risk, including the possibility of losing capital. We believe in being clear about that from the outset. Please read our risk disclosure before making a decision.','published',4),
(md5('faq:5')::uuid,'How do I get started?','Send us a message through the contact form. We will arrange a conversation to understand your needs and explain our process before you make any decisions.','published',5),
(md5('faq:6')::uuid,'Can I receive more detailed monthly reports?','Our team can walk you through additional reporting options during onboarding.','draft',6)
on conflict(id) do nothing;
insert into public.testimonials(id,quote,name,role,rating,status,sort_order) values
(md5('testimonial:1')::uuid,'I can see the full picture without having to chase for an update. The clarity of the portal has made a real difference to how comfortable I feel.','Nomsa Mokoena','Client, Cape Town',5,'published',1),
(md5('testimonial:2')::uuid,'The team communicates plainly and responds when it matters. I appreciate having a direct relationship with the person looking after my account.','Daniel Jacobs','Client, Johannesburg',5,'published',2),
(md5('testimonial:3')::uuid,'Thoughtful people and an easy way to follow what is going on. It feels refreshingly straightforward.','Thandi Ndlovu','Client, Durban',4,'published',3),
(md5('testimonial:4')::uuid,'The transaction record makes it genuinely easy to understand what has changed and when. That sense of perspective matters to me.','Sipho Dlamini','Client, Pretoria',5,'published',4),
(md5('testimonial:5')::uuid,'I value having a single place to see my account and communicate with the team.','Naledi Molefe','Client, Bloemfontein',5,'draft',5)
on conflict(id) do nothing;
insert into public.team_members(id,name,role,bio,avatar_url,status,sort_order) values
(md5('team:1')::uuid,'Amina Patel','Managing Director','Amina leads Northline with a focus on clarity, governance and long-term client trust.',null,'published',1),
(md5('team:2')::uuid,'Thabo Maseko','Lead Trader','Thabo guides our trading approach with discipline and careful risk management.',null,'published',2),
(md5('team:3')::uuid,'Zanele Khumalo','Client Success Lead','Zanele ensures every client conversation is handled with care and attention.',null,'published',3),
(md5('team:4')::uuid,'Karabo van der Merwe','Operations Lead','Karabo keeps our reporting and operations precise and transparent.',null,'draft',4)
on conflict(id) do nothing;
