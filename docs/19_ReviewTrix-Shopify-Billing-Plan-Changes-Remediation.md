ReviewTrix — Shopify Billing Plan Changes Remediation

Purpose

This document is the implementation specification for fixing the Shopify App Store review issue:

Allow pricing plan changes — merchants must be able to upgrade and downgrade their pricing plan without contacting support or reinstalling the app.

Shopify specifically reported that after subscribing to the Pro plan, the reviewer was unable to downgrade back to the Free plan.

ReviewTrix currently has only two plans:

Free — $0

Pro — $19/month

The goal is to make the complete Free → Pro → Free lifecycle work end-to-end from inside ReviewTrix.

1. Shopify Review Requirement

The implementation must satisfy all of the following:

Merchant can upgrade from Free → Pro.

Merchant can downgrade from Pro → Free.

No support contact is required.

No uninstall/reinstall is required.

The actual Shopify billing/subscription state must be changed.

ReviewTrix's internal plan state must be synchronized with Shopify.

Feature access must match the resulting plan.

Existing merchant data must remain intact.

Shopify billing/charge history must remain correct.

The UI must not instruct the merchant to manually visit Shopify Admin to downgrade.

The implementation must solve the actual billing problem, not merely hide/change UI buttons.

2. Current UI Problem

The current Billing page contains a "Manage plan" section with:

Refresh billing status

Text similar to:
Upgrade opens Shopify checkout. Downgrade or cancel in Shopify Admin

This is not sufficient for Shopify's requirement.

The merchant should be able to manage the plan directly from ReviewTrix.

Remove

Remove the following from the merchant-facing billing UI:

Refresh billing status as a plan-management action.

Instructions telling the merchant to downgrade/cancel from Shopify Admin.

If billing refresh functionality is genuinely required internally, it may remain as an internal/backend capability, but it should not be presented as the primary way to manage the plan.

3. Required Billing UI

There are only two plans, so keep the UI simple.

Free plan

Display:

Free — $0

Up to 100 published reviews
and 100 request emails/month

[ Upgrade to Pro ]

When Free is the current plan, clearly mark it as the current plan.

Pro plan

Display:

Pro — $19/month

14-day trial.
Unlimited published reviews
and unlimited request emails/month.

[ Current plan ]
[ Downgrade to Free ]

Preserve the existing trial/expiration information if it already exists.

The exact copy and Polaris components can follow the existing ReviewTrix design system.

4. IMPORTANT: Inspect Existing Implementation First

Do NOT rebuild the billing system from scratch.

Before modifying code, inspect the existing implementation end-to-end.

Find and understand:

Billing frontend/page.

Pricing cards.

Current-plan detection.

Upgrade button/action.

Backend billing controller/routes.

Billing service.

Shopify Admin GraphQL implementation.

appSubscriptionCreate.

Existing subscription query.

Existing subscription cancellation logic.

Confirmation URL handling.

Return URL handling.

OAuth/session handling.

Database subscription/plan fields.

How ReviewTrix determines Free vs Pro.

Feature-limit enforcement.

Billing-related webhooks.

Trial logic.

Test billing mode.

Existing error handling.

Reuse existing abstractions wherever possible.

Do not create duplicate billing services or duplicate subscription-state logic.

5. Upgrade Flow: Free → Pro

The existing upgrade flow should continue to work.

Expected flow:

Billing page
    ↓
Click "Upgrade to Pro"
    ↓
ReviewTrix backend
    ↓
Shopify Admin GraphQL billing API
    ↓
appSubscriptionCreate
    ↓
Shopify confirmation URL
    ↓
Merchant approves
    ↓
Return to ReviewTrix
    ↓
Verify Shopify subscription
    ↓
Synchronize ReviewTrix plan state
    ↓
UI shows Pro as Current plan

Important

Do not mark the merchant as Pro merely because the upgrade button was clicked.

The Pro plan should only become active after Shopify confirms that the subscription is actually active/approved.

Preserve the existing 14-day trial behavior if the current implementation already provides it.

If the merchant rejects/cancels the Shopify approval screen:

Do not switch the merchant to Pro.

Keep the merchant on Free.

Show an appropriate error/cancelled state.

6. Downgrade Flow: Pro → Free

This is the main Shopify review issue.

The Pro merchant must have a visible:

Downgrade to Free

action directly in ReviewTrix.

IMPORTANT: Use a deferred/scheduled downgrade

Do NOT immediately remove Pro access when the merchant requests a downgrade.

