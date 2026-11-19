/**
 * KENSETSUGATE（建設門）Core Engine
 * 改正建設業法（第19条書面16項目 / 標準労務費・法定福利費ダンピング禁止 / 資材価格転嫁協議 /
 * 著しく短い工期禁止・4週8休 / 第22条丸投げ禁止 / 2025年政令改正 特定建設業許可 5,000万円・8,000万円 /
 * 特定建設業者50日現金払・60日手形上限 / 2024年建設業時間外労働上限 月100h未満・複数月平均80h以内）
 * 完全ローカル診断エンジン（外部通信ゼロ）
 */

const PILLARS = [
  {
    id: 'art19_written_16_items',
    title: '建設業法第19条 法定16項目・着工前書面交付（注文書＋基本契約）',
    criterion: '建設業法第19条第1項（工期・請負代金・変更方法・天災負担等）',
    weight: 14,
    severity: 'HIGH',
    pattern: /(?:19条|第19条|法16項目|書面交付|着工前|電磁的措置|工事内容|請負代金)/i,
    antiPattern: /(?:口頭発注|書面交付省略|着工後契約)/i,
    detail: '工事着工前の第19条法定16項目を含む書面（または承諾済み電磁的記録）交付確認が欠けています。',
    remediation: '請負代金・支払時期/方法・変更条項・危険負担等を含む法16項目書面を着工前に交付・保管してください。',
  },
  {
    id: 'standard_labor_welfare_breakdown',
    title: '標準労務費＆法定福利費内訳明示・著しく低い労務費（ダンピング）禁止',
    criterion: '改正建設業法 第19条の3 / 第20条（標準労務費・勧告基準）',
    weight: 14,
    severity: 'HIGH',
    pattern: /(?:標準労務費|法定福利費|労務費内訳|労務費の見積|著しく低い|社会保険料明示)/i,
    antiPattern: /(?:法定福利費一式込み|労務費内訳不要|ダンピング容認)/i,
    detail: '標準労務費を下回る著しく低い請負代金の禁止および見積書での労務費・法定福利費内訳明示が見当たりません。',
    remediation: '見積内訳に標準労務費および法定福利費を別掲明示し、基準を下回る減額・指値を行わない規程を設けてください。',
  },
  {
    id: 'price_escalation_consultation',
    title: '資材・労務費高騰『おそれ情報』通知 ＆ 誠実な請負代金変更協議義務',
    criterion: '改正建設業法 請負代金変更協議条項（原材料費等高騰転嫁）',
    weight: 13,
    severity: 'HIGH',
    pattern: /(?:資材高騰|価格転嫁|変更協議|おそれ情報|スライド条項|協議に応じる|物価変動協議)/i,
    antiPattern: /(?:物価変動による増額請求は認めない|価格協議不可|増額一切禁止|転嫁拒否)/i,
    detail: '資材・燃料・労務費高騰のおそれ情報通知や下請からの協議申出に対し誠実協議に応じる価格スライド条項がありません。',
    remediation: '物価変動時に契約金額変更協議を請求でき、相手方が誠実に協議に応じる旨のスライド条項を組み込んでください。',
  },
  {
    id: 'short_period_4w8d_ban',
    title: '著しく短い工期の禁止（第19条の5）・4週8休確保＆工期延長協議',
    criterion: '建設業法第19条の5 / 2024年時間外上限規制連動',
    weight: 13,
    severity: 'HIGH',
    pattern: /(?:著しく短い工期|工期適正|4週8休|休日確保|工程見直し|天候休工)/i,
    antiPattern: /(?:工期短縮強制|休日返上|4週8休は努力義務|突貫工事指示)/i,
    detail: '4週8休や天候不順日を見込んだ適正工期の確保、および違法残業を強いる著しく短い工期の禁止規定が不足しています。',
    remediation: '準備・後片付け・週休2日(4週8休)・降雨不稼働日を考慮した工期設定と天候等による工期変更条項を明記してください。',
  },
  {
    id: 'blanket_subcontract_marunage_ban',
    title: '建設業法第22条 一括下請負（丸投げ）原則禁止 ＆ 実質的関与要件',
    criterion: '建設業法第22条第1項・国土交通省「実質的関与」基準',
    weight: 12,
    severity: 'HIGH',
    pattern: /(?:一括下請負|丸投げ禁止|22条|第22条|実質的関与|自主施工)/i,
    antiPattern: /(?:一括下請負を許容|丸投げ可|22条適用外)/i,
    detail: '元請・上位下請による総合企画・工程管理・品質管理等の実質的関与を欠く一括下請負（丸投げ）の禁止条項がありません。',
    remediation: '請け負った工事を一括して第三者に委任する丸投げを厳禁し、現場での実質的関与義務を明記してください。',
  },
  {
    id: 'tokutei_50d_payment_60d_note',
    title: '特定建設業者50日現金払・手形60日サイト上限・一方的赤伝処理禁止',
    criterion: '建設業法第24条の3・第24条の5・第24条の6',
    weight: 12,
    severity: 'MEDIUM',
    pattern: /(?:50日|５０日|現金払|24条の6|24条の3|60日以内|サイト60日|赤伝禁止)/i,
    antiPattern: /(?:手形サイト120日|手形サイト90日|一方的赤伝|支払サイト90日)/i,
    detail: '特定建設業者の引渡申出から50日以内支払、労務費相当分の現金払努力・手形サイト60日上限・赤伝禁止の記載が不十分です。',
    remediation: '引渡申出後50日以内の支払、60日超の長期手形・一括決済方式の排除、および合意なき赤伝相殺禁止を記載してください。',
  },
  {
    id: 'chief_managing_engineer_assignment',
    title: '主任技術者／監理技術者配置 ＆ 施工体制台帳・再下請負通知書整備',
    criterion: '建設業法第26条・第24条の7（技術者資格・施工体制台帳）',
    weight: 11,
    severity: 'MEDIUM',
    pattern: /(?:主任技術者|監理技術者|施工体制台帳|専任義務|再下請負通知書)/i,
    antiPattern: /(?:技術者未配置|施工体制台帳省略|名義貸し)/i,
    detail: '請負金額・特定建設業区分に応じた主任/監理技術者の適正配置および施工体制台帳・再下請負通知書の作成ルールが不明確です。',
    remediation: '資格要件を満たす技術者配置と下請締結時の施工体制台帳・作業員名簿整備手続きを規定化してください。',
  },
  {
    id: 'ledger_5yr_10yr_retention',
    title: '建設業法第40条の3 営業所帳簿・添付契約書（5年/新築住宅10年）保存',
    criterion: '建設業法第40条の3・同施行規則第28条（帳簿等保存義務）',
    weight: 11,
    severity: 'MEDIUM',
    pattern: /(?:帳簿|5年|５年|10年|１０年|40条の3|保存義務|証憑保管)/i,
    antiPattern: /(?:帳簿保存なし|契約書破棄|保存期間1年)/i,
    detail: '請負契約に関する帳簿・添付契約書・施工体制台帳の法定保存期間（原則5年、発注者と直接締結した新築住宅工事は10年）が見当たりません。',
    remediation: '閉鎖後5年間（新築住宅は10年間）の契約書・請求書・施工体制台帳電子/書面保存ルールを明文化してください。',
  },
];

