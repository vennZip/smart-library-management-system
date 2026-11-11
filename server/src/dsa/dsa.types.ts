export interface DsaLoanSource {id:string;memberId:string;bookId:string;memberName:string;bookTitle:string;barcode:string;borrowedAt:string;returnedAt:string|null;status:'active'|'returned'}
export interface DsaReservationSource {id:string;bookId:string;bookTitle:string;memberName:string;createdAt:string}
export interface DsaCatalogSource {id:string;title:string;author:string;category:string;isbn:string;updatedAt:string}
export interface DsaSnapshot {loans:DsaLoanSource[];reservations:DsaReservationSource[];catalog:DsaCatalogSource[];barcodes:string[]}
export interface Complexity {operation:string;time:string;space:string}
export interface DsaOverview {
  generatedAt:string
  persistenceNote:string
  linkedList:{feature:string;rationale:string;size:number;headId:string|null;tailId:string|null;nodes:Array<DsaLoanSource&{nextId:string|null}>;complexity:Complexity[]}
  queue:{feature:string;rationale:string;totalWaiting:number;groups:Array<{bookId:string;bookTitle:string;nextMember:string|null;members:Array<{reservationId:string;memberName:string;position:number;createdAt:string}>}>;complexity:Complexity[]}
  stack:{feature:string;rationale:string;size:number;topId:string|null;items:Array<DsaCatalogSource&{depth:number}>;complexity:Complexity[]}
  hashSet:{feature:string;rationale:string;isbn:{unique:number;duplicates:string[];statistics:{bucketCount:number;usedBuckets:number;collisions:number;loadFactor:number}};barcodes:{unique:number;duplicates:string[];statistics:{bucketCount:number;usedBuckets:number;collisions:number;loadFactor:number}};complexity:Complexity[]}
  tree:TreeOverview
  graph:GraphOverview
  arrays:ArrayOverview
}
export interface IdentifierValidation {valid:boolean;isbn:{accepted:number;duplicates:string[]};barcodes:{accepted:number;duplicates:string[]};statistics:{isbnLoadFactor:number;barcodeLoadFactor:number}}
export interface TreeOverview {feature:string;rationale:string;size:number;uniqueKeys:number;height:number;rootKey:string|null;buildComparisons:number;buildElapsedMs:number;nodes:Array<{key:string;books:DsaCatalogSource[];leftKey:string|null;rightKey:string|null;depth:number}>;inOrderTitles:string[];complexity:Complexity[]}
export interface GraphOverview {feature:string;rationale:string;nodes:Array<{id:string;title:string;category:string;degree:number}>;edgeCount:number;edges:Array<{from:string;to:string;weight:number;reasons:string[]}>;defaultStartId:string|null;bfsOrder:string[];dfsOrder:string[];visitedNodes:number;buildElapsedMs:number;complexity:Complexity[]}
export interface ArrayBookResult extends DsaCatalogSource {loanCount:number;score:number}
export interface AlgorithmMetrics {inputSize:number;outputSize:number;comparisons:number;elapsedMs:number}
export interface ArrayOverview {feature:string;rationale:string;items:ArrayBookResult[];filterMetrics:AlgorithmMetrics;sortMetrics:AlgorithmMetrics;rankMetrics:AlgorithmMetrics;complexity:Complexity[]}
export interface TreeSearchResult {query:string;matches:DsaCatalogSource[];comparisons:number;elapsedMs:number}
export interface GraphTraversalResult {mode:'bfs'|'dfs';startBook:DsaCatalogSource;order:Array<{book:DsaCatalogSource;distance:number}>;visitedNodes:number;elapsedMs:number;recommendations:Array<{book:DsaCatalogSource;weight:number;reasons:string[]}>}
export interface CatalogAlgorithmResult {items:ArrayBookResult[];filterMetrics:AlgorithmMetrics;sortMetrics:AlgorithmMetrics;rankMetrics:AlgorithmMetrics}
