# Ideas and Future Backlog

This file preserves long-term ideas without adding them to current scope. An
idea moves into the roadmap only when merchant evidence, expected value, and
implementation cost are understood.

## Product Expansion

- Store-level reviews
- Merchant replies
- Photo and video reviews
- Review syndication
- Review export
- Additional widget layouts
- Multi-language widgets
- Voice reviews

## Merchant Growth Tools

- Coupons for completed reviews (auto-generated discount after submission)
- Referral prompts
- Loyalty integrations
- Additional review-request campaigns and reminders
- In-email interactive review forms (AMP or similar)
- SMS or web-push review requests via compatible apps
- Product review highlights
- Agency and multi-store workflows
- Shopify Flow trigger when a review is collected (BFS Product reviews 5.11.1)
- Admin customer-detail block for that customer’s reviews (BFS 5.11.2)

Do not confuse these with Phase 3 (production readiness) or the Phase 4 delay /
multi-product email checklist in `04_ROADMAP.md`.

## SEO and Insights

- Aggregate-rating and review structured data
- Product-level review trends
- Review heatmaps
- Conversion attribution
- Cohort and campaign reports
- Customer themes such as "Customers love sizing but dislike delivery"

## AI Experiments

- Review summaries
- Sentiment analysis
- Fake-review detection
- AI-assisted moderation
- Review quality scores
- Automatic translation

AI features must have a clear merchant problem, human override, cost limit, and
quality measurement before production use.

## Integrations

- Klaviyo
- Gorgias
- WhatsApp
- Zapier
- Instagram
- TikTok
- Loyalty platforms

Build integrations individually in response to merchant demand. Do not create
a generic integration platform first.

## Community and Gamification

- Reviewer badges
- Top reviewers
- Milestones
- Merchant-configured rewards

These features carry fraud, policy, and incentive-quality risks and should be
validated experimentally.

## Platform and Enterprise

- Public or partner API
- Custom roles and permissions
- White-label options
- SLA and dedicated support
- Custom integrations
- Advanced billing and usage tiers

## Scale Options

These are operational options, not planned features:

- Dedicated background queue
- Redis caching
- Read replicas
- Table partitioning
- Search service
- Service extraction
- Data warehouse

Adopt one only when measurements show that the existing modular monolith
cannot meet a defined reliability or performance target.

## Promotion Checklist

Before moving an idea into the roadmap, record:

- Merchant problem and requested outcome
- Number and type of merchants asking for it
- Smallest testable version
- Success metric
- Data, security, and support implications
- Dependencies and estimated ongoing cost
