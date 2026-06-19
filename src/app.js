(function () {
  const appState = window.PurchaseTrackerState;
  const calc = window.PurchaseTrackerCalc;
  const storage = window.PurchaseTrackerStorage;
  const xlsx = window.PurchaseTrackerXlsx;
  const renderGroups = window.PurchaseTrackerRenderGroups.renderGroups;
  const renderDashboard = window.PurchaseTrackerRenderDashboard.renderDashboard;
  const renderItems = window.PurchaseTrackerRenderItems.renderItems;
  const renderDrawer = window.PurchaseTrackerRenderDrawer.renderDrawer;

  const els = {
    activeWorkbench: document.querySelector("#activeWorkbench"),
    backfillAllButton: document.querySelector("#backfillAllButton"),
    backupButton: document.querySelector("#backupButton"),
    costRate: document.querySelector("#costRate"),
    drawerBackdrop: document.querySelector("#drawerBackdrop"),
    emptyNewGroupButton: document.querySelector("#emptyNewGroupButton"),
    emptyState: document.querySelector("#emptyState"),
    exportGroupButton: document.querySelector("#exportGroupButton"),
    fileInput: document.querySelector("#fileInput"),
    groupCount: document.querySelector("#groupCount"),
    groupList: document.querySelector("#groupList"),
    groupMeta: document.querySelector("#groupMeta"),
    groupNameInput: document.querySelector("#groupNameInput"),
    groupSearchInput: document.querySelector("#groupSearchInput"),
    importSummary: document.querySelector("#importSummary"),
    installButton: document.querySelector("#installButton"),
    itemDrawer: document.querySelector("#itemDrawer"),
    itemsBody: document.querySelector("#itemsBody"),
    itemsHint: document.querySelector("#itemsHint"),
    mobileItems: document.querySelector("#mobileItems"),
    newGroupButton: document.querySelector("#newGroupButton"),
    quoteRate: document.querySelector("#quoteRate"),
    resetButton: document.querySelector("#resetButton"),
    saveStatus: document.querySelector("#saveStatus"),
    summaryGrid: document.querySelector("#summaryGrid"),
    updateGroupButton: document.querySelector("#updateGroupButton")
  };

  appState.init();
  bindEvents();
  registerPwa();
  render();

  function bindEvents() {
    els.newGroupButton.addEventListener("click", () => openImporter("new"));
    els.emptyNewGroupButton.addEventListener("click", () => openImporter("new"));
    els.updateGroupButton.addEventListener("click", () => openImporter("update"));
    els.fileInput.addEventListener("change", handleFile);
    els.backfillAllButton.addEventListener("click", backfillAllYenPrices);
    els.backupButton.addEventListener("click", () => storage.backup(appState.state));
    els.exportGroupButton.addEventListener("click", exportActiveGroup);
    els.resetButton.addEventListener("click", resetActiveGroupManualData);
    els.drawerBackdrop.addEventListener("click", () => {
      appState.state.drawerItemId = "";
      render();
    });
    els.groupSearchInput.addEventListener("input", event => {
      appState.state.groupSearch = event.target.value;
      render();
    });

    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);
  }

  function handleClick(event) {
    const groupButton = event.target.closest("[data-group-id]");
    if (groupButton) {
      appState.setActiveGroup(groupButton.dataset.groupId);
      render();
      return;
    }

    const groupFilter = event.target.closest("[data-group-filter]");
    if (groupFilter) {
      appState.state.groupFilter = groupFilter.dataset.groupFilter;
      updateActiveButtons("[data-group-filter]", appState.state.groupFilter);
      render();
      return;
    }

    const itemFilter = event.target.closest("[data-item-filter]");
    if (itemFilter) {
      appState.state.itemFilter = itemFilter.dataset.itemFilter;
      updateActiveButtons("[data-item-filter]", appState.state.itemFilter);
      render();
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      runAction(action.dataset.action, action.dataset.id);
    }
  }

  function handleInput(event) {
    const group = appState.getActiveGroup();
    if (!group) return;

    if (event.target === els.groupNameInput) {
      group.name = event.target.value;
      touchAndSave(group);
      renderGroups(els, appState);
      return;
    }

    if (event.target === els.quoteRate) {
      group.quoteRate = event.target.value;
      touchAndSave(group);
      window.PurchaseTrackerRenderDashboard.renderSummaryGrid(
        els.summaryGrid,
        calc.getGroupSummary(group)
      );
      renderItems(els, appState);
      renderDrawer(els, appState);
      return;
    }

    if (event.target === els.costRate) {
      group.costRate = event.target.value;
      touchAndSave(group);
      window.PurchaseTrackerRenderDashboard.renderSummaryGrid(
        els.summaryGrid,
        calc.getGroupSummary(group)
      );
      renderItems(els, appState);
      renderDrawer(els, appState);
      return;
    }

    if (event.target.matches("[data-field][data-id]")) {
      updateItemField(event.target);
      renderDashboard(els, appState);
    }
  }

  function handleChange(event) {
    if (event.target === els.groupNameInput) {
      const group = appState.getActiveGroup();
      if (!group) return;
      group.name = event.target.value.trim() || group.sourceFile?.replace(/\.[^.]+$/, "") || "未命名代購團";
      touchAndSave(group);
      render();
      return;
    }

    if (event.target.matches("[data-field][data-id]")) {
      render();
    }
  }

  function runAction(action, id) {
    const group = appState.getActiveGroup();
    if (action === "close-drawer") {
      appState.state.drawerItemId = "";
      render();
      return;
    }
    if (!group) return;

    const item = group.items.find(entry => entry.id === id);
    if (!item) return;

    if (action === "open-drawer") {
      appState.state.drawerItemId = id;
      render();
      return;
    }

    if (action === "backfill") {
      const quoteRate = calc.toNumber(group.quoteRate);
      if (!quoteRate) {
        alert("請先輸入對客報價匯率。");
        return;
      }
      calc.getOverride(group, id).yenPrice = Math.round(item.unitPrice / quoteRate).toString();
      touchAndSave(group);
      render();
      return;
    }

    if (action === "mark-done") {
      calc.getOverride(group, id).purchasedQty = item.quantity.toString();
      touchAndSave(group);
      render();
    }
  }

  function updateItemField(input) {
    const group = appState.getActiveGroup();
    if (!group) return;
    const override = calc.getOverride(group, input.dataset.id);
    override[input.dataset.field] = input.value;
    touchAndSave(group);
  }

  function touchAndSave(group) {
    group.updatedAt = new Date().toISOString();
    appState.save();
    els.saveStatus.textContent = "本機已保存";
  }

  function updateActiveButtons(selector, value) {
    document.querySelectorAll(selector).forEach(button => {
      button.classList.toggle("active", button.dataset.groupFilter === value || button.dataset.itemFilter === value);
    });
  }

  function openImporter(mode) {
    if (mode === "update" && !appState.getActiveGroup()) return;
    appState.state.pendingImportMode = mode;
    els.fileInput.value = "";
    els.fileInput.click();
  }

  function resetActiveGroupManualData() {
    const group = appState.getActiveGroup();
    if (!group) return;
    if (!confirm("確定要清除此團的匯率、日幣原價與已代購數量嗎？")) return;
    group.quoteRate = "";
    group.costRate = "";
    group.overrides = {};
    touchAndSave(group);
    render();
  }

  function backfillAllYenPrices() {
    const group = appState.getActiveGroup();
    if (!group) return;

    const quoteRate = calc.toNumber(group.quoteRate);
    if (!quoteRate) {
      alert("請先輸入對客報價匯率。");
      return;
    }

    const changed = group.items.reduce((count, item) => {
      const override = calc.getOverride(group, item.id);
      if (override.yenPrice) return count;
      override.yenPrice = Math.round(item.unitPrice / quoteRate).toString();
      return count + 1;
    }, 0);

    touchAndSave(group);
    render();
    els.saveStatus.textContent = changed
      ? `已回推 ${changed} 項商品日幣原價`
      : "所有商品都已設定日幣原價";
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      els.saveStatus.textContent = "正在讀取 Excel";
      const items = await xlsx.readOrderItems(file);
      if (appState.state.pendingImportMode === "update") {
        appState.updateActiveGroup(file, items);
      } else {
        appState.createGroup(file, items);
      }
      els.saveStatus.textContent = "匯入完成並已保存";
      render();
    } catch (error) {
      console.error(error);
      els.saveStatus.textContent = error.message || "匯入失敗";
      alert(error.message || "匯入失敗，請確認檔案格式。");
    }
  }

  function exportActiveGroup() {
    const group = appState.getActiveGroup();
    if (!group) return;
    const rows = group.items.map(item => {
      const metrics = calc.getItemMetrics(group, item);
      return {
        商品名稱: item.name,
        訂單單價: item.unitPrice,
        訂購數量: item.quantity,
        已代購: metrics.purchasedQty,
        尚未代購: metrics.remainingQty,
        日幣原價: metrics.yenPrice,
        成本單價: Math.round(metrics.costUnit),
        單件利潤: Math.round(metrics.profitUnit),
        總利潤: Math.round(metrics.profit)
      };
    });
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${group.name}-purchase-list.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function render() {
    updateActiveButtons("[data-group-filter]", appState.state.groupFilter);
    updateActiveButtons("[data-item-filter]", appState.state.itemFilter);
    renderGroups(els, appState);
    renderDashboard(els, appState);
    renderItems(els, appState);
    renderDrawer(els, appState);
  }

  function registerPwa() {
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      appState.state.deferredInstallPrompt = event;
      els.installButton.hidden = false;
    });

    els.installButton.addEventListener("click", async () => {
      const prompt = appState.state.deferredInstallPrompt;
      if (!prompt) return;
      prompt.prompt();
      await prompt.userChoice;
      appState.state.deferredInstallPrompt = null;
      els.installButton.hidden = true;
    });

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        els.saveStatus.textContent = "本機保存中；離線快取未啟用";
      });
    }
  }
})();
