import { FifoQueue } from './fifo-queue.js'
import { LifoStack } from './lifo-stack.js'
import { StringHashSet } from './string-hash-set.js'
export interface GraphEdge {to:string;weight:number;reasons:string[]}
export interface GraphTraversal {order:string[];distances:Record<string,number>;visitedNodes:number}
interface Vertex<T>{value:T;edges:Map<string,GraphEdge>}

export class AdjacencyListGraph<T>{
  readonly #vertices=new Map<string,Vertex<T>>()
  get size(){return this.#vertices.size}
  addVertex(id:string,value:T){if(this.#vertices.has(id))return false;this.#vertices.set(id,{value,edges:new Map()});return true}
  hasVertex(id:string){return this.#vertices.has(id)}
  value(id:string){return this.#vertices.get(id)?.value}
  addUndirectedEdge(from:string,to:string,weight:number,reason:string){if(from===to)throw new Error('Self edges are not supported');if(!Number.isFinite(weight)||weight<=0)throw new Error('Edge weight must be positive');const first=this.#vertices.get(from);const second=this.#vertices.get(to);if(!first||!second)throw new Error('Both vertices must exist');this.#mergeEdge(first.edges,to,weight,reason);this.#mergeEdge(second.edges,from,weight,reason)}
  neighbors(id:string){return[...(this.#vertices.get(id)?.edges.values()??[])].map(edge=>({...edge,reasons:[...edge.reasons]}))}
  vertices(){return[...this.#vertices.entries()].map(([id,vertex])=>({id,value:vertex.value,degree:vertex.edges.size}))}
  edges(){const result:Array<{from:string;to:string;weight:number;reasons:string[]}>=[];for(const[from,vertex]of this.#vertices)for(const edge of vertex.edges.values())if(from<edge.to)result.push({from,to:edge.to,weight:edge.weight,reasons:[...edge.reasons]});return result}
  bfs(start:string,maxDepth=2):GraphTraversal{if(!this.#vertices.has(start))return{order:[],distances:{},visitedNodes:0};const queue=new FifoQueue<{id:string;depth:number}>();const visited=new StringHashSet(Math.max(31,this.size*2+1));const order:string[]=[];const distances:Record<string,number>={};queue.enqueue({id:start,depth:0});visited.add(start);while(!queue.isEmpty){const current=queue.dequeue();if(!current)break;order.push(current.id);distances[current.id]=current.depth;if(current.depth>=maxDepth)continue;for(const edge of this.#sortedNeighbors(current.id))if(visited.add(edge.to))queue.enqueue({id:edge.to,depth:current.depth+1})}return{order,distances,visitedNodes:order.length}}
  dfs(start:string,maxDepth=2):GraphTraversal{if(!this.#vertices.has(start))return{order:[],distances:{},visitedNodes:0};const stack=new LifoStack<{id:string;depth:number}>();const visited=new StringHashSet(Math.max(31,this.size*2+1));const order:string[]=[];const distances:Record<string,number>={};stack.push({id:start,depth:0});while(!stack.isEmpty){const current=stack.pop();if(!current||!visited.add(current.id))continue;order.push(current.id);distances[current.id]=current.depth;if(current.depth>=maxDepth)continue;const neighbors=this.#sortedNeighbors(current.id);for(let index=neighbors.length-1;index>=0;index-=1){const edge=neighbors[index];if(edge&&!visited.has(edge.to))stack.push({id:edge.to,depth:current.depth+1})}}return{order,distances,visitedNodes:order.length}}
  #sortedNeighbors(id:string){const edges=this.neighbors(id);for(let i=1;i<edges.length;i+=1){const candidate=edges[i];if(!candidate)continue;let j=i-1;while(j>=0){const previous=edges[j];if(!previous||previous.weight>candidate.weight||previous.weight===candidate.weight&&previous.to<=candidate.to)break;edges[j+1]=previous;j-=1}edges[j+1]=candidate}return edges}
  #mergeEdge(edges:Map<string,GraphEdge>,to:string,weight:number,reason:string){const existing=edges.get(to);if(existing){existing.weight+=weight;if(!existing.reasons.includes(reason))existing.reasons.push(reason)}else edges.set(to,{to,weight,reasons:[reason]})}
}
