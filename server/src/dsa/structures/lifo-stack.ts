class StackNode<T>{value:T;next:StackNode<T>|null;constructor(value:T,next:StackNode<T>|null){this.value=value;this.next=next}}
export class LifoStack<T>{
  #top:StackNode<T>|null=null
  #size=0
  get size(){return this.#size}
  get isEmpty(){return this.#size===0}
  push(value:T){this.#top=new StackNode(value,this.#top);this.#size+=1}
  peek(){return this.#top?.value}
  pop(){if(!this.#top)return undefined;const value=this.#top.value;this.#top=this.#top.next;this.#size-=1;return value}
  toArrayFromTop(){const values:T[]=[];let current=this.#top;while(current){values.push(current.value);current=current.next}return values}
  clear(){this.#top=null;this.#size=0}
}
