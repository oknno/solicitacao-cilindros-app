import * as XLSX from "xlsx";

export interface ExportExcelColumn<T> {
  header: string;
  getValue: (item: T) => string | number | null | undefined;
}

export function exportToExcel<T>(
  items: T[],
  columns: ExportExcelColumn<T>[],
  fileName: string,
  sheetName: string
): void {
  const rows = items.map((item) => columns.reduce<Record<string, string | number>>((acc, column) => {
    const value = column.getValue(item);
    acc[column.header] = value ?? "";
    return acc;
  }, {}));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
