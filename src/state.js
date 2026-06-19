(function () {
  const storage = window.PurchaseTrackerStorage;

  const state = {
    activeGroupId: "",
    groups: [],
    groupFilter: "all",
    groupSearch: "",
    itemFilter: "all",
    drawerItemId: "",
    pendingImportMode: "new",
    deferredInstallPrompt: null
  };

  function init() {
    const saved = storage.load();
    state.activeGroupId = saved.activeGroupId;
    state.groups = saved.groups;
    ensureActiveGroup();
  }

  function save() {
    storage.save({
      activeGroupId: state.activeGroupId,
      groups: state.groups
    });
  }

  function ensureActiveGroup() {
    if (!state.groups.some(group => group.id === state.activeGroupId)) {
      state.activeGroupId = state.groups[0]?.id || "";
    }
  }

  function getActiveGroup() {
    return state.groups.find(group => group.id === state.activeGroupId) || null;
  }

  function createGroup(file, items) {
    const now = new Date().toISOString();
    const group = {
      id: `group-${Date.now()}`,
      name: file.name.replace(/\.[^.]+$/, ""),
      sourceFile: file.name,
      createdAt: now,
      updatedAt: now,
      quoteRate: "",
      costRate: "",
      items,
      overrides: {},
      importSummary: {
        added: items.length,
        updated: 0,
        removed: 0,
        kept: 0,
        addedIds: items.map(item => item.id),
        fileName: file.name
      }
    };

    state.groups.unshift(group);
    state.activeGroupId = group.id;
    state.drawerItemId = "";
    save();
    return group;
  }

  function updateActiveGroup(file, items) {
    const group = getActiveGroup();
    if (!group) return null;

    const oldById = new Map(group.items.map(item => [item.id, item]));
    const nextIds = new Set(items.map(item => item.id));
    const changed = items.reduce((acc, item) => {
      const old = oldById.get(item.id);
      if (!old) acc.added += 1;
      else if (old.quantity !== item.quantity || old.unitPrice !== item.unitPrice || old.orders !== item.orders) acc.updated += 1;
      return acc;
    }, { added: 0, updated: 0, removed: 0, kept: 0 });

    oldById.forEach((old, id) => {
      if (!nextIds.has(id)) changed.removed += 1;
      if (group.overrides?.[id]) changed.kept += 1;
    });

    group.items = items;
    group.sourceFile = file.name;
    group.updatedAt = new Date().toISOString();
    group.importSummary = {
      ...changed,
      addedIds: items.filter(item => !oldById.has(item.id)).map(item => item.id),
      fileName: file.name
    };
    save();
    return group;
  }

  function setActiveGroup(id) {
    state.activeGroupId = id;
    state.drawerItemId = "";
    state.itemFilter = "all";
    save();
  }

  window.PurchaseTrackerState = {
    createGroup,
    getActiveGroup,
    init,
    save,
    setActiveGroup,
    state,
    updateActiveGroup
  };
})();
