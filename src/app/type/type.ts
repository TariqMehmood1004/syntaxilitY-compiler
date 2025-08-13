export type Language = "python" | "javascript" | "csharp" | "plaintext" | "typescript";

export type FileType = {
  id: string;           // unique id for stable keys & editing
  filename: string;
  content?: string;
  language?: Language;  // only for files
  isFolder?: boolean;   // distinguish folders vs files
  children?: FileType[]; // for folders, recursive children
};