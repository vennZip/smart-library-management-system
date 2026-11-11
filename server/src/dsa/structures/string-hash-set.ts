export interface HashSetStatistics {size:number;bucketCount:number;usedBuckets:number;collisions:number;loadFactor:number}

export class StringHashSet{
  readonly #buckets:string[][]
  #size=0
  constructor(bucketCount=31){if(!Number.isInteger(bucketCount)||bucketCount<3)throw new Error('Bucket count must be an integer of at least three');this.#buckets=Array.from({length:bucketCount},()=>[])}
  get size(){return this.#size}
  add(value:string){const normalized=value.trim().toLocaleLowerCase();if(!normalized)return false;const bucket=this.#buckets[this.#hash(normalized)];if(!bucket)return false;if(bucket.includes(normalized))return false;bucket.push(normalized);this.#size+=1;return true}
  has(value:string){const normalized=value.trim().toLocaleLowerCase();const bucket=this.#buckets[this.#hash(normalized)];return bucket?.includes(normalized)??false}
  delete(value:string){const normalized=value.trim().toLocaleLowerCase();const bucket=this.#buckets[this.#hash(normalized)];if(!bucket)return false;const index=bucket.indexOf(normalized);if(index<0)return false;bucket.splice(index,1);this.#size-=1;return true}
  values(){return this.#buckets.flat()}
  statistics():HashSetStatistics{const usedBuckets=this.#buckets.filter(bucket=>bucket.length>0).length;const collisions=this.#buckets.reduce((total,bucket)=>total+Math.max(0,bucket.length-1),0);return{size:this.#size,bucketCount:this.#buckets.length,usedBuckets,collisions,loadFactor:this.#size/this.#buckets.length}}
  #hash(value:string){let hash=2166136261;for(const character of value){hash^=character.codePointAt(0)??0;hash=Math.imul(hash,16777619)}return(hash>>>0)%this.#buckets.length}
}
