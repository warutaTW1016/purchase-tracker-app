(function () {
  const calc = window.PurchaseTrackerCalc;

  function renderGroups(els, appState) {
    const { state } = appState;
    const keyword = state.groupSearch.trim().toLowerCase();
    const groups = state.groups.filter(group => {
      const status = calc.getGroupStatus(group);
      const matchKeyword = !keyword || group.name.toLowerCase().includes(keyword);
      const matchStatus = state.groupFilter === "all" || status === state.groupFilter || (state.groupFilter === "attention" && status === "attention");
      return matchKeyword && matchStatus;
    });

    els.groupCount.textContent = `${state.groups.length} 團`;
    els.groupList.innerHTML = "";

    if (!groups.length) {
      els.groupList.innerHTML = `<p class="empty-copy">沒有符合條件的代購團。</p>`;
      return;
    }

    groups.forEach(group => {
      const summary = calc.getGroupSummary(group);
      const status = calc.getGroupStatus(group);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `group-card ${group.id === state.activeGroupId ? "active" : ""}`;
      button.dataset.groupId = group.id;
      if (group.id === state.activeGroupId) button.setAttribute("aria-current", "true");
      button.innerHTML = `
        <span class="status-dot ${status}"></span>
        <strong>${calc.escapeHtml(group.name)}</strong>
        <span>${summary.items} 項商品 · 待買 ${summary.remaining}</span>
        <span class="group-profit">${calc.formatMoney(summary.profit)}</span>
      `;
      els.groupList.append(button);
    });
  }

  window.PurchaseTrackerRenderGroups = { renderGroups };
})();