export function evaluateKensetsuThresholds({
  contractAmountJpy = 0,
  estimatedLaborWelfareJpy = 0,
  subcontractTotalJpy = 0,
  constructionType = 'general',
  hasTokuteiLicense = false,
  monthlyOvertimeHours = 0,
  rollingAvgOvertimeHours = 0,
} = {}) {
  const contractAmt = Math.max(0, Number(contractAmountJpy) || 0);
  const laborFloor = Math.max(0, Number(estimatedLaborWelfareJpy) || 0);
  const subTotal = Math.max(0, Number(subcontractTotalJpy) || 0);
  const ctype = String(constructionType || 'general').trim().toLowerCase() || 'general';
  const tokuteiThresholdJpy = ctype === 'architectural_general' ? 80_000_000 : 50_000_000;

  const tokuteiLicenseRequired = subTotal >= tokuteiThresholdJpy;
  const unlicensedTokuteiViolation = Boolean(tokuteiLicenseRequired && !hasTokuteiLicense);
  const belowLaborWelfareFloor = Boolean(contractAmt > 0 && laborFloor > contractAmt);
  const mOt = Math.max(0, Number(monthlyOvertimeHours) || 0);
  const avgOt = Math.max(0, Number(rollingAvgOvertimeHours) || 0);
  const overtimeCapBreach = Boolean(mOt >= 100 || avgOt > 80);

  return {
    constructionType: ctype,
    contractAmountJpy: contractAmt,
    estimatedLaborWelfareJpy: laborFloor,
    subcontractTotalJpy: subTotal,
    tokuteiThresholdJpy,
    hasTokuteiLicense: Boolean(hasTokuteiLicense),
    tokuteiLicenseRequired,
    unlicensedTokuteiViolation,
    belowLaborWelfareFloor,
    monthlyOvertimeHours: mOt,
    rollingAvgOvertimeHours: avgOt,
    overtimeCapBreach,
  };
}

