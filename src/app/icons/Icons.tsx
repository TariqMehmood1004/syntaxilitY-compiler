// icons.tsx
import { SiPython, SiJavascript, SiSharp, SiTypescript } from "react-icons/si";
import { IconType } from "react-icons";

export type Language = "python" | "javascript" | "csharp" | "plaintext" | "typescript";

export const languageIcons: Record<Language, IconType> = {
  python: SiPython,
  javascript: SiJavascript,
  csharp: SiSharp,
  plaintext: SiJavascript, // could replace with a generic file icon
  typescript: SiTypescript
};
