# Architecture

## Philosophy

The application follows Clean Architecture principles.

Business logic should never depend on UI.

UI depends on business logic.

Business logic depends on repositories.

Repositories depend on Prisma.

Prisma depends on PostgreSQL.

---

# High Level Architecture

Shopify Store

↓

Theme Extension

↓

Review API

↓

Service Layer

↓

Repository Layer

↓

Prisma

↓

PostgreSQL

---

Merchant Dashboard

↓

Remix Routes

↓

Services

↓

Repositories

↓

Database

---

# Main Modules

Authentication

Review Management

Widget Management

Analytics

Emails

Settings

Webhooks

Shop Management

Billing

---

# Folder Structure

app/

components/

features/

repositories/

services/

hooks/

types/

routes/

extensions/

prisma/

docs/

---

# Layer Responsibilities

Routes

↓

Receive requests

↓

Call Services

↓

Return Response

Services

↓

Business Rules

↓

Validation

↓

Workflow

Repositories

↓

Database Access

↓

Prisma Queries

Components

↓

UI Only

---

# Theme Extension

Storefront UI

↓

Call Review API

↓

Render Reviews

No business logic inside extension.

---

# Data Ownership

Shopify

Products

Customers

Orders

Variants

Application

Reviews

Replies

Widget Settings

Analytics

Review Requests

Media

---

# Scalability Goals

1000+ Stores

10M+ Reviews

Horizontal scaling

Background jobs

Caching

Pagination

Indexes