(function () {
  const SHEET_NAME = "非訂單匯入";

  async function readOrderItems(file) {
    const buffer = await file.arrayBuffer();
    const workbook = await readXlsx(buffer);
    const rows = workbook[SHEET_NAME];

    if (!rows) {
      throw new Error(`找不到「${SHEET_NAME}」工作表。`);
    }

    const items = buildItems(rows);
    if (!items.length) {
      throw new Error("找不到可匯入的商品資料，請確認 Excel 欄位格式。");
    }

    return items;
  }

  function buildItems(rows) {
    const { makeId, toNumber } = window.PurchaseTrackerCalc;
    const headerRowIndex = rows.findIndex(row => row.some(cell => normalizeHeader(cell) === "商品名稱(品名/規格)"));
    if (headerRowIndex < 0) return [];

    const headers = rows[headerRowIndex].map(normalizeHeader);
    const nameIndex = headers.indexOf("商品名稱(品名/規格)");
    const priceIndex = headers.indexOf("單價");
    const qtyIndex = headers.indexOf("數量");
    const orderIndex = headers.indexOf("訂單編號");

    if ([nameIndex, priceIndex, qtyIndex, orderIndex].some(index => index < 0)) return [];

    const map = new Map();
    rows.slice(headerRowIndex + 1).forEach(row => {
      const name = String(row[nameIndex] || "").trim();
      if (!name) return;

      const price = toNumber(row[priceIndex]);
      const qty = toNumber(row[qtyIndex]);
      const orderNo = String(row[orderIndex] || "").trim();

      if (!map.has(name)) {
        map.set(name, {
          id: makeId(name),
          name,
          unitPrice: price,
          quantity: 0,
          orders: new Set()
        });
      }

      const item = map.get(name);
      item.quantity += qty;
      item.unitPrice = price || item.unitPrice;
      if (orderNo) item.orders.add(orderNo);
    });

    return Array.from(map.values())
      .map(item => ({ ...item, orders: item.orders.size }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }

  async function readXlsx(buffer) {
    const entries = await unzip(buffer);
    const workbookXml = textEntry(entries, "xl/workbook.xml");
    const workbookRelsXml = textEntry(entries, "xl/_rels/workbook.xml.rels");
    const sharedStringsXml = entries.has("xl/sharedStrings.xml") ? textEntry(entries, "xl/sharedStrings.xml") : "";
    const parser = new DOMParser();
    const workbook = parser.parseFromString(workbookXml, "application/xml");
    const rels = parser.parseFromString(workbookRelsXml, "application/xml");
    const sharedStrings = parseSharedStrings(parser, sharedStringsXml);
    const relMap = new Map(Array.from(rels.getElementsByTagName("Relationship")).map(rel => [rel.getAttribute("Id"), rel.getAttribute("Target")]));
    const sheets = {};

    Array.from(workbook.getElementsByTagName("sheet")).forEach(sheet => {
      const name = sheet.getAttribute("name");
      const relId = sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const target = relMap.get(relId);
      if (!name || !target) return;
      const sheetPath = normalizeZipPath(`xl/${target}`);
      if (!entries.has(sheetPath)) return;
      sheets[name] = parseSheet(parser, textEntry(entries, sheetPath), sharedStrings);
    });

    return sheets;
  }

  async function unzip(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const eocdOffset = findEndOfCentralDirectory(bytes);
    const centralDirSize = view.getUint32(eocdOffset + 12, true);
    const centralDirOffset = view.getUint32(eocdOffset + 16, true);
    const entries = new Map();
    let offset = centralDirOffset;
    const end = centralDirOffset + centralDirSize;

    while (offset < end) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const fileNameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);
      const name = decodeBytes(bytes.slice(offset + 46, offset + 46 + fileNameLength));
      const localNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);

      entries.set(normalizeZipPath(name), await inflateEntry(compressed, method));
      offset += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
  }

  function findEndOfCentralDirectory(bytes) {
    for (let i = bytes.length - 22; i >= 0; i -= 1) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        return i;
      }
    }
    throw new Error("Invalid XLSX zip.");
  }

  async function inflateEntry(bytes, method) {
    if (method === 0) return bytes;
    if (method !== 8) throw new Error(`Unsupported zip method: ${method}`);
    if (!("DecompressionStream" in window)) {
      throw new Error("此瀏覽器不支援直接解析 .xlsx，請改用新版 Chrome 或 Edge。");
    }

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function parseSharedStrings(parser, xml) {
    if (!xml) return [];
    const doc = parser.parseFromString(xml, "application/xml");
    return Array.from(doc.getElementsByTagName("si")).map(si => {
      return Array.from(si.getElementsByTagName("t")).map(node => node.textContent || "").join("");
    });
  }

  function parseSheet(parser, xml, sharedStrings) {
    const doc = parser.parseFromString(xml, "application/xml");
    const rows = [];
    Array.from(doc.getElementsByTagName("row")).forEach(rowNode => {
      const row = [];
      Array.from(rowNode.getElementsByTagName("c")).forEach(cell => {
        const ref = cell.getAttribute("r") || "";
        const columnIndex = columnNameToIndex(ref.replace(/\d+/g, ""));
        row[columnIndex] = parseCell(cell, sharedStrings);
      });
      rows.push(row.map(value => value ?? ""));
    });
    return rows;
  }

  function parseCell(cell, sharedStrings) {
    const type = cell.getAttribute("t");
    if (type === "inlineStr") {
      return Array.from(cell.getElementsByTagName("t")).map(node => node.textContent || "").join("");
    }

    const valueNode = cell.getElementsByTagName("v")[0];
    if (!valueNode) return "";
    const value = valueNode.textContent || "";
    if (type === "s") return sharedStrings[Number(value)] || "";
    return value;
  }

  function columnNameToIndex(name) {
    let index = 0;
    for (let i = 0; i < name.length; i += 1) {
      index = index * 26 + name.charCodeAt(i) - 64;
    }
    return Math.max(index - 1, 0);
  }

  function normalizeHeader(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  function normalizeZipPath(path) {
    const parts = [];
    path.split("/").forEach(part => {
      if (!part || part === ".") return;
      if (part === "..") parts.pop();
      else parts.push(part);
    });
    return parts.join("/");
  }

  function textEntry(entries, path) {
    return new TextDecoder("utf-8").decode(entries.get(normalizeZipPath(path)));
  }

  function decodeBytes(bytes) {
    return new TextDecoder("utf-8").decode(bytes);
  }

  window.PurchaseTrackerXlsx = { readOrderItems };
})();
