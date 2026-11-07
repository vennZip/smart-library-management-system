# Development Guide

## Scope and boundaries

- This is one application assessed for both OOP and DSA. Every academic concept must power a meaningful library feature and be testable.
- Keep domain and business logic in `server/src/services` or future `server/src/domain` modules. Routes translate HTTP; React renders UI.
- Keep Supabase access behind backend repositories/services once database work begins. Client-side Supabase usage is limited to safe browser concerns such as Auth with publishable credentials.
- Do not add a database schema, migrations, or complete workflows until their requirements are explicitly designed.

## OOP evidence

- Encapsulation: private domain state changed through validated methods.
- Abstraction: interfaces/abstract classes describe stable contracts.
- Inheritance: use only where library entities have a genuine is-a relationship.
- Polymorphism: shared operations invoke subtype-specific behavior without condition-heavy callers.

Document the class relationship and test behavior through public APIs. Avoid decorative classes that only wrap data.

## DSA evidence

Implement and test arrays, linked lists, HashSets, stacks, queues, trees, and graphs. For every structure, document its feature, algorithm, time/space complexity, and why it is suitable. Prefer custom educational implementations where assessment requires demonstrating the structure; do not claim a database query alone as DSA evidence.

## Quality rules

- Use strict TypeScript and avoid `any`.
- Add tests with each service, algorithm, or defect fix.
- Maintain accessible semantics, keyboard support, visible focus, and responsive layouts from 320px upward.
- Never commit `.env` files or service-role credentials. Update `.env.example` when variables change.
- Before handoff run `npm run check` from the repository root.
