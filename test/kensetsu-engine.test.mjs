import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditKensetsuContract,
  evaluateKensetsuThresholds,
  generateKensetsuComplianceMarkdown,
} from '../docs/core/kensetsu-engine.mjs';

test('evaluateKensetsuThresholds enforces 50M/80M Tokutei thresholds, labor dumping & 2024 OT cap', () => {
  const genViolation = evaluateKensetsuThresholds({
    contractAmountJpy: 18_000_000,
    estimatedLaborWelfareJpy: 19_500_000,
    subcontractTotalJpy: 55_000_000,
    constructionType: 'general',
    hasTokuteiLicense: false,
    monthlyOvertimeHours: 105,
    rollingAvgOvertimeHours: 84,
  });
  assert.equal(genViolation.tokuteiThresholdJpy, 50_000_000);
  assert.equal(genViolation.tokuteiLicenseRequired, true);
  assert.equal(genViolation.unlicensedTokuteiViolation, true);
  assert.equal(genViolation.belowLaborWelfareFloor, true);
  assert.equal(genViolation.overtimeCapBreach, true);

  const archBelow80M = evaluateKensetsuThresholds({
    contractAmountJpy: 75_000_000,
    estimatedLaborWelfareJpy: 40_000_000,
    subcontractTotalJpy: 70_000_000,
    constructionType: 'architectural_general',
    hasTokuteiLicense: false,
    monthlyOvertimeHours: 45,
    rollingAvgOvertimeHours: 38,
  });
  assert.equal(archBelow80M.tokuteiThresholdJpy, 80_000_000);
  assert.equal(archBelow80M.tokuteiLicenseRequired, false);
  assert.equal(archBelow80M.unlicensedTokuteiViolation, false);
  assert.equal(archBelow80M.belowLaborWelfareFloor, false);
  assert.equal(archBelow80M.overtimeCapBreach, false);
});

test('auditKensetsuContract flags anti-patterns & threshold violations and passes full 8-pillar contract', () => {
  const bad = auditKensetsuContract(
    '物価変動による増額請求は認めない。一括下請負を許容し、4週8休は努力義務とする。',
    {
      contractAmountJpy: 18_000_000,
      estimatedLaborWelfareJpy: 19_500_000,
      subcontractTotalJpy: 55_000_000,
      constructionType: 'general',
      hasTokuteiLicense: false,
      monthlyOvertimeHours: 105,
      rollingAvgOvertimeHours: 84,
    },
  );
  assert.equal(bad.status, 'fail');
  assert.ok(bad.findings.some((f) => f.id === 'tokutei_license_missing'));
  assert.ok(bad.findings.some((f) => f.id === 'labor_dumping_violation'));
  assert.ok(bad.findings.some((f) => f.id === 'construction_2024_overtime_breach'));
  assert.ok(bad.findings.some((f) => f.id === 'price_escalation_consultation'));

  const goodText = [
    '着工前に建設業法第19条法定16項目を書面交付する。',
    '見積内訳に標準労務費および法定福利費明示を徹底する。',
    '資材高騰おそれ情報通知時は変更協議（スライド条項）に応じる。',
    '4週8休を確保し著しく短い工期を禁止する。',
    '第22条に基づき一括下請負（丸投げ禁止）を遵守する。',
    '特定建設業50日以内現金払（手形60日以内・赤伝禁止）を徹底する。',
    '主任技術者・監理技術者配置および施工体制台帳を作成する。',
    '第40条の3に基づき営業所帳簿を5年（新築住宅10年）保存する。',
  ].join('\n');

  const good = auditKensetsuContract(goodText, {
    contractAmountJpy: 60_000_000,
    estimatedLaborWelfareJpy: 35_000_000,
    subcontractTotalJpy: 65_000_000,
    constructionType: 'architectural_general',
    hasTokuteiLicense: false,
    monthlyOvertimeHours: 42,
    rollingAvgOvertimeHours: 36,
  });
  assert.equal(good.score, 100);
  assert.equal(good.status, 'pass');
  assert.equal(good.passedCount, 8);

  const md = generateKensetsuComplianceMarkdown(good, {
    organizationName: 'テスト建設株式会社',
    projectName: '埼玉物流センター新設工事',
  });
  assert.match(md, /テスト建設株式会社/);
  assert.match(md, /埼玉物流センター新設工事/);
  assert.match(md, /KENSETSUGATE/);
});
