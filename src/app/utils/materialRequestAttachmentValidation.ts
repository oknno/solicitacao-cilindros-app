export const MATERIAL_REQUEST_ATTACHMENT_ACCEPT = ".pdf,.xlsx,.xls,.tif,.tiff";
export const MATERIAL_REQUEST_ATTACHMENT_ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".tif", ".tiff"] as const;
export const MATERIAL_REQUEST_ATTACHMENT_ALLOWED_FORMATS_LABEL = "PDF, Excel ou TIF/TIFF";

export interface ValidateMaterialRequestAttachmentFileOptions {
  maxFileSizeBytes?: number;
}

export function isAllowedMaterialRequestAttachmentFileType(fileName: string): boolean {
  const lowerName = fileName.trim().toLowerCase();
  return MATERIAL_REQUEST_ATTACHMENT_ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export function validateMaterialRequestAttachmentFile(
  file: File,
  options: ValidateMaterialRequestAttachmentFileOptions = {},
): string | null {
  if (!isAllowedMaterialRequestAttachmentFileType(file.name)) {
    return `Formato inválido em “${file.name}”. Anexe arquivos ${MATERIAL_REQUEST_ATTACHMENT_ALLOWED_FORMATS_LABEL}.`;
  }

  if (options.maxFileSizeBytes !== undefined && file.size > options.maxFileSizeBytes) {
    return `O arquivo “${file.name}” deve ter no máximo 10 MB.`;
  }

  return null;
}
