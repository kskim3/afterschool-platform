import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type VendorImportRow = {
  student: string;
  course: string;
  vendorGross: number;
  vendorSupport: number;
};

export type ReconciliationExportRow = {
  id: number;
  student: string;
  grade: string;
  courseTitle: string;
  courseSection: string;
  status: string;
  systemGross: number;
  systemSupport: number;
  finalAmount: number;
  vendorGross: number | null;
  vendorSupport: number | null;
  verificationStatus: string;
  issues: string[];
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function columnIndex(reference: string) {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseXml(text: string) {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("엑셀 XML을 읽지 못했습니다.");
  return document;
}

function parseXlsx(buffer: ArrayBuffer) {
  const archive = unzipSync(new Uint8Array(buffer), {
    filter: (file) => file.originalSize <= 20_000_000,
  });
  const sheetBytes = archive["xl/worksheets/sheet1.xml"];
  if (!sheetBytes) throw new Error("첫 번째 워크시트를 찾을 수 없습니다.");

  const sharedBytes = archive["xl/sharedStrings.xml"];
  const sharedStrings = sharedBytes
    ? Array.from(parseXml(strFromU8(sharedBytes)).getElementsByTagName("si")).map((item) =>
        Array.from(item.getElementsByTagName("t")).map((text) => text.textContent ?? "").join(""),
      )
    : [];

  const sheet = parseXml(strFromU8(sheetBytes));
  return Array.from(sheet.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const index = columnIndex(cell.getAttribute("r") ?? "A1");
      const type = cell.getAttribute("t");
      const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      const inline = Array.from(cell.getElementsByTagName("t")).map((item) => item.textContent ?? "").join("");
      values[index] = type === "s" ? sharedStrings[Number(raw)] ?? "" : type === "inlineStr" ? inline : raw;
    }
    return values.map((value) => String(value ?? "").trim());
  }).filter((row) => row.some(Boolean));
}

function normalized(value: string) {
  return value.replace(/[\s·_()\-]/g, "").toLowerCase();
}

function findColumn(headers: string[], aliases: string[]) {
  const candidates = aliases.map(normalized);
  return headers.findIndex((header) => candidates.includes(normalized(header)));
}

function amount(value: string | undefined) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function parseVendorWorkbook(buffer: ArrayBuffer, filename: string): VendorImportRow[] {
  const rows = filename.toLowerCase().endsWith(".csv")
    ? parseCsv(new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, ""))
    : parseXlsx(buffer);
  if (rows.length < 2) throw new Error("헤더와 한 건 이상의 자료가 필요합니다.");

  const headers = rows[0];
  const studentIndex = findColumn(headers, ["학생명", "학생", "성명"]);
  const courseIndex = findColumn(headers, ["강좌명", "강좌", "프로그램명", "프로그램"]);
  const grossIndex = findColumn(headers, ["총액", "수강료합계", "청구액", "업체총액", "업체수강료"]);
  const supportIndex = findColumn(headers, ["지원금", "지원금액", "자유수강권", "교육청지원금"]);
  const feeIndexes = [
    findColumn(headers, ["수강료"]),
    findColumn(headers, ["교재비"]),
    findColumn(headers, ["재료비"]),
    findColumn(headers, ["수용비", "운영비"]),
  ].filter((index) => index >= 0);

  if (studentIndex < 0 || courseIndex < 0 || (grossIndex < 0 && feeIndexes.length === 0)) {
    throw new Error("학생명·강좌명·금액 열을 찾지 못했습니다. 표의 첫 행 제목을 확인해 주세요.");
  }

  return rows.slice(1).map((row) => ({
    student: row[studentIndex]?.trim() ?? "",
    course: row[courseIndex]?.trim() ?? "",
    vendorGross: grossIndex >= 0 ? amount(row[grossIndex]) : feeIndexes.reduce((sum, index) => sum + amount(row[index]), 0),
    vendorSupport: supportIndex >= 0 ? amount(row[supportIndex]) : 0,
  })).filter((row) => row.student && row.course);
}

function xml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cellReference(column: number, row: number) {
  let letters = "";
  let value = column + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

function worksheet(rows: Array<Array<string | number | null>>, widths: number[]) {
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndexValue) => {
      const reference = cellReference(columnIndexValue, rowIndex);
      const header = rowIndex === 0;
      const numeric = typeof value === "number";
      const style = header ? 1 : numeric && columnIndexValue >= 5 ? 2 : 0;
      return numeric
        ? `<c r="${reference}" s="${style}"><v>${value}</v></c>`
        : `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="28" customHeight="1"' : ""}>${cells}</row>`;
  }).join("");
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const endReference = cellReference(Math.max(rows[0]?.length ?? 1, 1) - 1, Math.max(rows.length, 1) - 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${endReference}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columns}</cols><sheetData>${rowXml}</sheetData>
  <autoFilter ref="A1:${cellReference(Math.max(rows[0]?.length ?? 1, 1) - 1, 0)}"/>
</worksheet>`;
}

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}

export function downloadReconciliationWorkbook(schoolName: string, records: ReconciliationExportRow[]) {
  const registerRows: Array<Array<string | number | null>> = [
    ["신청번호", "학생명", "학년반", "강좌명", "신청상태", "시스템 총액", "지원금", "최종 부담액", "업체 총액", "업체 지원금", "검증결과", "확인사항"],
    ...records.map((record) => [
      record.id,
      record.student,
      record.grade,
      `${record.courseTitle} ${record.courseSection}`,
      record.status,
      record.systemGross,
      record.systemSupport,
      record.finalAmount,
      record.vendorGross,
      record.vendorSupport,
      record.verificationStatus,
      record.issues.join(", ") || "정상",
    ]),
  ];
  const issueCount = records.filter((record) => record.verificationStatus !== "검증완료").length;
  const summaryRows: Array<Array<string | number | null>> = [
    ["항목", "값", "설명"],
    ["학교", schoolName, "학교이름.xlsx의 서울 학교 기본정보 반영"],
    ["신청 건수", records.length, "취소 건 제외"],
    ["검증 완료", records.length - issueCount, "업체 총액·지원금과 시스템 원장 일치"],
    ["확인 필요", issueCount, "담당자 확인 후 확정"],
    ["총 교육비", records.reduce((sum, record) => sum + record.systemGross, 0), "수강료+교재비+재료비+수용비"],
    ["지원금 합계", records.reduce((sum, record) => sum + record.systemSupport, 0), "교육청 지원·감면"],
    ["최종 부담액", records.reduce((sum, record) => sum + record.finalAmount, 0), "총 교육비-지원금"],
  ];

  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>늘봄ON</Application></Properties>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${xml(schoolName)} 방과후학교 검증결과</dc:title><dc:creator>늘봄ON</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="수강원장" sheetId="1" r:id="rId1"/><sheet name="검증요약" sheetId="2" r:id="rId2"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0\"원\""/></numFmts><fonts count="2"><font><sz val="10"/><name val="맑은 고딕"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F5B64"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`),
    "xl/worksheets/sheet1.xml": strToU8(worksheet(registerRows, [11, 12, 10, 28, 13, 14, 14, 14, 14, 14, 13, 32])),
    "xl/worksheets/sheet2.xml": strToU8(worksheet(summaryRows, [18, 26, 44])),
  };

  const output = zipSync(files, { level: 6 });
  const blob = new Blob([output.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(schoolName)}_방과후학교_검증결과.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
