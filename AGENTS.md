# AI Development Guide

## Mission

Build a useful Shopify review MVP for 50–100 merchants as quickly as quality
allows. Keep the code clean enough to evolve into a larger platform, but do not
build future scale or features before they are needed.

The default decision rule is:

> Choose the simplest correct solution that fits the active roadmap phase and
> preserves clear module boundaries.

## Before Every Task

1. Read `docs/01_PROJECT.md`.
2. Read `docs/02_ARCHITECTURE.md`.
3. Read the active phase in `docs/04_ROADMAP.md`.
4. Read the relevant feature, database, API, or billing document.
5. For review submission, customer identity, verified-buyer, or guest/logged-in
   storefront flow work, also read `docs/14_REVIEW_SUBMISSION_SPEC.md` (source of
   truth for those rules).
6. Follow all applicable rules in `.cursor/rules/`.
7. Inspect the existing implementation before proposing a change.

If documentation conflicts, pause and resolve the conflict before
implementation. If code and documentation differ, determine whether the code
is incomplete or the documentation is stale; do not blindly preserve either.

## Scope

- Build only what is requested and belongs to the active roadmap phase.
- Never implement a future-phase feature as a speculative improvement.
- Do not add unrelated refactors, dependencies, tables, endpoints, settings, or
  infrastructure.
- Finish one coherent feature slice, including tests and documentation, before
  starting another.
- Keep partial scaffolding out of the codebase unless the active slice needs it.

If a future concern is important, record it in `docs/08_IDEAS.md` or explain it
as follow-up work. Do not implement it.

## Engineering Standard

Code must be:

- Readable
- Maintainable
- Well-typed
- Secure at trust boundaries
- Tested in proportion to risk
- Consistent with the existing architecture

Production quality does not mean maximum abstraction. Avoid cleverness,
premature generalization, and infrastructure without a current requirement.

## Architecture

The application is a modular monolith:

```text
Route → Service → Repository → Prisma → PostgreSQL
```

- Routes authenticate, validate transport input, call services, and return
  responses.
- Services own business rules, tenant checks, and workflows.
- Repositories own Prisma queries.
- Components render UI and handle local presentation behavior.
- Shopify extensions remain lightweight and contain no server business logic.

Create an interface when it protects an external boundary, supports multiple
implementations, or materially improves testing. Do not create an interface,
factory, base class, or wrapper for every module by default.

Do not introduce microservices, event sourcing, Kubernetes, distributed
systems, generic plugin frameworks, or a data warehouse unless an approved
future phase and measured need require them.

## Shopify

Use:

- Shopify authentication rather than custom authentication
- GraphQL Admin API for new Shopify API work
- App Bridge and Polaris for embedded merchant UI
- Theme App Extensions for storefront UI
- Verified webhooks or app-proxy requests at public Shopify boundaries

Shopify remains the source of truth for products, variants, customers, orders,
and fulfillment. Store only the identifiers and snapshots a current workflow
requires.

The listing category is Product reviews. Treat Built for Shopify as a quality
target, not a label the app can self-assign:

- Follow the current App Store and Built for Shopify requirements.
- Use the latest supported App Bridge, Polaris patterns, and Theme App
  Extensions.
- Protect admin and storefront performance.
- Never claim the status or badge before Shopify awards it.

MVP billing uses Shopify App Pricing with the documented Free and Pro plans.
Shopify is the subscription source of truth, and plan allowances are enforced
server-side.

## Data and Tenant Safety

- Every merchant-owned operation must resolve and enforce `shopId`.
- Never trust a client-provided resource ID as authorization.
- Database access belongs in repositories.
- Add indexes for actual query patterns.
- Paginate lists that can grow.
- Use transactions only when multiple writes must succeed together.
- Add a table only when an active roadmap feature needs it.
- Never duplicate OAuth tokens outside Shopify session storage.
- Never delete merchant data because of uninstall or downgrade unless a
  documented retention/deletion workflow requires it.

## TypeScript and Validation

- Use strict TypeScript.
- Avoid `any`; narrow `unknown` at boundaries.
- Use meaningful names and focused functions.
- Prefer early returns over deep nesting.
- Validate external input before business logic.
- Do not extract shared code until reuse or a clear boundary exists.

## UI

- Prefer Polaris for merchant administration.
- Keep UI accessible, responsive, and understandable without training.
- Reuse components when the same interaction genuinely repeats.
- Do not create a design system before the product needs one.
- Keep storefront JavaScript and payloads small.

## Errors, Security, and Logging

- Never silently ignore failures.
- Return safe, actionable user errors.
- Log useful operational context without secrets or customer content.
- Verify authentication, webhook signatures, and tenant ownership.
- Rate-limit and protect public submission endpoints.
- Treat privacy and deletion requirements as launch requirements, not future
  polish.

## Performance

Start with sound queries, indexes, pagination, bounded payloads, and batched
Shopify calls. Measure before adding caches, queues, replicas, partitioning, or
service extraction.

Optimize the critical storefront path before low-value internal paths.

## Testing

Test behavior at the lowest useful level:

- Unit tests for validation and business rules
- Repository integration tests for important queries and constraints
- Route tests for authentication, validation, and response behavior
- Critical-path end-to-end tests before launch

Do not chase coverage numbers with low-value tests. Every bug fix should add a
regression test when practical.

## Documentation

Documentation is the project source of intent.

When work changes:

- Phase status or scope → update `docs/04_ROADMAP.md`
- Architecture decisions → update `docs/02_ARCHITECTURE.md`
- Schema or retention → update `docs/03_DATABASE.md`
- Public contracts → update `docs/06_API.md`
- Completed work → update `docs/07_CHANGELOG.md`
- Immediate next slice → update `docs/TODO.md`

Do not duplicate detailed plans across files. Link to the canonical document.

## Workflow and Git

Before implementation:

- State a short plan.
- Identify material architecture or data implications.
- Ask only when a missing decision would materially change the result.

During implementation:

- Keep changes focused and reviewable.
- Complete the feature vertically.
- Run checks proportional to the change.
- Do not modify unrelated files.

After implementation:

- Summarize the result and verification.
- List genuine follow-up work separately.
- Suggest a concise commit message if useful.
- Create commits or push only when explicitly requested.

## Decision Order

When valid options exist, prefer:

1. Correctness and merchant safety
2. Active-phase scope
3. Simplicity
4. Maintainability
5. Consistency with existing code
6. Measured performance
7. Future flexibility with low current cost

Do not trade current clarity for hypothetical three-year requirements.
