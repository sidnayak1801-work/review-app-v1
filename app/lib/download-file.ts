export function downloadTextFile(input: {
  filename: string;
  content: string;
  mimeType?: string;
}): void {
  const blob = new Blob([input.content], {
    type: input.mimeType ?? "text/csv;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = input.filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadAuthenticatedFile(input: {
  url: string;
  filename: string;
  getSessionToken: () => Promise<string>;
}): Promise<void> {
  const token = await input.getSessionToken();
  const response = await fetch(input.url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Download failed. Please try again.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = input.filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
