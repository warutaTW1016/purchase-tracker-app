(function () {
  const calc = window.PurchaseTrackerCalc;

  function renderDashboard(els, appState) {
    const group = appState.getActiveGroup();
    els.emptyState.hidden = Boolean(group);
    els.activeWorkbench.hidden = !group;

    if (!group) {
      els.saveStatus.textContent = "資料保存在此瀏覽器";
      return;
    }

    const summary = calc.getGroupSummary(group);
    els.saveStatus.textContent = `本機已保存 · ${group.items.length} 項商品`;
    if (document.activeElement !== els.groupNameInput) {
      els.groupNameInput.value = group.name;
    }
    els.groupMeta.textContent = `來源：${group.sourceFile || "-"} · 更新 ${calc.formatDate(group.updatedAt)}`;
    els.quoteRate.value = group.quoteRate || "";
    els.costRate.value = group.costRate || "";

    renderImportSummary(els.importSummary, group);
    renderSummaryGrid(els.summaryGrid, summary);
  }

  function renderImportSummary(container, group) {
    const summary = group.importSummary;
    if (!summary) {
      container.innerHTML = `<p>尚無本次匯入摘要。</p>`;
      return;
    }

    container.innerHTML = `
      <div>
        <span>本次匯入</span>
        <strong>${calc.escapeHtml(summary.fileName || group.sourceFile || "-")}</strong>
      </div>
      <div><span>新增</span><strong>${summary.added || 0}</strong></div>
      <div><span>變更</span><strong>${summary.updated || 0}</strong></div>
      <div><span>移除</span><strong>${summary.removed || 0}</strong></div>
      <div><span>保留設定</span><strong>${summary.kept || 0}</strong></div>
    `;
  }

  function renderSummaryGrid(container, summary) {
    const cards = [
      ["商品項目", summary.items, "neutral"],
      ["訂購總數", summary.qty, "revenue"],
      ["已代購", summary.purchased, "done"],
      ["尚未代購", summary.remaining, "attention"],
      ["缺日幣原價", summary.missingCost, "attention"],
      ["預估營收", calc.formatMoney(summary.revenue), "revenue"],
      ["預估成本", calc.formatMoney(summary.cost), "cost"],
      ["預估獲利", calc.formatMoney(summary.profit), summary.profit >= 0 ? "profit" : "loss"],
      ["利潤率", calc.formatPercent(summary.marginRate), summary.marginRate >= 0 ? "profit" : "loss"]
    ];

    container.innerHTML = cards.map(([label, value, tone]) => `
      <article class="summary-card ${tone}">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `).join("");
  }

  window.PurchaseTrackerRenderDashboard = { renderDashboard, renderSummaryGrid };
})();
