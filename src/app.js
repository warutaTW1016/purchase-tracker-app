(function () {
  const appState = window.PurchaseTrackerState;
  const calc = window.PurchaseTrackerCalc;
  const storage = window.PurchaseTrackerStorage;
  const xlsx = window.PurchaseTrackerXlsx;
  const renderGroups = window.PurchaseTrackerRenderGroups.renderGroups;
  const renderDashboard = window.PurchaseTrackerRenderDashboard.renderDashboard;
  const renderItems = window.PurchaseTrackerRenderItems.renderItems;
  const renderDrawer = window.PurchaseTrackerRenderDrawer.renderDrawer;
  const APPEARANCE_KEY = "purchase-tracker-appearance-v1";
  const DEFAULT_WORKSPACE_NAME = "Purchase Workspace";
  const PREVIEW_MAX_WIDTH = 1600;
  const PREVIEW_MAX_HEIGHT = 1000;
  const COVER_OUTPUT_WIDTH = 1200;
  const COVER_OUTPUT_HEIGHT = 525;

  const els = {
    activeWorkbench: document.querySelector("#activeWorkbench"),
    applyCoverCrop: document.querySelector("#applyCoverCrop"),
    backfillAllButton: document.querySelector("#backfillAllButton"),
    backupButton: document.querySelector("#backupButton"),
    costRate: document.querySelector("#costRate"),
    coverInput: document.querySelector("#coverInput"),
    coverOverlay: document.querySelector("#coverOverlay"),
    coverOverlayValue: document.querySelector("#coverOverlayValue"),
    coverX: document.querySelector("#coverX"),
    coverXValue: document.querySelector("#coverXValue"),
    coverY: document.querySelector("#coverY"),
    coverYValue: document.querySelector("#coverYValue"),
    coverZoom: document.querySelector("#coverZoom"),
    coverZoomValue: document.querySelector("#coverZoomValue"),
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
    resetCover: document.querySelector("#resetCover"),
    saveStatus: document.querySelector("#saveStatus"),
    summaryGrid: document.querySelector("#summaryGrid"),
    updateGroupButton: document.querySelector("#updateGroupButton"),
    workspaceNameInput: document.querySelector("#workspaceNameInput")
  };
  const coverState = {
    image: null,
    source: ""
  };

  appState.init();
  initAppearance();
  bindEvents();
  setMobileTab("overview");
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
    els.coverInput.addEventListener("change", handleCoverFile);
    els.applyCoverCrop.addEventListener("click", cropCoverImage);
    els.resetCover.addEventListener("click", resetCoverImage);
    [els.coverZoom, els.coverX, els.coverY, els.coverOverlay].forEach(input => {
      input.addEventListener("input", () => {
        setCoverVars();
        saveAppearanceFromControls();
      });
    });

    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);
  }

  function handleClick(event) {
    const mobileTab = event.target.closest("[data-mobile-tab]");
    if (mobileTab) {
      setMobileTab(mobileTab.dataset.mobileTab);
      return;
    }

    const groupButton = event.target.closest("[data-group-id]");
    if (groupButton) {
      appState.setActiveGroup(groupButton.dataset.groupId);
      if (window.matchMedia("(max-width: 719px)").matches) {
        setMobileTab("overview");
      }
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
    if (event.target === els.workspaceNameInput) {
      setWorkspaceName(event.target.value);
      saveAppearanceFromControls();
      return;
    }

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

  function setMobileTab(tabName) {
    document.querySelectorAll("[data-mobile-tab]").forEach(button => {
      const active = button.dataset.mobileTab === tabName;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-mobile-panel]").forEach(panel => {
      panel.classList.toggle("mobile-panel-active", panel.dataset.mobilePanel === tabName);
    });
  }

  function loadAppearance() {
    try {
      return JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveAppearance(appearance) {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  }

  function initAppearance() {
    const appearance = {
      workspaceName: DEFAULT_WORKSPACE_NAME,
      coverImage: "",
      zoom: 100,
      x: 50,
      y: 50,
      overlay: 58,
      ...loadAppearance()
    };

    coverState.source = appearance.coverImage || "";
    if (coverState.source) {
      loadImage(coverState.source).then(image => {
        coverState.image = image;
      }).catch(() => {
        coverState.image = null;
      });
    }

    els.workspaceNameInput.value = appearance.workspaceName;
    els.coverZoom.value = appearance.zoom;
    els.coverX.value = appearance.x;
    els.coverY.value = appearance.y;
    els.coverOverlay.value = appearance.overlay;
    setWorkspaceName(appearance.workspaceName);
    setCoverImage(appearance.coverImage || "");
    setCoverVars();
  }

  function setWorkspaceName(value) {
    const name = value.trim() || DEFAULT_WORKSPACE_NAME;
    document.querySelectorAll("[data-workspace-name]").forEach(element => {
      element.textContent = name;
    });
  }

  function saveAppearanceFromControls(extra = {}) {
    saveAppearance({
      workspaceName: els.workspaceNameInput.value.trim() || DEFAULT_WORKSPACE_NAME,
      coverImage: coverState.source,
      zoom: Number(els.coverZoom.value),
      x: Number(els.coverX.value),
      y: Number(els.coverY.value),
      overlay: Number(els.coverOverlay.value),
      ...extra
    });
  }

  function setCoverVars() {
    const zoom = Number(els.coverZoom.value);
    const x = Number(els.coverX.value);
    const y = Number(els.coverY.value);
    const overlay = Number(els.coverOverlay.value);

    document.documentElement.style.setProperty("--topbar-size", `${zoom}% auto`);
    document.documentElement.style.setProperty("--topbar-position-x", `${x}%`);
    document.documentElement.style.setProperty("--topbar-position-y", `${y}%`);
    document.documentElement.style.setProperty("--topbar-overlay", (overlay / 100).toFixed(2));
    els.coverZoomValue.textContent = `${zoom}%`;
    els.coverXValue.textContent = `${x}%`;
    els.coverYValue.textContent = `${y}%`;
    els.coverOverlayValue.textContent = `${overlay}%`;
  }

  function setCoverImage(src) {
    document.documentElement.style.setProperty("--topbar-image", src ? `url("${src}")` : "none");
  }

  function canvasToJpeg(canvas, quality = 0.9) {
    return canvas.toDataURL("image/jpeg", quality);
  }

  function normalizeImage(image) {
    const scale = Math.min(
      1,
      PREVIEW_MAX_WIDTH / image.naturalWidth,
      PREVIEW_MAX_HEIGHT / image.naturalHeight
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasToJpeg(canvas);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", reject);
      image.src = src;
    });
  }

  async function handleCoverFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const source = await readFileAsDataUrl(file);
      const sourceImage = await loadImage(source);
      const normalizedSource = normalizeImage(sourceImage);
      const normalizedImage = await loadImage(normalizedSource);

      coverState.image = normalizedImage;
      coverState.source = normalizedSource;
      setCoverImage(normalizedSource);
      setCoverVars();
      saveAppearanceFromControls();
    } catch (error) {
      console.error(error);
      resetCoverImage();
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", reject);
      reader.readAsDataURL(file);
    });
  }

  function cropCoverImage() {
    if (!coverState.image) return;

    const zoom = Number(els.coverZoom.value) / 100;
    const xRatio = Number(els.coverX.value) / 100;
    const yRatio = Number(els.coverY.value) / 100;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const image = coverState.image;
    const scale = Math.max(COVER_OUTPUT_WIDTH / image.naturalWidth, COVER_OUTPUT_HEIGHT / image.naturalHeight) * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = (COVER_OUTPUT_WIDTH - drawWidth) * xRatio;
    const drawY = (COVER_OUTPUT_HEIGHT - drawHeight) * yRatio;

    canvas.width = COVER_OUTPUT_WIDTH;
    canvas.height = COVER_OUTPUT_HEIGHT;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    coverState.source = canvasToJpeg(canvas);
    loadImage(coverState.source).then(image => {
      coverState.image = image;
    });
    setCoverImage(coverState.source);
    els.coverZoom.value = "100";
    els.coverX.value = "50";
    els.coverY.value = "50";
    setCoverVars();
    saveAppearanceFromControls({ zoom: 100, x: 50, y: 50 });
  }

  function resetCoverImage() {
    coverState.image = null;
    coverState.source = "";
    els.coverInput.value = "";
    els.coverZoom.value = "100";
    els.coverX.value = "50";
    els.coverY.value = "50";
    els.coverOverlay.value = "58";
    setCoverImage("");
    setCoverVars();
    saveAppearanceFromControls({ coverImage: "" });
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
