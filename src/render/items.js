(function () {
  const calc = window.PurchaseTrackerCalc;

  function getFilteredItems(group, filter) {
    if (!group) return [];
    const addedIds = new Set(group.importSummary?.addedIds || []);
    return group.items.filter(item => {
      const metrics = calc.getItemMetrics(group, item);
      if (filter === "pending") return metrics.remainingQty > 0;
      if (filter === "done") return metrics.isDone;
      if (filter === "missing-cost") return metrics.missingCost;
      if (filter === "loss") return metrics.isLoss || (!metrics.missingCost && metrics.marginRate < 0.08);
      if (filter === "new") return addedIds.has(item.id);
      return true;
    });
  }

  function renderItems(els, appState) {
    const group = appState.getActiveGroup();
    els.itemsBody.innerHTML = "";
    els.mobileItems.innerHTML = "";
    if (!group) return;

    const items = getFilteredItems(group, appState.state.itemFilter);
    els.itemsHint.textContent = `目前顯示 ${items.length} / ${group.items.length} 項商品。`;

    if (!items.length) {
      els.itemsBody.innerHTML = `<tr><td colspan="11">沒有符合條件的商品。</td></tr>`;
      els.mobileItems.innerHTML = `<p class="empty-copy">沒有符合條件的商品。</p>`;
      return;
    }

    items.forEach(item => {
      renderTableRow(els.itemsBody, group, item);
      renderMobileCard(els.mobileItems, group, item);
    });
  }

  function renderTableRow(container, group, item) {
    const metrics = calc.getItemMetrics(group, item);
    const status = getStatusLabel(metrics);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="name-cell">
        ${calc.escapeHtml(item.name)}
        <span>${item.orders} 筆訂單</span>
      </td>
      <td><span class="item-status ${status.className}">${status.label}</span></td>
      <td>${item.quantity}</td>
      <td>
        <input class="number-input" type="number" inputmode="numeric" min="0" max="${item.quantity}" step="1"
          value="${calc.escapeHtml(metrics.override.purchasedQty || "")}" aria-label="${calc.escapeHtml(item.name)}已代購數量"
          data-field="purchasedQty" data-id="${item.id}">
      </td>
      <td>${metrics.remainingQty}</td>
      <td>${calc.formatMoney(item.unitPrice)}</td>
      <td>
        <input class="number-input" type="number" inputmode="numeric" min="0" step="1"
          value="${calc.escapeHtml(metrics.override.yenPrice || "")}" aria-label="${calc.escapeHtml(item.name)}日幣原價"
          data-field="yenPrice" data-id="${item.id}">
      </td>
      <td>${metrics.missingCost ? "-" : calc.formatMoney(metrics.costUnit)}</td>
      <td class="${metrics.profitUnit >= 0 ? "profit-text" : "loss-text"}">${metrics.missingCost ? "-" : calc.formatMoney(metrics.profitUnit)}</td>
      <td class="${metrics.profit >= 0 ? "profit-text" : "loss-text"}">${metrics.missingCost ? "-" : calc.formatMoney(metrics.profit)}</td>
      <td class="row-actions">
        <button type="button" class="small-action" data-action="backfill" data-id="${item.id}">回推</button>
        <button type="button" class="small-action" data-action="open-drawer" data-id="${item.id}">詳情</button>
      </td>
    `;
    container.append(row);
  }

  function renderMobileCard(container, group, item) {
    const metrics = calc.getItemMetrics(group, item);
    const status = getStatusLabel(metrics);
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-card-head">
        <div>
          <h4>${calc.escapeHtml(item.name)}</h4>
          <p>${item.orders} 筆訂單 · 訂購 ${item.quantity}</p>
        </div>
        <span class="item-status ${status.className}">${status.label}</span>
      </div>
      <dl>
        <div><dt>已買</dt><dd>${metrics.purchasedQty}</dd></div>
        <div><dt>待買</dt><dd>${metrics.remainingQty}</dd></div>
        <div><dt>總利潤</dt><dd class="${metrics.profit >= 0 ? "profit-text" : "loss-text"}">${metrics.missingCost ? "-" : calc.formatMoney(metrics.profit)}</dd></div>
      </dl>
      <div class="mobile-actions">
        <button type="button" class="small-action" data-action="mark-done" data-id="${item.id}">全數已買</button>
        <button type="button" class="small-action" data-action="open-drawer" data-id="${item.id}">編輯詳情</button>
      </div>
    `;
    container.append(card);
  }

  function getStatusLabel(metrics) {
    if (metrics.missingCost) return { label: "缺成本", className: "attention" };
    if (metrics.isLoss || metrics.marginRate < 0.08) return { label: "低利潤", className: "loss" };
    if (metrics.isDone) return { label: "已完成", className: "done" };
    return { label: "待代購", className: "active" };
  }

  window.PurchaseTrackerRenderItems = { getFilteredItems, renderItems };
})();