For a paid Pro → Free downgrade, the ideal merchant experience is:

Pro is currently active
        ↓
Merchant clicks "Downgrade to Free"
        ↓
Show confirmation modal
        ↓
Merchant confirms
        ↓
ReviewTrix requests the Shopify cancellation/downgrade
        ↓
Pro renewal is stopped / downgrade is scheduled
        ↓
Merchant keeps Pro access until the end
of the current paid billing period
        ↓
Current billing period ends
        ↓
Pro subscription becomes inactive/cancelled
        ↓
ReviewTrix synchronizes entitlement to Free
        ↓
Free limits/features become active

The key principle is:

Cancellation requested
        ≠
Immediate loss of Pro entitlement

The merchant has already paid for the current Pro period, so ReviewTrix should normally allow the merchant to continue receiving Pro benefits until that paid period ends, while preventing the next renewal.

Use the appropriate Shopify-supported deferred cancellation/downgrade behavior for the billing architecture already used by this application. Do not invent custom refund or credit logic.

Required state model

The implementation should be able to distinguish at least these logical states:

FREE
PRO_ACTIVE
PRO_DOWNGRADE_SCHEDULED

The exact representation may reuse existing database fields and Shopify subscription state instead of introducing a new database state.

FREE

Shopify:
No active Pro subscription

ReviewTrix:
Free entitlement

Features:
Free limits

PRO_ACTIVE

Shopify:
Pro subscription active

ReviewTrix:
Pro entitlement

Features:
Pro limits

PRO_DOWNGRADE_SCHEDULED

Shopify:
Pro subscription still active for the current period,
but cancellation/downgrade has been requested

ReviewTrix:
Pro entitlement

Features:
Pro limits until the effective downgrade date

The Billing UI must clearly communicate that the downgrade is scheduled rather than pretending the merchant is already on Free.

Required downgrade flow

Pro
    ↓
Click "Downgrade to Free"
    ↓
Show confirmation modal
    ↓
Merchant confirms
    ↓
ReviewTrix backend
    ↓
Identify the merchant's current Pro Shopify subscription
    ↓
Request the appropriate Shopify-supported
cancellation/deferred downgrade
    ↓
Handle Shopify response/errors
    ↓
Verify the resulting subscription state
    ↓
Record/synchronize that downgrade is scheduled
    ↓
Keep ReviewTrix entitlement = Pro
    ↓
Show scheduled downgrade and effective date
    ↓
At the end of the current billing period:
    ↓
Verify Shopify Pro subscription is no longer active
    ↓
Synchronize ReviewTrix plan = Free
    ↓
Apply Free limits/features

The merchant must NOT need to:

Contact ReviewTrix support.

Uninstall ReviewTrix.

Reinstall ReviewTrix.

Manually open Shopify Admin billing settings.

7. Downgrade Confirmation Modal

The downgrade must not happen accidentally.

Because Pro remains active until the end of the paid period, make that explicit.

Show a confirmation modal similar to:

Downgrade to Free?

Your Pro plan will stop renewing and will remain active
until <effective date>. After that date, your account
will switch to the Free plan.

Your existing reviews and data will remain intact.

[ Cancel ]    [ Downgrade to Free ]

The exact wording may be adapted to the existing product style.

The confirmation should make these facts clear:

Pro is not removed immediately.

The current paid period remains active.

The next Pro renewal will not occur.

The account will move to Free after the effective date.

Existing data is preserved.

8. Shopify Billing Implementation

Use the currently configured Shopify Admin API version.

Before coding, inspect how the project currently implements billing.

If the existing architecture uses Shopify Admin GraphQL billing APIs, reuse it.

Relevant Shopify billing operations may include:

appSubscriptionCreate

appSubscriptionCancel

subscription queries

subscription status fields

billing-related user errors

Upgrade

For Free → Pro, use the existing valid subscription-creation flow.

The backend should correctly handle:

Shopify confirmation URL.

Merchant approval.

Trial period.

Active subscription state.

Shopify API errors.

Downgrade

For Pro → Free, do NOT create a fake $0 paid subscription simply to represent Free.

The Free plan is the absence of the Pro paid subscription.

The appropriate flow is to cancel the active Pro Shopify subscription and then synchronize ReviewTrix's entitlement to Free.

Do not implement a fake local-only cancellation while leaving the Shopify Pro subscription active.

9. Proration / Credits

Do not invent custom refund or credit logic.

Inspect the current Shopify billing behavior and implementation.

