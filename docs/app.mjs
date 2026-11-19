import {
  auditKensetsuContract,
  generateKensetsuComplianceMarkdown,
} from './core/kensetsu-engine.mjs';

const BAD_CONTRACT_SAMPLE = `・物価変動による増額請求は認めないものとし、一切の価格協議に応じない。
・法定福利費一式込みとし労務費内訳不要、一括下請負を許容する。
・4週8休は努力義務とし、手形サイト120日・帳簿保存なしとする。`;

const GOOD_CONTRACT_SAMPLE = `・着工前に建設業法第19条法定16項目を含む注文書および請負契約書を書面交付する。
・見積内訳書に標準労務費および法定福利費を明示し、基準を下回る著しく低い契約を行わない。
・資材高騰または労務費変動のおそれ情報通知時は誠実に請負代金変更協議（スライド条項）に応じる。
・4週8休を確保し著しく短い工期を禁止するとともに、第22条に基づき一括下請負（丸投げ）を禁止する。
・特定建設業者の引渡申出後50日以内現金払（手形禁止/サイト60日以内・赤伝禁止）、主任技術者/監理技術者配置・施工体制台帳作成および第40条の3の帳簿5年保存を徹底する。`;

const els = {
  org: document.getElementById('in-org'),
  project: document.getElementById('in-project'),
  contractAmt: document.getElementById('in-contract-amt'),
  laborFloor: document.getElementById('in-labor-floor'),
  subcontract: document.getElementById('in-subcontract'),
  ctype: document.getElementById('in-ctype'),
  monthOt: document.getElementById('in-month-ot'),
  avgOt: document.getElementById('in-avg-ot'),
  tokutei: document.getElementById('in-tokutei'),
  contract: document.getElementById('in-contract'),
  badge: document.getElementById('status-badge'),
  mScore: document.getElementById('m-score'),
  mThresh: document.getElementById('m-thresh'),
  mOt: document.getElementById('m-ot'),
  findingsList: document.getElementById('findings-list'),
  mdOutput: document.getElementById('md-output'),
  btnBad: document.getElementById('btn-sample-bad'),
  btnGood: document.getElementById('btn-sample-good'),
  btnAudit: document.getElementById('btn-audit'),
  btnCopyMd: document.getElementById('btn-copy-md'),
  btnDownloadMd: document.getElementById('btn-download-md'),
};

let latestMarkdown = '';

function renderAudit() {
  const result = auditKensetsuContract(els.contract.value, {
    contractAmountJpy: Number(els.contractAmt.value || 0),
    estimatedLaborWelfareJpy: Number(els.laborFloor.value || 0),
    subcontractTotalJpy: Number(els.subcontract.value || 0),
    constructionType: els.ctype.value,
    hasTokuteiLicense: els.tokutei.checked,
    monthlyOvertimeHours: Number(els.monthOt.value || 0),
    rollingAvgOvertimeHours: Number(els.avgOt.value || 0),
  });

  const t = result.thresholds;
  els.mScore.textContent = `${result.score} / 100点`;
  els.mThresh.textContent = t.unlicensedTokuteiViolation
    ? '要特定許可(無許可NG)'
    : t.belowLaborWelfareFloor
      ? '労務費割れ警告(NG)'
      : '閾値・労務費適正';
  els.mOt.textContent = t.overtimeCapBreach
    ? `超過 (月${t.monthlyOvertimeHours}h/平均${t.rollingAvgOvertimeHours}h)`
    : `基準内 (月${t.monthlyOvertimeHours}h)`;

  els.badge.className = 'score-pill';
  if (result.status === 'pass') {
    els.badge.textContent = '改正建設業法・2024上限 適合 (PASS)';
    els.badge.classList.add('status-ready');
  } else if (result.status === 'warn') {
    els.badge.textContent = '一部補完推奨 (WARN)';
    els.badge.classList.add('status-review');
  } else {
    els.badge.textContent = '要修正・法令違反リスク (FAIL)';
    els.badge.classList.add('status-high');
  }

  els.findingsList.innerHTML = '';
  if (result.findings.length === 0) {
    const ok = document.createElement('div');
    ok.setAttribute('data-ui', 'finding-card');
    ok.className = 'sev-ok';
    ok.textContent = '全8要件（19条書面・標準労務費/法定福利費・価格変更協議・4週8休・丸投げ禁止・50日払・技術者台帳・5年保存）と閾値・時間外上限を充足しています。';
    els.findingsList.appendChild(ok);
  } else {
    for (const f of result.findings) {
      const card = document.createElement('div');
      card.setAttribute('data-ui', 'finding-card');
      card.className = f.severity === 'HIGH' ? 'sev-high' : 'sev-medium';
      const head = document.createElement('div');
      head.style.fontWeight = '700';
      head.textContent = `[${f.id}] ${f.title} (${f.criterion})`;
      const desc = document.createElement('div');
      desc.textContent = `${f.detail} ／ 是正案: ${f.remediation}`;
      card.append(head, desc);
      els.findingsList.appendChild(card);
    }
  }

  latestMarkdown = generateKensetsuComplianceMarkdown(result, {
    organizationName: els.org.value,
    projectName: els.project.value,
  });
  els.mdOutput.textContent = latestMarkdown;
}

els.btnBad.addEventListener('click', () => {
  els.contractAmt.value = '18000000';
  els.laborFloor.value = '19500000';
  els.subcontract.value = '55000000';
  els.ctype.value = 'general';
  els.tokutei.checked = false;
  els.monthOt.value = '105';
  els.avgOt.value = '84';
  els.contract.value = BAD_CONTRACT_SAMPLE;
  renderAudit();
});

els.btnGood.addEventListener('click', () => {
  els.contractAmt.value = '48000000';
  els.laborFloor.value = '32000000';
  els.subcontract.value = '70000000';
  els.ctype.value = 'architectural_general';
  els.tokutei.checked = true;
  els.monthOt.value = '45';
  els.avgOt.value = '38';
  els.contract.value = GOOD_CONTRACT_SAMPLE;
  renderAudit();
});

els.btnAudit.addEventListener('click', renderAudit);
els.btnCopyMd.addEventListener('click', async () => {
  await navigator.clipboard.writeText(latestMarkdown);
  els.btnCopyMd.textContent = 'コピー完了';
  setTimeout(() => {
    els.btnCopyMd.textContent = 'Markdownをコピー';
  }, 1500);
});
els.btnDownloadMd.addEventListener('click', () => {
  const blob = new Blob([latestMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kensetsugate-compliance-certificate.md';
  a.click();
  URL.revokeObjectURL(url);
});

els.contract.value = BAD_CONTRACT_SAMPLE;
renderAudit();
