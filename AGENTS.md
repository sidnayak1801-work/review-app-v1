# AGENTS.md

# AI Development Guide

Welcome to the Review App project.

This application is being built as a production-grade Shopify review platform with the long-term goal of becoming a competitive alternative to Judge.me.

Every implementation should prioritize maintainability, scalability, readability, and developer experience over writing code quickly.

---

# Before Every Task

Before making any changes:

1. Read `docs/01_PROJECT.md`
2. Read `docs/02_ARCHITECTURE.md`
3. Read `docs/04_ROADMAP.md`
4. Read any feature documentation related to the task.
5. Follow every rule inside `.cursor/rules/`.

Never skip these steps.

---

# Development Philosophy

Always think like a senior software engineer.

Do not simply make the code work.

Instead, build code that is:

- Maintainable
- Scalable
- Readable
- Modular
- Testable
- Reusable
- Production-ready

Every implementation should be capable of supporting thousands of Shopify stores.

---

# Project Architecture

The application follows Feature-Based Architecture.

Layers:

Routes

↓

Services

↓

Repositories

↓

Prisma

↓

Database

Business logic never belongs inside:

- Remix routes
- React components
- Theme Extensions

Routes should coordinate requests.

Services contain business rules.

Repositories communicate with Prisma.

Components display UI only.

---

# Scope Management

Implement **only** the requested feature.

Never:

- build future roadmap items
- add unrelated improvements
- introduce speculative features
- refactor unrelated code

If something important is missing, explain it first before implementing.

---

# Documentation First

Documentation is the source of truth.

If implementation differs from documentation:

Documentation wins.

Ask for clarification instead of guessing.

If implementation introduces a new architectural decision:

Update documentation.

---

# Code Quality

Every generated code should:

- use TypeScript
- use strict typing
- avoid `any`
- avoid duplicated logic
- use meaningful names
- keep functions focused
- use early returns
- avoid deeply nested conditions

Prefer readability over cleverness.

---

# Shopify Principles

This is a Shopify Embedded App.

Always use:

- Shopify GraphQL Admin API
- Polaris
- App Bridge
- Theme App Extensions
- Remix conventions

Do not duplicate Shopify resources unless necessary.

Shopify remains the source of truth for:

- Products
- Orders
- Customers
- Variants

Application owns:

- Reviews
- Replies
- Widget Settings
- Analytics
- Review Requests

---

# Database Rules

Database access belongs only inside repositories.

Services should never execute Prisma queries directly.

Routes should never execute Prisma queries.

Design every query for scalability.

Always consider:

- pagination
- indexing
- N+1 query problems

---

# UI Principles

UI should be simple.

Reusable.

Accessible.

Responsive.

Use Polaris whenever possible.

Avoid custom components if Polaris already solves the problem.

---

# Error Handling

Never silently ignore errors.

Return meaningful errors.

Validate every input.

Handle edge cases.

---

# Security

Never trust user input.

Validate all requests.

Protect authenticated routes.

Escape unsafe data.

Avoid exposing internal implementation details.

---

# Performance

Minimize Shopify API requests.

Batch requests where possible.

Avoid unnecessary database queries.

Lazy-load heavy resources.

Optimize for large datasets.

---

# Git Workflow

Work in small iterations.

One feature.

↓

Review.

↓

Commit.

↓

Next feature.

Avoid large unreviewed changes.

---

# Roadmap

Only implement the current roadmap phase.

Never begin a future phase unless explicitly requested.

If multiple phases overlap:

Complete the current phase first.

---

# Documentation Updates

Whenever a feature is completed:

Update:

- docs/04_ROADMAP.md
- docs/07_CHANGELOG.md
- docs/TODO.md

If architecture changes:

Update:

- docs/02_ARCHITECTURE.md

If database changes:

Update:

- docs/03_DATABASE.md

---

# AI Behavior

When requirements are unclear:

DO NOT GUESS.

Instead:

- explain the ambiguity
- propose possible solutions
- wait for confirmation

Never invent business requirements.

---

# Decision Making

When multiple solutions exist:

Choose the solution that is:

- simpler
- easier to maintain
- scalable
- consistent with existing architecture

Explain trade-offs when appropriate.

---

# Long-Term Vision

This project is not a tutorial.

It is intended to become a production SaaS application.

Every decision should move the project closer to:

- excellent developer experience
- excellent merchant experience
- scalability
- maintainability
- clean architecture

Think beyond making the feature work.

Think about how the application will look after three years of development.


# Collaboration Rules

Before writing code:

- Explain the implementation plan in 3–7 concise steps.
- Identify any architectural implications.
- Mention any documentation that should be updated.
- If there are multiple valid approaches, recommend one and briefly explain why.

After writing code:

- Summarize what was implemented.
- List any follow-up work.
- Suggest tests to run.
- Suggest a meaningful Git commit message.