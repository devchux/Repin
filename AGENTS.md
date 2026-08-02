# AGENTS.md

# Repin AI Engineering Guide

> This document defines the engineering standards, architecture principles, and development philosophy for Repin AI. Every contribution to this repository should align with these guidelines.
>
> Any agent working in this repository should operate as a member of a team of senior software engineers, AI engineers, browser engineers, and product engineers building a production-grade AI platform.

---

# Project Vision

Repin AI is an AI-powered browser assistant designed to help users perform tasks directly within their browser.

Current capabilities include:

- Explaining selected text
- Translating languages
- Summarizing articles
- Bookmarking pages
- Taking contextual notes
- Highlighting important content
- Providing contextual AI assistance while browsing

The long-term vision is far more ambitious.

Repin AI should gradually evolve into a fully autonomous browser agent capable of understanding user intent, interacting with webpages, navigating workflows, automating repetitive browser tasks, and acting as an intelligent digital companion.

Every architectural decision should move the platform closer to this vision.

## Browser Agent Harness

Repin AI's primary long-term architecture is a provider-neutral browser agent
harness, not a collection of isolated AI endpoints.

The harness should eventually coordinate:

- planning and multi-step execution
- browser observations and page state
- typed browser tools and tool results
- permission checks and human approval boundaries
- resumable runs, cancellation, retries, and recovery
- short-term working context and durable user memory
- execution tracing, model usage, evaluations, and replay

AI provider adapters are model I/O boundaries only. They must not own browser
automation, execute tools, contain product workflows, or become the location of
agent-loop state. The agent harness should consume normalized provider
capabilities and remain portable across model vendors.

New AI and browser features should be expressed as composable capabilities,
tools, policies, observations, or run-state transitions that the harness can
orchestrate. Avoid designs that require rebuilding a feature before an
autonomous agent can invoke it.

---

# Engineering Philosophy

When making engineering decisions, prioritize:

1. Maintainability over cleverness.
2. Simplicity over unnecessary abstraction.
3. Extensibility over short-term convenience.
4. Strong typing over implicit behavior.
5. Composition over inheritance.
6. Reuse before creating new implementations.
7. Product thinking over feature implementation.
8. Long-term architecture over quick fixes.

Every feature should be designed with future AI agent capabilities in mind.

---

# Repository Structure

```
apps/
    server/        # NestJS backend
    extension/     # Browser Extension (React + WXT)
    web/           # Next.js application
    docs/          # Documentation website

packages/
    ui/            # Shared UI library (shadcn + reusable components)
```

---

# Responsibilities

## apps/server

Responsible for:

- Authentication
- User management
- AI orchestration
- Browser session APIs
- Bookmarks
- Notes
- Highlights
- AI conversations
- Tool execution
- Background jobs
- Queue processing

Technology

- NestJS
- PostgreSQL
- TypeORM
- Redis
- BullMQ

---

## apps/extension

Responsible for:

- Content scripts
- Browser interactions
- Context menus
- Text selection
- Sidebar
- Popup
- Background service worker
- Browser messaging
- Browser APIs

Technology

- React
- WXT

The extension should remain lightweight.

Heavy processing belongs on the backend whenever practical.

---

## apps/web

Responsible for:

- Marketing website
- User dashboard
- Account settings
- Billing
- Authentication
- AI history
- User management

Technology

- Next.js

---

## apps/docs

Responsible for:

- Product documentation
- API documentation
- User guides
- Developer documentation

---

## packages/ui

Contains all reusable frontend components.

This package should include:

- shadcn components
- Design primitives
- Shared layouts
- Icons
- Typography
- Utility components

No frontend application should duplicate UI components that belong here.

---

# AI Engineering Principles

Repin AI is an AI-first product.

Every AI feature should be designed as a reusable capability rather than a one-off implementation.

## AI Providers

AI providers should always be abstracted.

Never tightly couple business logic to:

- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Groq
- Ollama

The application should support swapping providers with minimal effort.

---

## Prompt Engineering

Prompt templates should be:

- reusable
- versioned
- composable
- testable

Avoid embedding prompts directly inside services whenever possible.

---

## Structured Outputs

Whenever supported by the model:

Prefer structured JSON outputs instead of parsing natural language.

Avoid brittle regex parsing.

---

## Tool Calling

Browser capabilities should be represented as tools.

Examples include:

- summarize_page
- explain_selection
- translate_selection
- bookmark_page
- save_note
- highlight_text
- search_history

Future browser actions should simply become additional tools.

---

## AI Context

Always minimize unnecessary context.

Only send information required for the current task.

Reduce latency and token usage whenever possible.

---

## AI Evaluations

Every major AI capability should eventually support evaluation datasets.

Prompt quality should be measurable.

---

# Browser Extension Principles

The extension is the user's primary interface.

Keep it fast.

Keep it responsive.

Keep it secure.

## Content Scripts

Content scripts should:

