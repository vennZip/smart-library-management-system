class LinkedNode<T>{value:T;next:LinkedNode<T>|null=null;constructor(value:T){this.value=value}}

export class SinglyLinkedList<T>{
  #head:LinkedNode<T>|null=null
  #tail:LinkedNode<T>|null=null
  #size=0
  get size(){return this.#size}
  get first(){return this.#head?.value}
  get last(){return this.#tail?.value}
  append(value:T){const node=new LinkedNode(value);if(this.#tail)this.#tail.next=node;else this.#head=node;this.#tail=node;this.#size+=1}
  prepend(value:T){const node=new LinkedNode(value);node.next=this.#head;this.#head=node;if(!this.#tail)this.#tail=node;this.#size+=1}
  shift(){if(!this.#head)return undefined;const value=this.#head.value;this.#head=this.#head.next;this.#size-=1;if(this.#size===0)this.#tail=null;return value}
  find(predicate:(value:T,index:number)=>boolean){let current=this.#head;let index=0;while(current){if(predicate(current.value,index))return current.value;current=current.next;index+=1}return undefined}
  toArray(){const values:T[]=[];let current=this.#head;while(current){values.push(current.value);current=current.next}return values}
  clear(){this.#head=null;this.#tail=null;this.#size=0}
}