export function auditKensetsuContract(contractText = '', options = {}) {
  const normalized = String(contractText || '').replace(/\u3000/g, ' ').trim();
  const thresholds = evaluateKensetsuThresholds(options);

  const findings = [];
  const passedPillars = [];
  let rawScore = 0;

  for (const pillar of PILLARS) {
    const matched = pillar.pattern.test(normalized);
    const negated = pillar.antiPattern.test(normalized);
    if (matched && !negated) {
      rawScore += pillar.weight;
      passedPillars.push({
        id: pillar.id,
        title: pillar.title,
        criterion: pillar.criterion,
        weight: pillar.weight,
      });
    } else {
      findings.push({
        id: pillar.id,
        title: pillar.title,
        criterion: pillar.criterion,
        severity: pillar.severity,
        detail: negated ? `NG特約・運用検出（${pillar.detail}）` : pillar.detail,
        remediation: pillar.remediation,
      });
    }
  }

  let penalty = 0;
  if (thresholds.unlicensedTokuteiViolation) {
    penalty += 20;
    findings.push({
      id: 'tokutei_license_missing',
      title: '特定建設業許可基準額（2025年政令 5,000万/8,000万円）到達にもかかわらず特定許可未保有',
      criterion: `建設業法第3条・第15条（下請総額 ${(thresholds.subcontractTotalJpy / 10000).toLocaleString('en-US')}万円 >= ${(thresholds.tokuteiThresholdJpy / 10000).toLocaleString('en-US')}万円）`,
      severity: 'HIGH',
      detail: `元請として締結する下請代金の総額が ${(thresholds.subcontractTotalJpy / 10000).toLocaleString('en-US')}万円（区分 ${thresholds.constructionType} の閾値 ${(thresholds.tokuteiThresholdJpy / 10000).toLocaleString('en-US')}万円以上）に達していますが、特定建設業許可がありません（無許可営業リスク）。`,
      remediation: '下請発注総額を基準未満に抑えるか、発注前に特定建設業許可を取得・配置してください。',
    });
  }

  if (thresholds.belowLaborWelfareFloor) {
    penalty += 20;
    findings.push({
      id: 'labor_dumping_violation',
      title: '契約金額が標準労務費＋法定福利費合計を下回る労務費ダンピング水準',
      criterion: `改正建設業法（請負金額 ${thresholds.contractAmountJpy.toLocaleString('en-US')}円 < 標準労務費/法定福利費目安 ${thresholds.estimatedLaborWelfareJpy.toLocaleString('en-US')}円）`,
      severity: 'HIGH',
      detail: '請負代金額が現場技能者の標準労務費・法定福利費目安を下回っており、国土交通大臣・知事による勧告・公表リスクおよび発注禁止事項違反の恐れがあります。',
      remediation: '中央建設業審議会作成「労務費に関する基準」および法定福利費を上回る金額へ見積再協議を行ってください。',
    });
  }

  if (thresholds.overtimeCapBreach) {
    penalty += 15;
    findings.push({
      id: 'construction_2024_overtime_breach',
      title: '2024年建設業 時間外労働上限規制（単月100h未満・複数月平均80h以内）超過',
      criterion: `改正労基法 建設業上限（単月 ${thresholds.monthlyOvertimeHours}h / 2〜6ヶ月平均 ${thresholds.rollingAvgOvertimeHours}h）`,
      severity: 'HIGH',
      detail: '2024年4月より建設業にも原則適用された時間外・休日労働上限（休日含み単月100h未満・複数月平均80h以内）を超過しており、工期設定・工程人員の是正が必須です。',
      remediation: '第19条の5に基づく適正工期延長協議および増員・4週8休シフトの見直しを直ちに実施してください。',
    });
  }

  const score = Math.min(100, Math.max(0, rawScore - penalty));
  let readinessLabel = '法令違反・監督処分/是正リスクあり';
  let status = 'fail';
  if (score >= 88 && findings.every((f) => f.severity !== 'HIGH')) {
    readinessLabel = '改正建設業法・2024年上限規制 適合';
    status = 'pass';
  } else if (score >= 65) {
    readinessLabel = '一部補完推奨（書面・協議条項確認）';
    status = 'warn';
  }

  return {
    score,
    status,
    readinessLabel,
    thresholds,
    passedPillars,
    findings,
    passedCount: passedPillars.length,
    totalPillars: PILLARS.length,
  };
}

