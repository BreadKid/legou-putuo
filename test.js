#!/usr/bin/env node
// 山姆周末羊毛计算器 — 分组算法单元测试
// 用法: node test.js

function discountOf(a) {
  if (a >= 300) return 45;
  if (a >= 200) return 30;
  if (a >= 100) return 15;
  return 0;
}

// 纯函数: 分组算法核心 (与 index.html 中 computeGroups 保持同步)
// units: [{id, price}] 单件展开, price>0 已过滤
// 返回: [{amount, members: Map<id, count>}]
function computeGroups(units, people) {
  units.sort((a, b) => b.price - a.price);
  if (!units.length) return [];

  // Step 1: LPT 均摊到 people 个组
  const groups = Array.from({ length: people }, () => ({ amount: 0, members: new Map() }));
  for (const u of units) {
    let minGi = 0;
    for (let i = 1; i < groups.length; i++) {
      if (groups[i].amount < groups[minGi].amount) minGi = i;
    }
    groups[minGi].amount += u.price;
    groups[minGi].members.set(u.id, (groups[minGi].members.get(u.id) || 0) + 1);
  }

  // Step 2: 尾组清理 (<100 拆掉, LPT 均摊到 >=100 的组)
  const tails = groups.filter(g => g.amount < 100);
  const keep  = groups.filter(g => g.amount >= 100);
  if (tails.length && keep.length) {
    const spill = [];
    for (const t of tails) {
      for (const [id, cnt] of t.members) {
        const price = units.find(u => u.id === id).price;
        for (let k = 0; k < cnt; k++) spill.push({ id, price });
      }
    }
    spill.sort((a, b) => b.price - a.price);
    for (const u of spill) {
      let minG = keep[0];
      for (const g of keep) if (g.amount < minG.amount) minG = g;
      minG.amount += u.price;
      minG.members.set(u.id, (minG.members.get(u.id) || 0) + 1);
    }
  } else if (tails.length > 1) {
    // 无 keep 组时, 合并所有尾组为一个
    const merged = { amount: 0, members: new Map() };
    for (const t of tails) {
      merged.amount += t.amount;
      for (const [id, cnt] of t.members) {
        merged.members.set(id, (merged.members.get(id) || 0) + cnt);
      }
    }
    return [merged];
  }
  let result = keep.length ? keep : tails;

  // Step 3: 去空组
  result = result.filter(g => g.amount > 0 || g.members.size > 0);
  return result;
}

const cases = [
  // [name, priceQtyPairs, people, expectedSave, expectedGross]
  ['反例 [238,238,65,49,49,99] p=6', [[238,2],[65,1],[49,2],[99,1]], 6, 90, 738],
  ['反例 [238,238,65,49,49,99] p=2', [[238,2],[65,1],[49,2],[99,1]], 2, 90, 738],
  ['600 p=2',   [[300,1],[300,1]],  2, 90, 600],
  ['350x3 p=2', [[350,3]],          2, 90, 1050],
  ['80x5',      [[80,5]],           5, 45, 400],
  ['280+50',    [[280,1],[50,1]],   5, 45, 330],
  ['100x10',    [[100,10]],         5, 150, 1000],
  ['100x2+200+350 p=2', [[100,2],[200,1],[350,1]], 2, 90, 750],
  ['未填价跳过', [[0,5],[300,1]],    5, 45, 300],
  ['均分平衡 [99.8*4,56.9*4] p=2', [[99.8,4],[56.9,4]], 2, 90, 626.8],
];

let pass = 0, fail = 0;
console.log('=== 分组算法单元测试 ===\n');

for (const [name, pairs, p, expSave, expGross] of cases) {
  const units = [];
  pairs.forEach(([price, qty], id) => {
    if (price > 0) for (let k = 0; k < qty; k++) units.push({ id, price });
  });
  const groups = computeGroups(units, p);
  const save = groups.reduce((a, g) => a + discountOf(g.amount), 0);
  const gross = pairs.reduce((s, [price, qty]) => s + (price > 0 ? price * qty : 0), 0);
  const ok = save === expSave && gross === expGross;
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) {
    console.log(`   期望 共省=${expSave} 原价=${expGross}`);
    console.log(`   实际 共省=${save} 原价=${gross}`);
    fail++;
  } else {
    console.log(`   共省=${save} 组数=${groups.length}`);
    groups.forEach((g, i) => console.log(`   组${i+1}: ¥${g.amount.toFixed(2)}`));
    pass++;
  }
}

console.log(`\n${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
