import assert from 'node:assert/strict'
import { test } from 'node:test'
import { StandardOverdueFinePolicy } from './fine-policy.js'
test('fine policy charges each started overdue day',()=>{const policy=new StandardOverdueFinePolicy(1000,50000);const result=policy.calculate(new Date('2026-11-01T00:00:00Z'),new Date('2026-11-03T00:00:01Z'));assert.deepEqual(result,{overdueDays:3,amountCents:3000})})
test('fine policy charges nothing for an on-time return',()=>{const policy=new StandardOverdueFinePolicy(1000,50000);assert.deepEqual(policy.calculate(new Date('2026-11-03T00:00:00Z'),new Date('2026-11-02T00:00:00Z')),{overdueDays:0,amountCents:0})})
test('fine policy caps large assessments',()=>{const policy=new StandardOverdueFinePolicy(1000,5000);assert.equal(policy.calculate(new Date('2026-01-01T00:00:00Z'),new Date('2026-02-01T00:00:00Z')).amountCents,5000)})
