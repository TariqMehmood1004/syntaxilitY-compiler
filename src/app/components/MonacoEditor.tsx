import React, { useRef, useEffect, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { FileType } from "../type/type";

function MonacoEditorIDE({
  activeFile,
  activeFileIndex,
  updateFileContent,
}: {
  activeFile: FileType;
  activeFileIndex: number;
  updateFileContent: (index: number, newContent: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(14);

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();

      const delta = Math.sign(e.deltaY);
      setFontSize((size) => {
        let newSize = size - delta;
        if (newSize < 8) newSize = 8;
        if (newSize > 40) newSize = 40;
        return newSize;
      });
    }
  };

  useEffect(() => {
    const current = editorRef.current;
    if (current) {
      current.addEventListener("wheel", handleWheel, { passive: false });
      return () => current.removeEventListener("wheel", handleWheel);
    }
  }, []);

  return (
    <div className="flex-1" ref={editorRef} style={{ height: "100%" }}>
      <MonacoEditor
        height="100%"
        theme="vs-dark"
        language={activeFile.language === "plaintext" ? "plaintext" : activeFile.language}
        value={activeFile.content}
        onChange={(value) => updateFileContent(activeFileIndex, value || "")}
        options={{ minimap: { enabled: false }, fontSize }}
      />
    </div>
  );
}

export default MonacoEditorIDE;
