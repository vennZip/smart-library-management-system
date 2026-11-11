# Milestone 8B: Trees, graphs, and array algorithms

Milestone 8B completes the assessed DSA set without replacing production queries. `DsaRepository` reads a staff-authorized PostgreSQL snapshot, `DsaAdvancedAnalyzer` builds temporary indexes, and the structures disappear after the response.

## Binary search tree

`BinarySearchTree<T>` indexes normalized catalog titles. Each node stores one key and a bucket of values, so books with identical normalized titles remain accessible instead of being overwritten.

| Operation | Average time | Worst time | Extra space |
| --- | --- | --- | --- |
| Insert | `O(log n)` | `O(n)` | `O(1)` |
| Exact search | `O(log n)` | `O(n)` | `O(1)` |
| In-order traversal | `O(n)` | `O(n)` | `O(h)` |
| Height calculation | `O(n)` | `O(n)` | `O(n)` queue |

The tree is intentionally unbalanced so the demonstration can explain both expected and worst-case behavior. It reports height, unique keys, build comparisons, build time, node relationships, and exact-search comparisons.

## Adjacency-list graph

`AdjacencyListGraph<T>` creates one vertex per active book. Undirected weighted edges use meaningful library relationships:

- same author: weight `3`;
- same category: weight `2`;
- each shared borrower: weight `1`.

Breadth-first search uses the custom FIFO queue and explores nearby recommendations by level. Depth-first search uses the custom LIFO stack and explores relationship paths. Both use the custom HashSet for visited vertices.

| Operation | Time | Extra space |
| --- | --- | --- |
| Add vertex or edge | `O(1)` average | `O(1)` |
| Read neighbors | `O(degree(v))` | `O(degree(v))` output |
| BFS | `O(V + E)` | `O(V)` |
| DFS | `O(V + E)` | `O(V)` |

Direct recommendations are ranked by combined edge weight. Traversal responses include order, distance, visited-node count, reasons, weights, and elapsed time.

## Explicit array algorithms

The implementation does not use `Array.prototype.sort()` as assessed evidence.

- `filterArray` performs a manual linear scan over title, author, and category criteria.
- `mergeSort` is stable, non-mutating, and counts element comparisons.
- `rankArray` explicitly scores books using historical loan counts and uses the custom merge sort for descending ranking with deterministic title ties.

| Algorithm | Time | Extra space |
| --- | --- | --- |
| Filter | `O(n)` | `O(n)` output |
| Merge sort | `O(n log n)` | `O(n)` |
| Score and rank | `O(n log n)` | `O(n)` |

Metrics include input size, output size, comparisons, and elapsed milliseconds. Timing is explanatory rather than a formal benchmark because runtime conditions vary.

## Protected demonstration APIs

- `GET /api/dsa/overview` includes tree, graph, and default array experiments.
- `POST /api/dsa/tree-search` runs an exact normalized-title search.
- `POST /api/dsa/graph-traverse` runs BFS or DFS to depth 1–4.
- `POST /api/dsa/catalog-algorithms` runs filtering, stable merge sort, and ranking.

All endpoints require `admin` or `librarian`. They read through RLS-aware repositories and perform no database mutations.

## Test evidence

Tests cover duplicate tree keys, missing searches, in-order traversal, height, disconnected graph vertices, combined edge weights, BFS/DFS depth limits, invalid edges, stable merge sorting, non-mutation, deterministic ranking, service integration, malformed requests, performance counters, and student authorization denial.
