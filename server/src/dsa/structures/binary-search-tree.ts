export interface TreeOperation<T>{values:T[];comparisons:number}
export interface TreeNodeSnapshot<T>{key:string;values:T[];leftKey:string|null;rightKey:string|null;depth:number}
class TreeNode<T>{readonly key:string;readonly values:T[];left:TreeNode<T>|null=null;right:TreeNode<T>|null=null;constructor(key:string,value:T){this.key=key;this.values=[value]}}
function normalize(key:string){return key.trim().toLocaleLowerCase()}

export class BinarySearchTree<T>{
  readonly #keyOf:(value:T)=>string
  #root:TreeNode<T>|null=null
  #valueCount=0
  #nodeCount=0
  constructor(keyOf:(value:T)=>string){this.#keyOf=keyOf}
  get size(){return this.#valueCount}
  get uniqueKeys(){return this.#nodeCount}
  get rootKey(){return this.#root?.key}
  insert(value:T){const key=normalize(this.#keyOf(value));if(!key)throw new Error('Tree key cannot be empty');if(!this.#root){this.#root=new TreeNode(key,value);this.#valueCount=1;this.#nodeCount=1;return{comparisons:0,duplicateKey:false}}let current=this.#root;let comparisons=0;while(true){comparisons+=1;if(key===current.key){current.values.push(value);this.#valueCount+=1;return{comparisons,duplicateKey:true}}if(key<current.key){if(current.left)current=current.left;else{current.left=new TreeNode(key,value);this.#valueCount+=1;this.#nodeCount+=1;return{comparisons,duplicateKey:false}}}else if(current.right)current=current.right;else{current.right=new TreeNode(key,value);this.#valueCount+=1;this.#nodeCount+=1;return{comparisons,duplicateKey:false}}}}
  find(key:string):TreeOperation<T>{const normalized=normalize(key);let current=this.#root;let comparisons=0;while(current){comparisons+=1;if(normalized===current.key)return{values:[...current.values],comparisons};current=normalized<current.key?current.left:current.right}return{values:[],comparisons}}
  inOrder(){const values:T[]=[];const stack:TreeNode<T>[]=[];let current=this.#root;while(current||stack.length){while(current){stack.push(current);current=current.left}const node=stack.pop();if(!node)break;values.push(...node.values);current=node.right}return values}
  height(){if(!this.#root)return 0;let max=0;const pending:Array<{node:TreeNode<T>;depth:number}>=[{node:this.#root,depth:1}];for(let index=0;index<pending.length;index+=1){const item=pending[index];if(!item)continue;max=Math.max(max,item.depth);if(item.node.left)pending.push({node:item.node.left,depth:item.depth+1});if(item.node.right)pending.push({node:item.node.right,depth:item.depth+1})}return max}
  snapshot(){if(!this.#root)return[];const nodes:TreeNodeSnapshot<T>[]=[];const pending:Array<{node:TreeNode<T>;depth:number}>=[{node:this.#root,depth:0}];for(let index=0;index<pending.length;index+=1){const item=pending[index];if(!item)continue;nodes.push({key:item.node.key,values:[...item.node.values],leftKey:item.node.left?.key??null,rightKey:item.node.right?.key??null,depth:item.depth});if(item.node.left)pending.push({node:item.node.left,depth:item.depth+1});if(item.node.right)pending.push({node:item.node.right,depth:item.depth+1})}return nodes}
}
