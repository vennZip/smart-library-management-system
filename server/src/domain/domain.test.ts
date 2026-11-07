import assert from 'node:assert/strict'
import { test } from 'node:test'
import { StaffBorrowingPolicy, StudentBorrowingPolicy } from './borrowing-policy.js'
import { Book, ReferenceBook } from './library-item.js'
import { Member } from './member.js'
import { BorrowingService } from '../services/borrowing.service.js'

test('encapsulation protects copy and loan counts through domain methods',()=>{const book=new Book('b1','Clean Architecture',2,'978-0-13');const member=new Member('m1','Ari');const service=new BorrowingService(new StudentBorrowingPolicy());const loan=service.borrow('l1',book,member,new Date('2026-11-07T00:00:00Z'));assert.equal(book.availableCopies,1);assert.equal(member.activeLoanCount,1);service.returnItem(loan,book,member,new Date('2026-11-08T00:00:00Z'));assert.equal(book.availableCopies,2);assert.equal(member.activeLoanCount,0)})
test('inheritance gives reference books non-circulating polymorphic behavior',()=>{const item=new ReferenceBook('r1','University Atlas',1);const service=new BorrowingService(new StudentBorrowingPolicy());assert.throws(()=>service.borrow('l1',item,new Member('m1','Sam')),/not available/)})
test('polymorphic policies produce different due dates through one service contract',()=>{const date=new Date('2026-11-07T00:00:00Z');const member=new Member('m1','Mina');const studentLoan=new BorrowingService(new StudentBorrowingPolicy()).borrow('l1',new Book('b1','Algorithms',1,'111'),member,date);const staffLoan=new BorrowingService(new StaffBorrowingPolicy()).borrow('l2',new Book('b2','Databases',1,'222'),new Member('m2','Lee'),date);assert.equal(studentLoan.dueAt.toISOString(),'2026-11-21T00:00:00.000Z');assert.equal(staffLoan.dueAt.toISOString(),'2026-12-05T00:00:00.000Z')})
test('suspended members are rejected by the policy abstraction',()=>{const member=new Member('m1','Nora');member.suspend();assert.throws(()=>new BorrowingService(new StudentBorrowingPolicy()).borrow('l1',new Book('b1','Networks',1,'333'),member),/Suspended/)})
