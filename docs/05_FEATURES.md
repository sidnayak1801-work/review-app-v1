# Feature Priorities

Features are prioritized by what the first 50–100 merchants need. A lower
priority does not mean an idea is rejected; it means the feature should not
delay validation of the core product.

## Must Have — Launchable MVP

### Merchant and Shop

- Shopify OAuth installation and reinstallation
- Uninstall handling without accidental merchant-data loss
- Embedded merchant dashboard shell
- Basic merchant settings

### Reviews

- Product reviews with rating, title, body, and timestamps
- Customer review submission
- Review list and detail views
- Pending, approved, and rejected moderation states
- Edit and delete controls
- Verified-purchase flag when order data is available
- Pagination and basic filtering

### Storefront

- Theme App Extension
- One product review widget
- One star-rating badge
- Basic color and text settings
- Accessible, responsive, lightweight rendering

### Acquisition and Migration

- Single review-request email after purchase
- CSV review import with validation and error reporting

### Pricing

- Free plan with 100 published reviews and 50 review requests per month
- Pro plan at `$19/month` with a 14-day trial, 5,000 published reviews, and
  1,000 review requests per month
- Shopify-hosted plan selection and billing
- Self-serve upgrade, downgrade, and cancellation behavior
- Server-side allowance enforcement without deleting merchant data

### Operations

- Tenant isolation
- Input validation and spam protection
- Logging and meaningful errors
- Basic tests, deployment checks, and monitoring
- Product reviews App Store classification
- Built for Shopify-aligned design, integration, security, and performance
  traits

## Should Have — After MVP Validation

- Store-level reviews
- Merchant replies
- Photo reviews
- Review request reminders
- Review export
- Search and richer moderation filters
- Basic SEO aggregate-rating markup
- Widget translations
- Additional layout controls

## Nice to Have — Growth Improvements

- Questions and answers
- Coupons for completed reviews
- Referral prompts
- Multiple widget layouts
- Review highlights and simple product insights
- Additional email templates
- Multi-store agency conveniences

## Future — Scale and Platform Expansion

- Video reviews
- Advanced analytics and reports
- Public or partner API access
- Review syndication
- Klaviyo, Gorgias, WhatsApp, Zapier, Instagram, and TikTok integrations
- Loyalty-platform integrations
- Enterprise roles, SLA, white-label, and custom integrations
- Advanced billing tiers and usage metering

## Experimental — Validate Before Building

- AI review summaries
- AI moderation and fake-review detection
- Sentiment analysis
- Automatic review translation
- Review quality scores
- Voice reviews
- Review heatmaps
- Gamification, badges, and top reviewers

## MVP Workflow

Merchant:

1. Install the app.
2. Enable the widget.
3. Import existing reviews or wait for new submissions.
4. Approve or reject pending reviews.
5. Adjust basic widget settings.

Customer:

1. View approved reviews on a product page.
2. Submit a rating and text review.
3. Receive clear validation and success feedback.

The MVP is complete only when both workflows work end to end.