If cancellation requires a Shopify-supported proration choice, use the appropriate Shopify behavior and document the decision.

Do not add custom payment/refund logic unless the existing product requirements explicitly require it.

10. Plan State Synchronization

The system must keep these states consistent:

Shopify subscription state
        ↓
ReviewTrix billing state
        ↓
Feature entitlement
        ↓
Billing UI

During a scheduled downgrade

Immediately after the merchant confirms the downgrade:

Shopify:
Pro subscription remains active until its effective end date
and will not renew

ReviewTrix:
PRO_DOWNGRADE_SCHEDULED

Feature access:
Pro limits/features remain active

Billing UI:
"Downgrade scheduled"
"Pro access until <effective date>"

After the effective downgrade date

Shopify:
Pro subscription = cancelled/inactive

ReviewTrix:
plan = FREE

Feature access:
Free limits/features

Billing UI:
Free = Current plan
Pro = Upgrade to Pro

The application must NOT switch the merchant to Free prematurely if Shopify indicates that the Pro subscription is still active.

Never show Pro as active if the Shopify subscription was never successfully activated.

Never show "Downgrade successful" unless the backend has confirmed that the downgrade request was accepted/scheduled.

Likewise, do not show "Free — Current plan" until the Pro entitlement has actually ended.

The exact timing must be derived from Shopify's subscription state/effective date rather than from a client-side timer.

11. Existing Data Must Not Be Deleted

Downgrading must NOT delete merchant data.

Preserve:

Published reviews.

Products.

Customers.

Q&A data.

Review requests.

Incentives data.

Integrations/configuration where applicable.

Historical billing information.

Other existing merchant data.

Published reviews must remain visible after downgrading.

Only the subscription entitlement and corresponding feature limits should change.

12. Edge Cases

Handle the following safely.

Duplicate upgrade

If a merchant already has an active Pro subscription:

Do not create another duplicate Pro subscription.

Return the correct current-plan state.

Duplicate downgrade

If a downgrade is already scheduled:

Do not schedule another cancellation.

Show the existing scheduled downgrade/effective date.

Do not create duplicate billing operations.

If the Pro subscription is already cancelled/inactive:

Reconcile the state.

Move to Free if appropriate.

Shopify API failure

If Shopify fails during upgrade/downgrade:

Do not claim success.

Do not silently modify the local plan.

Return a useful error.

Keep the UI consistent with the actual known state.

User rejects upgrade

If the merchant rejects Shopify's approval:

Remain on Free.

Do not mark Pro active.

Return without approval

If the merchant returns to ReviewTrix without completing billing approval:

Verify the subscription.

Do not assume success.

Trial

Handle the existing trial state correctly.

Do not accidentally cancel or extend a trial unless the intended downgrade behavior requires it.

Expired subscription

Correctly reconcile an expired Pro subscription to Free where appropriate.

Local/Shopify mismatch

Examples:

Database = Pro
Shopify = no active Pro subscription

or:

Database = Free
Shopify = active Pro subscription

Do not blindly trust only one side.

Use the existing billing synchronization strategy and improve it if necessary.

13. Remove "Refresh Billing Status" From Main UX

The current UI has:

Refresh billing status

This is not the correct merchant action for changing plans.

Replace the plan-management area with direct actions:

When Free:

[ Upgrade to Pro ]

When Pro:

[ Downgrade to Free ]

The current plan should be visually obvious.

A manual refresh button should not be necessary for normal plan changes.

14. Backend/API Design

Follow the project's existing architecture.

Do not add unnecessary endpoints if existing billing endpoints can be extended.

Possible logical operations:

GET current billing/subscription state

POST upgrade/create Pro subscription

POST downgrade/cancel Pro subscription

The exact route names should follow the project's existing conventions.

All billing actions must be authenticated against the correct Shopify shop/session.

Never allow one shop's subscription to be modified using another shop's session/context.

15. Security

Billing operations are sensitive.

Verify:

Authenticated Shopify merchant/session.

Correct shop/domain.

Correct access token.

Correct subscription belongs to the current shop.

No client-supplied plan ID should be trusted blindly.

Server must determine the merchant's actual current plan.

Do not expose Shopify access tokens to frontend code.

16. UI State Handling

The frontend should have proper loading, scheduled, success, and error states.

Successful downgrade request

Downgrade to Free
        ↓
Loading...
        ↓
Shopify confirms cancellation/downgrade request
        ↓
Downgrade scheduled
        ↓
Pro remains Current plan
        ↓
Show effective date

Example:

