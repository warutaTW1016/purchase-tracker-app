(function () {
  const calc = window.PurchaseTrackerCalc;

  function renderDrawer(els, appState) {
    const group = appState.getActiveGroup();
    const item = group?.items.find(entry => entry.id === appState.state.drawerItemId);
    els.itemDrawer.hidden = !item;
    els.drawerBackdrop.hidden = !item;

    if (!group || !item) {
      els.itemDrawer.innerHTML = "";
      return;
    }

    const metrics = calc.getItemMetrics(group, item);
    els.itemDrawer.innerHTML = `
      <div class="drawer-head">
        <div>
          <p class="eyebrow">Item Detail</p>
          <h3>${calc.escapeHtml(item.name)}</h3>
        </div>
        <button type="button" class="icon-action" data-action="close-drawer" aria-label="關閉商品詳情">×</button>
      </div>
      <div class="drawer-section">
        <dl class="detail-grid">
          <div><dt>訂單筆數</dt><dd>${item.orders}</dd></div>
          <div><dt>訂購數量</dt><dd>${item.quantity}</dd></div>
          <div><dt>訂單單價</dt><dd>${calc.formatMoney(item.unitPrice)}</dd></div>
          <div><dt>待代購</dt><dd>${metrics.remainingQty}</dd></div>
        </dl>
      </div>
      <div class="drawer-section">
        <label>
          <span>日幣原價</span>
          <input type="number" inputmode="numeric" min="0" step="1" value="${calc.escapeHtml(metrics.override.yenPrice || "")}" data-field="yenPrice" data-id="${item.id}">
        </label>
        <label>
          <span>已代購數量</span>
          <input type="number" inputmode="numeric" min="0" max="${item.quantity}" step="1" value="${calc.escapeHtml(metrics.override.purchasedQty || "")}" data-field="purchasedQty" data-id="${item.id}">
        </label>
      </div>
      <div class="drawer-section">
        <dl class="detail-grid">
          <div><dt>成本單價</dt><dd>${metrics.missingCost ? "-" : calc.formatMoney(metrics.costUnit)}</dd></div>
          <div><dt>單件利潤</dt><dd class="${metrics.profitUnit >= 0 ? "profit-text" : "loss-text"}">${metrics.missingCost ? "-" : calc.formatMoney(metrics.profitUnit)}</dd></div>
          <div><dt>總利潤</dt><dd class="${metrics.profit >= 0 ? "profit-text" : "loss-text"}">${metrics.missingCost ? "-" : calc.formatMoney(metrics.profit)}</dd></div>
          <div><dt>利潤率</dt><dd>${metrics.missingCost ? "-" : calc.formatPercent(metrics.marginRate)}</dd></div>
        </dl>
      </div>
      <div class="drawer-actions">
        <button type="button" class="secondary-action" data-action="backfill" data-id="${item.id}">用報價匯率回推日幣</button>
        <button type="button" class="primary-action" data-action="mark-done" data-id="${item.id}">標記全數已買</button>
      </div>
    `;
  }

  window.PurchaseTrackerRenderDrawer = { renderDrawer };
})();