export function generateKensetsuComplianceMarkdown(auditResult, meta = {}) {
  const org = String(meta.organizationName || '貴社（未設定）').trim() || '貴社（未設定）';
  const project = String(meta.projectName || '対象工事案件（未設定）').trim() || '対象工事案件（未設定）';
  const today = new Date().toISOString().slice(0, 10);
  const t = auditResult.thresholds;

  const lines = [
    '# 改正建設業法（労務費・価格協議・特定建設業許可）兼 2024年工期残業上限 監査証明書',
    '',
    `- **作成日**: ${today}`,
    `- **事業者 / 元請・発注者名**: ${org}`,
    `- **対象工事名**: ${project}`,
    `- **法令適合スコア**: **${auditResult.readinessLabel}**（\`${auditResult.score}/100\` / 充足 \`${auditResult.passedCount}/${auditResult.totalPillars}\`）`,
    '',
    '## 1. 定量閾値判定（特定建設業・標準労務費・時間外上限）',
    '',
    `- **工事区分・特定許可閾値**: \`${t.constructionType}\`（下請総額 \`${t.subcontractTotalJpy.toLocaleString('en-US')} JPY\` / 基準 \`${t.tokuteiThresholdJpy.toLocaleString('en-US')} JPY\` / 特定許可: \`${t.hasTokuteiLicense ? '保有' : '未保有'}\`）`,
    `- **労務費ダンピング検査**: 請負金額 \`${t.contractAmountJpy.toLocaleString('en-US')} JPY\` vs 標準労務費/法定福利費 \`${t.estimatedLaborWelfareJpy.toLocaleString('en-US')} JPY\` -> \`${t.belowLaborWelfareFloor ? '下回る警告 (NG)' : '適正水準'}\``,
    `- **2024年時間外上限（単月100h未満 / 平均80h以内）**: 単月 \`${t.monthlyOvertimeHours}h\` / 平均 \`${t.rollingAvgOvertimeHours}h\` -> \`${t.overtimeCapBreach ? '上限超過 (NG)' : '上限内'}\``,
    '',
    '## 2. 改正建設業法 8大チェック項目の適合・是正状況',
    '',
    '| 法的チェック項目 | 判定 | 根拠 / 是正事項 |',
    '|---|---|---|',
  ];

  for (const p of auditResult.passedPillars) {
    lines.push(`| ${p.title} | 充足 | ${p.criterion} |`);
  }
  for (const f of auditResult.findings) {
    lines.push(`| ${f.title} | 要是正 (${f.severity}) | ${f.detail} ／ 是正案: ${f.remediation} |`);
  }

  lines.push(
    '',
    '---',
    '*本確認書は KENSETSUGATE（建設門）により見積書・下請契約案・勤怠数値等を社外サーバーへ一切送信せずブラウザローカルで生成されました（ネットワーク通信: `0`回）。*'
  );

  return lines.join('\n');
}
