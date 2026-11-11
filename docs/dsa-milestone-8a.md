# Milestone 8A: Data-structure evidence

PostgreSQL remains the persistent source of truth. `DsaRepository` reads a role-protected snapshot, and `DsaService` rebuilds short-lived custom structures for analysis and visualization. Refreshing or restarting the server loses no library data because these structures are not a second database.

## Feature mapping

| Structure | Library feature | Why it fits |
| --- | --- | --- |
| `SinglyLinkedList<T>` | Chronological borrowing-history traversal | A loan node naturally points to the next event. Tail tracking keeps append constant-time while full history traversal remains linear. |
| `FifoQueue<T>` | Per-title reservation waitlist | The first student to reserve must be the first offered a returned copy. Queue operations express that rule directly. |
| `LifoStack<T>` | Newest-first catalog-change review | The most recently changed catalog record is reviewed first, matching last-in, first-out behavior. |
| `StringHashSet` | ISBN and barcode import validation | Average constant-time membership checks efficiently reject normalized duplicates before database insertion. PostgreSQL unique constraints remain the final authority. |

## Complexity

| Structure and operation | Time | Extra space |
| --- | --- | --- |
| Linked-list append | `O(1)` | `O(1)` |
| Linked-list find/traverse | `O(n)` | `O(1)` excluding output |
| Queue enqueue/dequeue/peek | `O(1)` amortized | `O(1)` per inserted value |
| Stack push/pop/peek | `O(1)` | `O(1)` per inserted value |
| HashSet add/has/delete | `O(1)` average, `O(n)` worst | `O(n)` total |
| HashSet audit of `n` identifiers | `O(n)` average | `O(n)` |

The HashSet uses FNV-1a-style string hashing and separate chaining. It reports bucket usage, load factor, and collisions so the implementation can be defended rather than treated as a wrapper around JavaScript `Set`.

## Safety and authorization

- `GET /api/dsa/overview` is limited to `admin` and `librarian` roles.
- `POST /api/dsa/validate-identifiers` is staff-only and accepts at most 500 ISBNs and 500 barcodes.
- Demonstration endpoints perform no inserts, updates, or deletes.
- The visualization clearly labels the snapshot as read-only.
- Trees and graphs are intentionally deferred to Milestone 8B.

## Tests

Algorithm tests cover empty states, head/tail invariants, FIFO and LIFO ordering, queue compaction, normalized duplicate detection, collision statistics, real-feature mapping, malformed payloads, and staff-only API authorization.
