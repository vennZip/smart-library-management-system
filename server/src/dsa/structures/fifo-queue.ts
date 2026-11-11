export class FifoQueue<T>{
  #values:(T|undefined)[]=[]
  #head=0
  get size(){return this.#values.length-this.#head}
  get isEmpty(){return this.size===0}
  enqueue(value:T){this.#values.push(value)}
  peek(){return this.#values[this.#head]}
  dequeue(){if(this.isEmpty)return undefined;const value=this.#values[this.#head];this.#values[this.#head]=undefined;this.#head+=1;if(this.#head>32&&this.#head*2>=this.#values.length){this.#values=this.#values.slice(this.#head);this.#head=0}return value}
  toArray(){return this.#values.slice(this.#head) as T[]}
  clear(){this.#values=[];this.#head=0}
}
