(function () {
  function toNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    return Number(String(value).replace(/,/g, "")) || 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getOverride(group, id) {
    if (!group.overrides) group.overrides = {};
    if (!group.overrides[id]) {
      group.overrides[id] = { yenPrice: "", purchasedQty: "" };
    }
    return group.overrides[id];
  }

  function getItemMetrics(group, item) {
    const override = getOverride(group, item.id);
    const yenPrice = toNumber(override.yenPrice);
    const purchasedQty = clamp(toNumber(override.purchasedQty), 0, item.quantity);
    const quoteRate = toNumber(group.quoteRate);
    const costRate = toNumber(group.costRate);
    const remainingQty = Math.max(item.quantity - purchasedQty, 0);
    const revenue = item.unitPrice * item.quantity;
    const costUnit = yenPrice * costRate;
    const cost = costUnit * item.quantity;
    const profitUnit = item.unitPrice - costUnit;
    const profit = revenue - cost;
    const marginRate = revenue ? profit / revenue : 0;
    const missingCost = !yenPrice || !costRate;
    const isDone = item.quantity > 0 && purchasedQty >= item.quantity;
    const isLoss = !missingCost && profitUnit <= 0;

    return {
      override,
      yenPrice,
      purchasedQty,
      quoteRate,
      costRate,
      remainingQty,
      revenue,
      costUnit,
      cost,
      profitUnit,
      profit,
      marginRate,
      missingCost,
      isDone,
      isLoss
    };
  }

  function getGroupSummary(group) {
    if (!group) {
      return {
        items: 0,
        qty: 0,
        purchased: 0,
        remaining: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        marginRate: 0,
        missingCost: 0,
        loss: 0
      };
    }

    const summary = group.items.reduce((acc, item) => {
      const metrics = getItemMetrics(group, item);
      acc.qty += item.quantity;
      acc.purchased += metrics.purchasedQty;
      acc.remaining += metrics.remainingQty;
      acc.revenue += metrics.revenue;
      acc.cost += metrics.cost;
      acc.profit += metrics.profit;
      if (metrics.missingCost) acc.missingCost += 1;
      if (metrics.isLoss) acc.loss += 1;
      return acc;
    }, {
      items: group.items.length,
      qty: 0,
      purchased: 0,
      remaining: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      marginRate: 0,
      missingCost: 0,
      loss: 0
    });

    summary.marginRate = summary.revenue ? summary.profit / summary.revenue : 0;
    return summary;
  }

  function getGroupStatus(group) {
    const summary = getGroupSummary(group);
    if (!group.quoteRate || !group.costRate || summary.missingCost) return "attention";
    if (summary.remaining > 0) return "active";
    return "done";
  }

  function formatMoney(value) {
    return `$${Math.round(value).toLocaleString("zh-TW")}`;
  }

  function formatPercent(value) {
    return `${Math.round(value * 1000) / 10}%`;
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function makeId(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return `item-${Math.abs(hash)}`;
  }

  window.PurchaseTrackerCalc = {
    clamp,
    escapeHtml,
    formatDate,
    formatMoney,
    formatPercent,
    getGroupStatus,
    getGroupSummary,
    getItemMetrics,
    getOverride,
    makeId,
    toNumber
  };
})();
