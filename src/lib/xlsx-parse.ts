/** Lecture minimale d’un .xlsx (ZIP stored ou deflate-raw, 1re feuille). */

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Décompression ZIP indisponible dans ce navigateur.");
  }
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([ab]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function decodeUtf8(data: Uint8Array) {
  return new TextDecoder("utf-8").decode(data);
}

async function lireZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Fichier Excel invalide (ZIP).");
  const nb = u16(view, eocd + 10);
  const centralOffset = u32(view, eocd + 16);
  const files = new Map<string, Uint8Array>();
  let p = centralOffset;
  for (let n = 0; n < nb; n++) {
    if (u32(view, p) !== 0x02014b50) break;
    const method = u16(view, p + 10);
    const compSize = u32(view, p + 20);
    const nameLen = u16(view, p + 28);
    const extraLen = u16(view, p + 30);
    const commentLen = u16(view, p + 32);
    const localOff = u32(view, p + 42);
    const name = decodeUtf8(bytes.subarray(p + 46, p + 46 + nameLen)).replace(
      /\\/g,
      "/",
    );
    const localNameLen = u16(view, localOff + 26);
    const localExtraLen = u16(view, localOff + 28);
    const dataStart = localOff + 30 + localNameLen + localExtraLen;
    const compressed = bytes.subarray(dataStart, dataStart + compSize);
    let data: Uint8Array;
    if (method === 0) {
      data = compressed;
    } else if (method === 8) {
      data = await inflateRaw(compressed);
    } else {
      throw new Error(`Compression ZIP non supportée (${method}).`);
    }
    files.set(name, data);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function xmlUnescape(s: string) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function textesBaliseT(xml: string) {
  const out: string[] = [];
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push(xmlUnescape(m[1]));
  }
  return out.join("");
}

function sharedStrings(xml: string) {
  const items: string[] = [];
  const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    items.push(textesBaliseT(m[1]));
  }
  return items;
}

function colIndex(letters: string) {
  let n = 0;
  const s = letters.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

function parseSheet(xml: string, strings: string[]): string[][] {
  const rows = new Map<number, Map<number, string>>();
  const cellRe =
    /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(xml))) {
    const attrs = m[1] ?? m[3] ?? "";
    const inner = m[2] ?? "";
    const refM = /\br="([A-Z]+)(\d+)"/i.exec(attrs);
    if (!refM) continue;
    const c = colIndex(refM[1]);
    const r = Number(refM[2]) - 1;
    const typeM = /\bt="([^"]+)"/.exec(attrs);
    const type = typeM?.[1] ?? "";
    let value = "";
    if (type === "inlineStr" || type === "str") {
      value = textesBaliseT(inner);
    } else {
      const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/i.exec(inner);
      const raw = v ? xmlUnescape(v[1]) : "";
      if (type === "s") {
        const i = Number(raw);
        value = Number.isFinite(i) ? (strings[i] ?? "") : "";
      } else {
        value = raw;
      }
    }
    if (!rows.has(r)) rows.set(r, new Map());
    rows.get(r)!.set(c, value);
  }
  if (rows.size === 0) return [];
  const maxR = Math.max(...rows.keys());
  const grille: string[][] = [];
  for (let r = 0; r <= maxR; r++) {
    const cols = rows.get(r);
    if (!cols) {
      grille.push([]);
      continue;
    }
    const maxC = Math.max(...cols.keys());
    const ligne: string[] = [];
    for (let c = 0; c <= maxC; c++) ligne.push(cols.get(c) ?? "");
    grille.push(ligne);
  }
  return grille;
}

function premiereFeuille(files: Map<string, Uint8Array>) {
  const rels =
    files.get("xl/_rels/workbook.xml.rels") ??
    files.get("xl/_rels/workbook.xml.rels".toLowerCase());
  const workbook = files.get("xl/workbook.xml");
  let target = "xl/worksheets/sheet1.xml";
  if (workbook && rels) {
    const relXml = decodeUtf8(rels);
    const wbXml = decodeUtf8(workbook);
    const sheetM = /<sheet\b[^>]*\br:id="([^"]+)"/i.exec(wbXml);
    const rid = sheetM?.[1];
    if (rid) {
      const re = new RegExp(
        `<Relationship\\b[^>]*\\bId="${rid}"[^>]*\\bTarget="([^"]+)"`,
        "i",
      );
      const t = re.exec(relXml)?.[1];
      if (t) {
        target = t.startsWith("/")
          ? t.slice(1)
          : t.startsWith("xl/")
            ? t
            : `xl/${t.replace(/^\.\//, "")}`;
      }
    }
  }
  const data =
    files.get(target) ??
    files.get(target.replace(/\\/g, "/")) ??
    files.get("xl/worksheets/sheet1.xml");
  if (!data) throw new Error("Feuille Excel introuvable.");
  const sst = files.get("xl/sharedStrings.xml");
  const strings = sst ? sharedStrings(decodeUtf8(sst)) : [];
  return parseSheet(decodeUtf8(data), strings);
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const files = await lireZip(buffer);
  return premiereFeuille(files);
}
