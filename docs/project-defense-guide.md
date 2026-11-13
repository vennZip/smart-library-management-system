# Project defense guide

## Two-minute project explanation

The Smart Library Borrowing and Management System is one full-stack application assessed for both OOP and DSA. React provides role-aware interfaces, Express owns application services and authorization, and Supabase provides Auth, PostgreSQL, constraints, transactions, and RLS. OOP policies drive real borrowing and fine decisions. Custom data structures rebuild read-only snapshots for meaningful library demonstrations without replacing PostgreSQL. Atomic database functions protect multi-record circulation workflows against partial updates and concurrency.

## Likely questions and concise answers

### Why is business logic not in React?

React is an untrusted presentation client. Putting policy in backend services makes the same rules apply to every client and allows unit testing without rendering UI. Critical invariants are repeated in atomic PostgreSQL functions because concurrent requests can invalidate an earlier application check.

### How do you prove encapsulation?

Domain state is private and can change only through validated methods. Tests call public behavior and verify invariants; they do not modify fields directly.

### Where are inheritance and polymorphism genuinely used?

`Book` and `ReferenceBook` specialize the abstract `LibraryItem`. Borrowing services call a shared item/policy contract, and the concrete subtype determines whether or how long an item can circulate. Student and staff borrowing policies also implement the same contract with different behavior.

### Why use policy abstractions?

Borrowing periods and overdue calculations change independently of HTTP and persistence. A policy contract makes those rules replaceable and directly testable while keeping callers free of large role-based conditionals.

### Why custom DSA implementations when JavaScript already has arrays and Set?

The assessment requires visible implementations. The custom structures expose nodes, buckets, collisions, traversal order, comparisons, and complexity. Built-ins would hide the mechanisms. PostgreSQL constraints remain the production authority.

### Why does the BST not replace the catalog database query?

The tree is an educational in-memory projection. It is not durable, distributed, or balanced. PostgreSQL indexes and queries are the correct production mechanism, while the BST demonstrates insertion/search behavior and worst-case degradation.

### How are graph recommendations produced?

Books are vertices in an adjacency-list graph. Shared borrowing or catalog relationships form weighted edges. BFS explores by distance; DFS demonstrates depth-first exploration. Both run in `O(V + E)` time for the visited graph.

### How is FIFO guaranteed for reservations?

The educational queue visualizes FIFO ordering. The production transaction orders eligible reservation rows by creation time and ID while locking the relevant records. The database—not browser order—decides assignment.

### What makes checkout and return atomic?

PostgreSQL functions execute copy, loan, fine, and reservation changes in one transaction. Row locks prevent two requests from issuing the same copy. An exception rolls back the entire operation.

### What is the difference between frontend guards, API roles, and RLS?

Frontend guards hide inaccessible UI but are not security. Express verifies tokens and rejects disallowed roles. RLS independently restricts database rows using the authenticated identity. Security does not depend on the browser behaving honestly.

### Why are roles in app metadata?

Users can edit ordinary user metadata, so it must not authorize privileged actions. Server-controlled `app_metadata.role` is placed in the signed JWT and used by Express and RLS.

### How are fines represented safely?

Money uses integer centavos, avoiding floating-point errors. The fine is a balance with append-only payment/adjustment entries. Atomic functions lock the fine and prevent negative balances or overpayment.

### What does the audit log capture?

It records the actor, role, action, entity, request ID, method, path, status, and timestamp for successful staff mutations. It excludes passwords, tokens, and request bodies. Authenticated clients cannot update or delete it.

### How do you handle errors and trace incidents?

APIs use a stable error envelope containing a machine code, safe message, and request ID. Structured Render logs use the same ID with path, status, and duration, allowing a user-visible failure to be correlated without logging credentials.

### How did you test the system?

There are domain and algorithm unit tests, service tests with repository doubles, HTTP integration/end-to-end tests on an ephemeral server, strict TypeScript builds, ESLint, and a read-only deployed smoke runner. `npm run check` is the local release gate.

### What are the current limitations?

The rate limiter is per Render instance rather than a shared Redis store, the educational BST is deliberately unbalanced, and live email/SMS notifications are outside the project scope. These limits are documented and do not weaken the assessed workflows.

## Demonstration advice

- State the invariant before clicking: “one copy cannot have two active loans.”
- After the click, show both UI behavior and the database/audit evidence.
- Do not claim frontend checks provide security.
- Distinguish custom educational DSA structures from PostgreSQL production indexing.
- If asked about complexity, name the input variable before giving Big-O.