- interact with the DOM
- extract information
- send typed messages

Avoid putting business logic inside content scripts.

---

## Background Service

The background service should coordinate:

- messaging
- authentication
- browser APIs
- long-running tasks

---

## Messaging

All extension messaging should be strongly typed.

Avoid stringly typed events.

---

## Permissions

Follow least privilege.

Never request unnecessary browser permissions.

---

## Performance

Avoid expensive DOM observers.

Debounce expensive operations.

Lazy-load heavy modules.

Minimize bundle size.

---

# Backend Architecture

Backend architecture should follow standard NestJS principles.

Controllers

- Validate requests
- Handle routing
- Never contain business logic

Services

- Business logic only

Repositories

- Database operations only

Modules

- Feature boundaries

Guards

- Authentication
- Authorization

Interceptors

- Logging
- Metrics
- Serialization

Filters

- Error handling

---

# Database Principles

Technology

- PostgreSQL
- TypeORM

Rules

- Use migrations.
- Never modify production schemas manually.
- Prefer explicit relations.
- Avoid N+1 queries.
- Index frequently queried columns.
- Use transactions when consistency matters.

---

# Queue Architecture

Technology

- BullMQ
- Redis

Queues should handle:

- AI requests
- Long-running jobs
- Notifications
- Background processing
- Future browser automations

Never block HTTP requests with expensive work.

---

# API Design

APIs should be:

- RESTful
- predictable
- versionable
- well documented

Use DTOs.

Validate every request.

Never expose internal entities directly.

---

# Frontend Principles

Technology

- Next.js
- React

Keep components:

- small
- composable
- reusable

Separate:

- UI
- hooks
- business logic
- API calls

---

# UI Standards

Use shadcn as the design foundation.

Avoid creating custom components when an existing primitive already exists.

Shared UI belongs inside:

```
packages/ui
```

Accessibility is required.

Responsive design is required.

---

# TypeScript Standards

Always use strict mode.

Avoid:

```
any
```

Prefer:

- unknown
- generics
- discriminated unions

Prefer exhaustive switch statements.

Prefer readonly where appropriate.

---

# Naming Conventions

Variables

```
camelCase
```

Types

```
PascalCase
```

Enums

```
PascalCase
```

Constants

```
UPPER_SNAKE_CASE
```

Files

Use descriptive names.

Avoid abbreviations.

---

# Error Handling

Errors should be:

- explicit
- actionable
- logged

Never silently ignore failures.

Use domain-specific exceptions.

---

# Security

Never expose:

- API keys
- secrets
- access tokens

Always:

- validate inputs
- sanitize user-generated content
- escape HTML when required
- verify permissions

The browser extension should never trust webpage content.

---

# Performance Guidelines

Optimize for:

- startup time
- memory usage
- network requests
- browser responsiveness

Prefer lazy loading.

Avoid unnecessary rerenders.

Cache expensive operations.

---

# Documentation

Every major feature should include:

- architecture notes
- API documentation
- setup instructions
- limitations
- future improvements

Code should explain *how*.

Documentation should explain *why*.

---

<!-- # Testing Philosophy

Write tests where they provide meaningful confidence.

Prefer:

- unit tests
- integration tests
- end-to-end tests

AI features should eventually include evaluation tests.

--- -->

# Future Architecture

Repin AI should gradually evolve toward an autonomous browser agent.

Future capabilities may include:

- multi-step planning
- browser automation
- web navigation
- autonomous research
- task execution
- memory
- workflow orchestration
- multi-agent collaboration
- long-term user context

Avoid designing features that make this evolution difficult.

---

# Agent Behavior

Any agent contributing to this repository is expected to work to the standard of a senior engineer, regardless of its provider, model, or execution environment.

Before writing code:

- Understand the existing architecture.
- Search for reusable implementations.
- Avoid duplicate abstractions.
- Consider scalability.
- Consider maintainability.
- Consider future AI agent capabilities.

When implementing features:

- Keep functions focused.
- Write readable code.
- Favor composition.
- Preserve existing conventions.
- Minimize breaking changes.

When refactoring:

- Improve clarity.
- Reduce duplication.
- Preserve behavior.
- Explain architectural improvements.

When reviewing code:

Evaluate:

- correctness
- architecture
- maintainability
- performance
- security
- scalability
- AI engineering implications

Do not simply satisfy the prompt.

Build software that will still be understandable and extensible years from now.

---

# Definition of Done

A task is complete only when:

- Requirements are satisfied.
- Code is clean.
- Types are correct.
- Architecture remains consistent.
<!-- - Tests pass. -->
- Documentation is updated where necessary.
- No unnecessary duplication has been introduced.
- The solution aligns with Repin AI's long-term autonomous browser agent vision.

---

> **Final Principle**
>
> Every line of code should move Repin AI one step closer to becoming the most capable AI browser assistant and autonomous browser agent, while maintaining production-quality engineering standards.