Pro — $19/month

[ Current plan ]

Downgrade scheduled
Pro access until September 19, 2026

[ Keep Pro plan ]

If the merchant chooses to cancel the scheduled downgrade, use an appropriate Shopify-supported reactivation/restore flow if supported by the existing billing architecture. Do not invent local-only state.

If the downgrade request fails

Downgrade to Free
        ↓
Shopify/API error
        ↓
Show error
        ↓
Keep current plan = Pro

After the effective date

The app should verify the actual Shopify subscription state and then display:

Free — Current plan

[ Upgrade to Pro ]

Do not optimistically change Pro → Free immediately after the downgrade request.

Prevent repeated clicks while a billing operation is in progress.

17. Shopify Charge/Billing History

Shopify's review specifically mentions:

ensuring that the charges are successfully processed in the application charge history page in the merchant admin.

Therefore, the implementation must use Shopify's real billing/subscription APIs.

Do NOT:

Fake billing records.

Only update the ReviewTrix database.

Pretend a subscription exists.

Cancel only the local record while leaving Shopify billing active.

The Shopify side must reflect the actual subscription lifecycle.

18. Shopify MCP Verification

If Shopify MCP is available in the project/environment, use it.

After implementation, verify the actual Shopify state.

At minimum verify:

Current app subscription.

Free → Pro upgrade.

Pro subscription becomes active.

Pro → Free downgrade.

Pro subscription becomes cancelled/inactive.

Final merchant billing state.

Shopify charge/subscription history where accessible.

Do not assume the implementation is correct merely because TypeScript compiles or unit tests pass.

If Shopify MCP is unavailable, state this clearly and perform the strongest possible API/local verification.

19. Test Matrix

The following scenarios must be tested.

Test 1 — Free → Pro

Expected:

Upgrade button works.

Shopify confirmation opens.

Merchant can approve.

Pro subscription becomes active.

ReviewTrix displays Pro.

Pro limits/features apply.

Test 2 — Pro → Free

Expected:

Downgrade button is visible.

Confirmation modal appears.

Merchant confirms.

Shopify accepts the cancellation/deferred downgrade.

Pro remains active until the current paid billing period ends.

ReviewTrix shows "Downgrade scheduled".

ReviewTrix continues applying Pro limits/features during the remaining paid period.

No new Pro renewal occurs.

After the effective date, Shopify Pro becomes inactive/cancelled.

ReviewTrix changes to Free.

Free limits/features apply.

Existing reviews/data remain.

Test 3 — Full round trip

Free
 ↓
Pro
 ↓
Downgrade scheduled
 ↓
End of Pro billing period
 ↓
Free

Expected: both transitions work without reinstalling and the merchant does not lose already-paid Pro access prematurely.

Test 4 — Refresh

After each transition:

Refresh the Billing page.

Confirm the correct plan is still displayed.

Confirm backend state remains correct.

Test 5 — Reject upgrade

Expected:

Merchant remains Free.

No false Pro state.

Test 6 — Duplicate clicks

Expected:

No duplicate subscriptions.

No duplicate cancellation.

No inconsistent plan state.

Test 7 — Shopify API error

Expected:

Error is surfaced.

No false success.

Existing plan remains accurate.

Test 8 — Existing active Pro subscription

Expected:

Clicking Upgrade again does not create an unwanted duplicate subscription.

20. Database Changes

Before adding any database changes, inspect the current schema.

Prefer reusing existing fields.

Do not create a new subscription table if the current architecture already stores:

Shopify subscription ID.

Plan.

Status.

Trial/expiration information.

If a schema change is genuinely required:

Explain why.

Create the appropriate migration.

Preserve existing records.

Ensure old installations continue to work.

21. Keep Test Billing Mode Working

The current Billing page shows:

Test billing mode
Charges are created in Shopify test mode.

Do not accidentally break the existing test/development billing flow.

The implementation should remain testable in the project's existing Shopify development environment.

Make sure upgrade and downgrade behavior works correctly under the existing test-mode setup.

22. Do Not Overengineer

There are only two plans.

Do NOT introduce:

Generic multi-tier subscription architecture.

Unnecessary plan configuration systems.

New billing microservices.

Complex state machines.

Multiple redundant subscription tables.

Unnecessary abstractions.

Implement the smallest clean change that fully solves the Shopify review requirement.

23. Recommended Final UX

Free

Plans

