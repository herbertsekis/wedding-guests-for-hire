import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCommissions, computeDashboard, validateSplit } from '../src/lib/calculations.js';

test('commissions use cents and largest-share tie-break', () => {
  assert.deepEqual(calculateCommissions(1000, { richard: 50, anastasia: 30, jean_claude: 20 }), { poolCents: 10000, amounts: { richard: 5000, anastasia: 3000, jean_claude: 2000 }, percentages: { richard: 50, anastasia: 30, jean_claude: 20 } });
  assert.equal(calculateCommissions(10.05, { richard: 50, anastasia: 50, jean_claude: 0 }).amounts.richard, 51);
});
test('calculation is data driven and pending sale is excluded', () => {
  const d = computeDashboard([{ type:'sale', status:'approved', project:'A', amount_cents:100000, final_commission_amounts:{richard:5000,anastasia:3000,jean_claude:2000} }, { type:'sale', status:'pending_approval', project:'B', amount_cents:999999 }, { type:'expense', status:'awaiting_allocation', amount_cents:12000 }]);
  assert.equal(d.A.result, 90000); assert.equal(d.company.result, 78000); assert.equal(d.company.awaiting, 12000);
});
test('the supplied two-test dataset reaches results through normal records', () => {
  const sale=(project,amount,final)=>({type:'sale',status:'approved',project,amount_cents:amount*100,final_commission_amounts:final});
  const expense=(amount,final,status='allocated')=>({type:'expense',status,amount_cents:amount*100,final_allocation:final});
  const c=(amount,split)=>calculateCommissions(amount,split).amounts;
  const d=computeDashboard([
    sale('A',1000,c(1000,{richard:50,anastasia:30,jean_claude:20})), sale('B',2000,c(2000,{richard:20,anastasia:40,jean_claude:40})), expense(120,'A'),expense(80,'A'),expense(100,'company_overhead'),
    sale('A',1500,c(1500,{richard:20,anastasia:30,jean_claude:50})), sale('B',800,c(800,{richard:25,anastasia:25,jean_claude:50})), {type:'sale',status:'pending_approval',project:'B',amount_cents:60000}, expense(250,'B'),expense(90,'B'),expense(60,'company_overhead'),expense(140,null,'awaiting_allocation')
  ]);
  assert.equal(d.A.result,205000); assert.equal(d.B.result,218000); assert.equal(d.company.result,393000);
  assert.deepEqual(d.earned,{richard:14000,anastasia:17500,jean_claude:21500});
});
test('invalid commission totals are rejected',()=>assert.throws(()=>validateSplit({richard:60,anastasia:30,jean_claude:20}),/total/));
