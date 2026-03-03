# Workflow

## 0. Validate

Write one hypothesis. Build the minimum test in hours. Ship to real users.
Move on when you see organic pull. Kill after 2–3 pivots with no signal.

---

## 1. Product → Design → UI

```
z-product-brief                       → docs/product-brief.md
z-prd-craft                           → docs/prd.md
z-ux-designer                         → docs/ux-design.md
  + Stitch (parallel)               → visual mockups
UI implementation
Review feature and UX — revise upstream docs if needed
```

---

## 2. Architecture → Build

Tracking plan is defined in parallel with architecture — events are baked in from the start.

```
z-software-architecture               → docs/design-doc.md
z-database-design                     → docs/database-design.md
z-rest-api-design                     → openapi/openapi.yaml

z-data-analyst (parallel)
  → biz/analytics/tracking-plan.md       # events + Aha Moment
  → biz/analytics/funnels.md             # funnel stages + target rates
  → biz/analytics/dashboards.md          # PostHog dashboard specs
  → biz/analytics/kill-criteria.md       # Kill / Keep / Scale criteria

Backend implementation
Frontend implementation
  + sentry error tracking 
  + posthog user tracking 
```

Unit + integration tests only. E2E comes after Scale (step 6).
Exception: manually test payment flows before launch.

---

## 3. Deploy

Set up CI/CD first so every push goes through the pipeline.

### Infra (Pulumi)
- Stack init (staging / production)
- Resources: Cloud Run, IAM, DNS+SSL (Cloudflare), PostgreSQL (Neon)
- `pulumi up` to provision everything

### DB
- Run migrations
- Seed data (if needed)
- Backup schedule

### CI/CD
- Dockerfile per service
- GitHub Actions (build → push → deploy)
- GitHub Secrets

### Mobile (if applicable)
- EAS project + build profiles
- EAS Update (OTA) channel
- App Store / Play Store credentials

### First deploy checklist
- [ ] Staging → smoke test → Production
- [ ] PostHog events firing
- [ ] Sentry connected (API + Worker + Web + Mobile)
- [ ] Aha Moment event works end-to-end

---

## 4. Launch → Marketing

```
z-marketer
  → biz/marketing/strategy.md            # positioning, audience, channels
  → biz/marketing/pricing.md             # tiers and packaging
  → biz/marketing/competitors.md         # competitive landscape
  → biz/marketing/launch/                # PH, HN, Reddit drafts + checklist
  → biz/marketing/content/               # email sequences, content calendar
  → biz/marketing/assets/                # OG image, screenshots, demo
  → biz/marketing/seo/                   # technical SEO (sitemap, meta, OG, robots.txt)
  → biz/legal/                           # ToS, Privacy Policy
  → biz/ops/                             # FAQ, runbook
```

### Launch day
- Post per `biz/marketing/launch/checklist.md`
- Respond to all comments within 2 hours
- Log feedback → `biz/ops/feedback-log.md`

---

## Operate (ongoing from launch)

Runs in parallel — not a sequential step.

- Daily: check feedback → `biz/ops/feedback-log.md`
- Same question 3+ times → update FAQ
- Incidents → follow `biz/ops/runbook.md`
- Feed insights back into step 1, 2, or 6

---

## 5. Measure → Decide

Check dashboard every morning (5 min). First Kill/Keep/Scale call at week 2.

```
z-data-analyst
  → biz/analytics/reports/               # weekly reports
  → biz/analytics/health-score.md        # customer health score
  → Kill / Keep / Scale recommendation
```

**Week 1:** Observe. Respond to feedback. Don't optimize yet.
**Week 2:** First evaluation per `biz/analytics/kill-criteria.md`
**After:** Re-evaluate weekly until decision is clear.

Fix in this order: **Retention → Activation → Acquisition**

- **Kill** → Post-mortem, archive, move on same day.
- **Keep** → Back to step 1 or 2. Fix the biggest problem.
- **Scale** → Continue to step 6.

---

## 6. Grow → Optimize

Only after Scale. Don't grow a leaky product.

```
z-growth-optimizer
  → biz/growth/experiments.md            # ICE-scored backlog + results
  → biz/growth/referral-program.md       # referral + viral loops
  → biz/growth/churn-prevention.md       # cancel flow, save offers
  → biz/growth/dunning.md               # payment failure recovery
  → biz/growth/cro/                      # per-page/flow CRO
  → biz/growth/seo/                      # content SEO (keywords, blog, landing pages)
  → Experiment results → z-data-analyst  # statistical analysis handoff
```

### Now add E2E tests
Product survived — protect core flows from regression.
- [ ] E2E for critical paths (signup → Aha Moment → payment)
- [ ] Integrated into CI pipeline
- [ ] Flaky tests: fix or delete within 48 hours
