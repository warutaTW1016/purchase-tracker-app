(function () {
  const CURRENT_KEY = "purchase-tracker-state-v3";
  const LEGACY_KEY = "purchase-tracker-state-v2";

  function normalizeSavedState(saved) {
    return {
      activeGroupId: saved?.activeGroupId || "",
      groups: Array.isArray(saved?.groups) ? saved.groups.map(group => ({
        ...group,
        importSummary: group.importSummary || null,
        overrides: group.overrides || {}
      })) : []
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(CURRENT_KEY) || localStorage.getItem(LEGACY_KEY) || "{}";
      return normalizeSavedState(JSON.parse(raw));
    } catch {
      return { activeGroupId: "", groups: [] };
    }
  }

  function save(state) {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(state));
  }

  function backup(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `purchase-tracker-backup-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  window.PurchaseTrackerStorage = { load, save, backup };
})();
