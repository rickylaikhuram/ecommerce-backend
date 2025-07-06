export const sanitizeFileName = (originalName: string): string => {
  const trimmed = originalName.trim().toLowerCase();

  // Split name and extension
  const dotIndex = trimmed.lastIndexOf(".");
  const namePart = trimmed.substring(0, dotIndex);
  const extension = trimmed.substring(dotIndex + 1);

  // Replace spaces and invalid characters in the name part
  const safeName = namePart
    .replace(/\s+/g, "-")               // spaces → dashes
    .replace(/[^a-z0-9\-]/g, "")        // remove all but a-z, 0-9, dash
    .replace(/-+/g, "-");               // collapse multiple dashes

  return `${safeName}.${extension}`;
};