┌─────────────────────────────────────┐
│ Free — $0                           │
│                                     │
│ Up to 100 published reviews        │
│ and 100 request emails/month       │
│                                     │
│ [ Current plan ]                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Pro — $19/month                     │
│                                     │
│ 14-day trial                        │
│ Unlimited published reviews        │
│ Unlimited request emails/month     │
│                                     │
│ [ Upgrade to Pro ]                 │
└─────────────────────────────────────┘

Pro

Plans

┌─────────────────────────────────────┐
│ Free — $0                           │
│                                     │
│ Up to 100 published reviews        │
│ and 100 request emails/month       │
│                                     │
│ [ Downgrade to Free ]              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Pro — $19/month                     │
│                                     │
│ Unlimited published reviews        │
│ Unlimited request emails/month     │
│                                     │
│ [ Current plan ]                    │
│                                     │
│ Renews/expires: <existing info>    │
└─────────────────────────────────────┘

Pro after downgrade is scheduled

┌─────────────────────────────────────┐
│ Pro — $19/month                     │
│                                     │
│ [ Current plan ]                    │
│                                     │
│ Downgrade scheduled                 │
│ Pro access until <effective date>  │
│                                     │
│ [ Keep Pro plan ]                   │
└─────────────────────────────────────┘

The exact visual arrangement can be adapted to the current ReviewTrix Polaris implementation.

24. Implementation Process

Follow this sequence.

Step 1 — Audit

Locate all billing-related code and document:

Frontend files.

Backend files.

Shopify billing functions.

DB models.

API routes.

Webhooks.

Existing tests.

Step 2 — Trace current upgrade

Understand exactly how Free → Pro currently works.

Do not modify it unnecessarily.

Step 3 — Find root cause

Determine why the Shopify reviewer cannot currently downgrade Pro → Free.

Step 4 — Implement downgrade

Add the real Shopify subscription cancellation flow.

Step 5 — Update UI

Replace the current "Manage plan" area with direct upgrade/downgrade actions.

Step 6 — Synchronize state

Ensure Shopify state and ReviewTrix state remain consistent.

Step 7 — Test

Run:

Unit tests.

Integration tests.

Type checking.

Linting.

Existing billing tests.

Manual Shopify test flow where possible.

Step 8 — Shopify verification

Use Shopify MCP if available.

Step 9 — Final audit

Confirm that the implementation satisfies every Shopify reviewer requirement.

25. Definition of Done

This task is complete ONLY when all of the following are true:

Free plan can upgrade to Pro.

Pro plan can request a downgrade to Free.

Paid Pro access remains available until the scheduled effective downgrade date.

The Pro subscription does not renew after a successful downgrade request.

After the effective date, the merchant becomes Free.

Upgrade happens through the real Shopify billing flow.

Downgrade uses the appropriate Shopify-supported deferred/scheduled cancellation behavior.

The Shopify Pro subscription actually becomes inactive/cancelled at the effective time.

No reinstall is required.

No support contact is required.

Merchant does not need to manually visit Shopify Admin.

Shopify billing state is correct.

ReviewTrix plan state is correct during both PRO_DOWNGRADE_SCHEDULED and final FREE states.

Feature limits match the plan.

Existing reviews/data are preserved.

Duplicate billing actions are prevented.

Shopify API errors are handled.

User cancellation/rejection is handled.

Trial behavior is preserved.

Test billing mode still works.

"Refresh billing status" is removed from the primary plan-management UX.

No instruction says to downgrade/cancel in Shopify Admin.

Billing page clearly shows the current plan.

Full Free → Pro → Free round trip works.

Shopify MCP verification is performed if available.

No unnecessary architectural complexity was introduced.

26. Final Report Required From Cursor

After implementation, provide a concise technical report containing:

Root cause

Why Shopify could not downgrade Pro → Free.

Files changed

Exact file paths.

What changed in each.

Upgrade flow

Exact backend/frontend flow.

Downgrade flow

Exact backend/frontend flow.

Shopify mutation/API used.

State synchronization

How Shopify subscription state maps to ReviewTrix plan state.

Database

Any schema/migration changes.

UI

What was removed.

What was added.

Edge cases

What is handled.

Testing

Tests run.

Results.

Shopify verification

What was verified through Shopify MCP/API.

What could not be verified.

Remaining risks

Any issue that could still cause Shopify App Store review failure.

Do not report "implemented successfully" without explaining the actual billing flow and verification performed.

27. Critical Downgrade Principle

For a paid Pro → Free downgrade, do not treat the merchant's click as an immediate loss of entitlement.

The preferred lifecycle is:

