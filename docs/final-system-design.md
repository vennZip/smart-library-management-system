# Final system design

This is the submission architecture for the Smart Library Borrowing and Management System. It describes the implemented system at Milestone 10; it is not a future-state proposal.

## Deployment architecture

```mermaid
flowchart LR
  U[Student / Librarian / Admin] --> V[Vercel React SPA]
  V -->|Supabase email and password| A[Supabase Auth]
  V -->|Bearer access token| R[Render Express API]
  R --> M[Security, auth, role, validation middleware]
  M --> S[Application services]
  S --> D[OOP domain and policy objects]
  S --> P[Repository interfaces]
  P -->|User JWT, RLS remains active| PG[(Supabase PostgreSQL)]
  PG --> L[(Append-only audit logs)]
  P --> X[Read-only DSA projections]
```

The browser has publishable credentials only. Express verifies Supabase identities and never trusts a role supplied by the browser. Each repository creates a Supabase client with the caller's JWT, so PostgreSQL RLS is still the final authorization boundary.

## Request flow

```mermaid
sequenceDiagram
  actor User
  participant React
  participant Express
  participant Service
  participant Supabase
  User->>React: Submit an authorized workflow
  React->>Express: JSON plus Bearer token
  Express->>Express: Rate limit, authenticate, authorize, validate
  Express->>Service: Typed use-case input
  Service->>Service: Apply domain policy
  Service->>Supabase: Repository query or atomic RPC
  Supabase->>Supabase: RLS, constraints, locks, transaction
  Supabase-->>Service: Persisted result
  Service-->>Express: Domain result
  Express-->>React: JSON plus request ID
  Express-->>Supabase: Append successful staff audit event
```

## Entity relationship diagram

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : owns
  PROFILES ||--o{ LOANS : borrows
  PROFILES ||--o{ RESERVATIONS : places
  PROFILES ||--o{ FINE_TRANSACTIONS : records
  PROFILES ||--o{ AUDIT_LOGS : performs
  BOOKS ||--o{ BOOK_COPIES : has
  BOOKS ||--o{ RESERVATIONS : requested_for
  BOOK_COPIES ||--o{ LOANS : circulated_as
  BOOK_COPIES o|--o{ RESERVATIONS : assigned_to
  LOANS ||--o| FINES : may_assess
  FINES ||--o{ FINE_TRANSACTIONS : ledger_entries
  PROFILES {
    uuid id PK
    text role
    text display_name
    text email
    text status
  }
  BOOKS {
    uuid id PK
    text isbn UK
    text title
    text author
    timestamptz archived_at
  }
  BOOK_COPIES {
    uuid id PK
    uuid book_id FK
    text barcode UK
    text shelf_location
    copy_status status
  }
  LOANS {
    uuid id PK
    uuid copy_id FK
    uuid member_id FK
    timestamptz due_at
    loan_status status
  }
  RESERVATIONS {
    uuid id PK
    uuid book_id FK
    uuid member_id FK
    uuid assigned_copy_id FK
    reservation_status status
  }
  FINES {
    uuid id PK
    uuid loan_id FK
    uuid member_id FK
    integer balance_cents
    fine_status status
  }
  FINE_TRANSACTIONS {
    uuid id PK
    uuid fine_id FK
    integer amount_cents
    text type
  }
  AUDIT_LOGS {
    uuid id PK
    uuid actor_id FK
    uuid request_id
    text action
    timestamptz created_at
  }
```

## OOP evidence map

```mermaid
classDiagram
  class LibraryItem {<<abstract>> +canBorrow() +loanPeriodDays()}
  class Book
  class ReferenceBook
  LibraryItem <|-- Book
  LibraryItem <|-- ReferenceBook
  class BorrowingPolicy {<<interface>> +evaluate() +dueDate()}
  class StudentBorrowingPolicy
  class StaffBorrowingPolicy
  BorrowingPolicy <|.. StudentBorrowingPolicy
  BorrowingPolicy <|.. StaffBorrowingPolicy
  class FinePolicy {<<interface>> +assess()}
  class StandardOverdueFinePolicy
  FinePolicy <|.. StandardOverdueFinePolicy
  class BorrowingService
  class CirculationService
  BorrowingService --> BorrowingPolicy
  CirculationService --> BorrowingService
  CirculationService --> FinePolicy
```

- Encapsulation: private state in `Member`, `Loan`, and `LibraryItem` changes through validated public methods.
- Abstraction: repository, borrowing-policy, and fine-policy interfaces separate stable contracts from implementations.
- Inheritance: `Book` and `ReferenceBook` are genuine specializations of `LibraryItem`.
- Polymorphism: `BorrowingService` and circulation code invoke policy contracts while subtype behavior determines eligibility and dates.

## DSA evidence map

```mermaid
flowchart TD
  Snapshot[Read-only PostgreSQL snapshot] --> LL[Singly linked list: loan history]
  Snapshot --> Q[FIFO queues: reservation order]
  Snapshot --> ST[LIFO stack: newest catalog review]
  Snapshot --> HS[HashSet: identifier uniqueness]
  Snapshot --> BST[BST: normalized title index]
  Snapshot --> G[Adjacency graph: related books]
  Snapshot --> AR[Arrays: filter, merge sort, rank]
  LL --> Lab[Staff DSA evidence lab]
  Q --> Lab
  ST --> Lab
  HS --> Lab
  BST --> Lab
  G --> Lab
  AR --> Lab
```

PostgreSQL remains authoritative. The structures are rebuilt for education and visualization; production catalog reads continue through indexed database queries. Complexity details and algorithm tests are in `academic-evidence.md`, `dsa-milestone-8a.md`, and `dsa-milestone-8b.md`.
