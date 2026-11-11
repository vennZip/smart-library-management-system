import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FifoQueue } from './fifo-queue.js'
import { LifoStack } from './lifo-stack.js'
import { SinglyLinkedList } from './singly-linked-list.js'
import { StringHashSet } from './string-hash-set.js'

test('linked list maintains head, tail, size, and traversal order',()=>{const list=new SinglyLinkedList<number>();list.append(2);list.prepend(1);list.append(3);assert.deepEqual(list.toArray(),[1,2,3]);assert.equal(list.first,1);assert.equal(list.last,3);assert.equal(list.size,3);assert.equal(list.find(value=>value===2),2)})
test('linked list shifting and clearing preserve empty invariants',()=>{const list=new SinglyLinkedList<string>();assert.equal(list.shift(),undefined);list.append('a');assert.equal(list.shift(),'a');assert.equal(list.first,undefined);assert.equal(list.last,undefined);list.append('b');list.clear();assert.equal(list.size,0)})
test('queue processes values in FIFO order and survives compaction',()=>{const queue=new FifoQueue<number>();for(let value=0;value<80;value+=1)queue.enqueue(value);for(let value=0;value<50;value+=1)assert.equal(queue.dequeue(),value);assert.equal(queue.peek(),50);assert.equal(queue.size,30);assert.deepEqual(queue.toArray(),Array.from({length:30},(_,index)=>index+50))})
test('queue handles empty and clear operations',()=>{const queue=new FifoQueue<string>();assert.equal(queue.dequeue(),undefined);queue.enqueue('first');queue.clear();assert.equal(queue.peek(),undefined);assert.equal(queue.isEmpty,true)})
test('stack processes values in LIFO order',()=>{const stack=new LifoStack<string>();stack.push('old');stack.push('new');assert.equal(stack.peek(),'new');assert.deepEqual(stack.toArrayFromTop(),['new','old']);assert.equal(stack.pop(),'new');assert.equal(stack.pop(),'old');assert.equal(stack.pop(),undefined)})
test('hash set normalizes values and rejects duplicates',()=>{const set=new StringHashSet(7);assert.equal(set.add(' ISBN-1 '),true);assert.equal(set.add('isbn-1'),false);assert.equal(set.has('ISBN-1'),true);assert.equal(set.size,1);assert.equal(set.delete('isbn-1'),true);assert.equal(set.has('isbn-1'),false)})
test('hash set exposes collision and load statistics',()=>{const set=new StringHashSet(3);for(const value of ['a','b','c','d','e'])set.add(value);const stats=set.statistics();assert.equal(stats.size,5);assert.ok(stats.collisions>=2);assert.equal(stats.loadFactor,5/3)})