PRO_ACTIVE
    ↓
Merchant requests downgrade
    ↓
PRO_DOWNGRADE_SCHEDULED
    ↓
Pro remains available until the current paid period ends
    ↓
Shopify Pro subscription ends
    ↓
FREE

The effective downgrade date must come from the authoritative Shopify billing/subscription state wherever possible.

Do not rely solely on a frontend timer or a locally calculated date.

If the existing billing architecture does not support deferred cancellation in the exact way required, inspect the current Shopify billing mechanism and implement the closest Shopify-supported approach before changing the local entitlement behavior.

Core Principle

The goal is NOT simply:

Add a "Downgrade" button.

The goal is:

Merchant clicks Downgrade
        ↓
ReviewTrix performs a real Shopify billing operation
        ↓
Shopify schedules/accepts the cancellation
        ↓
ReviewTrix verifies the resulting Shopify state
        ↓
ReviewTrix shows "Downgrade scheduled"
        ↓
Pro entitlement remains active until the effective date
        ↓
Billing period ends
        ↓
ReviewTrix verifies Shopify Pro is inactive
        ↓
ReviewTrix synchronizes its plan to Free
        ↓
Free feature limits become active

This gives the merchant a genuine in-app plan-change experience while preserving already-paid Pro access and ensuring Shopify remains the billing authority.

28. Plan-Specific Actions and No Higher Plan

ReviewTrix currently has only two pricing plans:

Free — $0

Pro — $19/month

There is no plan above Pro. Therefore, plan-change actions must be determined by the merchant's actual current billing state.

Frontend action rules

Upgrade must be shown only when the merchant is on Free.

Current plan = FREE
→ Show: [ Upgrade to Pro ]

Downgrade must be shown only when the merchant is on Pro.

Current plan = PRO_ACTIVE
→ Show: [ Downgrade to Free ]

A Pro merchant must NOT see an Upgrade button because there is no higher plan to upgrade to.

Scheduled downgrade

When a Pro merchant has scheduled a downgrade:

Current entitlement = Pro
Billing state = PRO_DOWNGRADE_SCHEDULED

→ Show: [ Current plan ]
→ Show: Downgrade scheduled
→ Show: Pro access until <effective date>
→ Show: [ Keep Pro plan ] where supported by the billing architecture

Do not show Upgrade to Pro while the merchant still has Pro entitlement.

After the scheduled downgrade takes effect and Shopify confirms that the Pro subscription is inactive:

Current plan = FREE
→ Show: [ Upgrade to Pro ]

Backend enforcement

The frontend rules are for UX only. The backend must independently enforce the same plan-state rules using the authoritative Shopify subscription state.

In particular:

A Pro merchant must never be able to create a second/duplicate Pro subscription by calling the upgrade endpoint directly.

If an upgrade request is received while an active Pro subscription already exists, the backend must not call appSubscriptionCreate to create another Pro subscription.

The backend should return the merchant's correct current-plan/billing state instead of creating duplicate billing.

Repeated upgrade requests must be idempotent/safe.

The backend must not trust a client-supplied plan value to determine whether an upgrade is allowed.

The backend must determine the actual current plan from the authenticated merchant/shop and Shopify subscription state.

Likewise, a downgrade request should only be accepted when the merchant actually has an eligible active Pro subscription, and an already-scheduled downgrade must not result in another duplicate cancellation operation.

Required state/action matrix

Actual billing state

Current entitlement

Allowed primary action

UI action

FREE

Free

Upgrade

Upgrade to Pro

PRO_ACTIVE

Pro

Downgrade

Downgrade to Free

PRO_DOWNGRADE_SCHEDULED

Pro

Keep/restore Pro where supported

Keep Pro plan + scheduled status

Pro subscription inactive after effective date

Free

Upgrade

Upgrade to Pro

The implementation must never expose an action that does not make sense for the merchant's current plan. This is especially important because ReviewTrix has no plan above the $19 Pro plan.

Additional test requirement

Test explicitly that a merchant already on Pro:

Does not see an Upgrade to Pro action.

Cannot create a duplicate Pro subscription by manually invoking the upgrade API.

Remains on the existing Pro subscription after repeated upgrade attempts.

Sees Downgrade to Free while Pro is active.

Sees the scheduled-downgrade state when a downgrade has been accepted.

Sees Upgrade to Pro again only after the Pro subscription has actually ended and the merchant is Free.

This rule applies independently of frontend visibility: UI restrictions must never be the only protection against duplicate billing.