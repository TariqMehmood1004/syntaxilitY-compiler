"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Play, Menu, X, Trash, Loader } from "lucide-react";
import { IconType } from "react-icons";
import { SiPython, SiJavascript, SiSharp, SiTypescript } from "react-icons/si";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export type Language = "python" | "javascript" | "csharp" | "plaintext" | "typescript";

export const languageIcons: Partial<Record<Language, IconType>> = {
  python: SiPython,
  javascript: SiJavascript,
  csharp: SiSharp,
  typescript: SiTypescript,
  plaintext: SiJavascript, // fallback icon, consider a generic file icon here
};

type FileType = {
  filename: string;
  content: string;
  language: Language;
};

type RunResult = {
  stdout: string;
  stderr: string;
  returncode: number;
  timed_out: boolean;
  error?: string;
};

const defaultFiles: FileType[] = [
  { filename: "main.py", content: "print('Hello from Python')", language: "python" },
  { filename: "main.js", content: "console.log('Hello from JS')", language: "javascript" },
];

// Mapping from file extension to language
const extToLang: Record<string, Language> = {
  ".py": "python",
  ".js": "javascript",
  ".ts": "typescript",
  ".cs": "csharp",
};

function getLanguageFromFilename(filename: string): Language {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return extToLang[ext] || "plaintext";
}

function SidebarFiles({
  files,
  activeIndex,
  onSelect,
  onDelete,
}: {
  files: FileType[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  onDelete: (idx: number) => void;
}) {
  return (
    <div className="text-gray-300 p-2">
      {files.map((file, idx) => {
        const Icon = languageIcons[file.language] ?? SiJavascript;
        const iconColor =
          file.language === "python"
            ? "#3776AB"
            : file.language === "javascript" || file.language === "typescript"
            ? "#F7DF1E"
            : file.language === "csharp"
            ? "#178600"
            : "#ccc";

        return (
          <div
            key={`${file.filename}-${idx}`}
            className={`flex items-center space-x-2 px-2 py-1 cursor-pointer rounded hover:bg-[#282935] transition-colors duration-300 ${
              idx === activeIndex ? "bg-[#282935]" : ""
            }`}
            onClick={() => onSelect(idx)}
          >
            <Icon size={16} color={iconColor} />
            <span className="truncate text-sm">{file.filename}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idx);
              }}
              className="ml-auto text-red-500 hover:text-red-400 text-xs bg-[#151515] hover:bg-[#202020] rounded p-1 cursor-pointer transition-colors duration-300"
              aria-label={`Delete ${file.filename}`}
              title={`Delete ${file.filename}`}
            >
              <Trash size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EditorTabs({
  files,
  activeIndex,
  onSelect,
  onDelete,
}: {
  files: FileType[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  onDelete: (idx: number) => void;
}) {
  return (
    <div className="flex bg-[#252526] border-b border-gray-700 overflow-x-auto scrollbar-hide">
      {files.map((file, idx) => {
        const Icon = languageIcons[file.language] ?? SiJavascript;
        const iconColor =
          file.language === "python"
            ? "#3776AB"
            : file.language === "javascript" || file.language === "typescript"
            ? "#F7DF1E"
            : file.language === "csharp"
            ? "#178600"
            : "#ccc";

        return (
          <div
            key={`${file.filename}-${idx}`}
            className={`flex items-center flex-shrink-0 mr-[1px] px-2 sm:px-3 py-1 cursor-pointer rounded select-none hover:bg-[#333333] transition-all duration-300 ${
              idx === activeIndex ? "bg-[#393939]" : "bg-transparent"
            }`}
            onClick={() => onSelect(idx)}
            title={file.filename}
          >
            <Icon size={12} className="mr-1 sm:mr-2 flex-shrink-0" color={iconColor} />
            <span className="truncate max-w-[80px] sm:max-w-xs text-xs sm:text-sm">{file.filename}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idx);
              }}
              className="ml-1 sm:ml-2 text-gray-400 hover:text-red-400 flex-shrink-0"
              aria-label={`Close ${file.filename}`}
              title={`Close ${file.filename}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function IDEPage() {
  const [files, setFiles] = useState<FileType[]>(defaultFiles);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);

  const activeFile = files[activeFileIndex];

  const updateFileContent = (idx: number, newContent: string) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        content: newContent,
      };
      return updated;
    });
  };

  const addFile = () => {
    const name = prompt("Enter new file name (with extension):", "newfile.py");
    if (name) {
      const language = getLanguageFromFilename(name);
      setFiles((prev) => [...prev, { filename: name, content: "", language }]);
      setActiveFileIndex(files.length); // index of the newly added file
    }
  };

  const deleteFile = (idx: number) => {
    if (files.length === 1) {
      alert("At least one file is required.");
      return;
    }
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    if (activeFileIndex === idx) {
      setActiveFileIndex(0);
    } else if (activeFileIndex > idx) {
      setActiveFileIndex((i) => i - 1);
    }
  };

  const runtimeMap: Record<Language, string> = {
    python: "python",
    javascript: "javascript",
    typescript: "javascript",
    csharp: "csharp-dotnet",
    plaintext: "",
  };

  const runCode = async () => {
    // Check if current file is executable
    if (activeFile.language === "plaintext") {
      setResult({
        stdout: "",
        stderr: "Cannot run plaintext files",
        returncode: -1,
        timed_out: false,
        error: "Plaintext is not executable",
      });
      setTerminalCollapsed(false); // Show terminal when running
      return;
    }

    setLoading(true);
    setResult(null);
    setTerminalCollapsed(false); // Always show terminal when running

    // Prepare the current file for execution
    const currentFileToRun = {
      ...activeFile,
      content: activeFile.content // Use current editor content
    };

    try {
      // Make POST request to run the current file
      const requestPayload = {
        language: runtimeMap[activeFile.language] || "plaintext",
        files: [currentFileToRun], // Send only current file or all files if needed
        main_file: currentFileToRun.filename, // Specify which file to run
        timeout: 10, // Increased timeout
      };

      console.log("POST Request Payload:", requestPayload);

      const res = await fetch("http://localhost:8000/run", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server error:", errorText);
        throw new Error(`Server error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      console.log("Execution result:", data);
      
      setResult({
        ...data,
        file_executed: currentFileToRun.filename
      });

      // Show success message in console
      console.log("Code execution completed successfully");

    } catch (err) {
      
      setResult({
        stdout: "",
        stderr: "",
        returncode: -1,
        timed_out: false,
        error: `Failed to execute ${activeFile.filename}: ${err}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // const renameFile = (index: number, newName: string) => {
  //   setFiles((files) => {
  //     const updated = [...files];
  //     updated[index] = { ...updated[index], filename: newName };
  //     return updated;
  //   });
  // };

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

  // Close sidebar on outside click for mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (sidebarOpen && !target.closest('.sidebar-container') && !target.closest('.menu-button')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-white select-none relative overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="menu-button fixed top-2 left-2 z-50 md:hidden p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar-container fixed md:relative z-40 h-full transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="w-64 sm:w-72 md:w-80 h-full border-r border-gray-700">
          <div className="p-2 border-b border-gray-700 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">Files</span>
            <div className="flex items-center gap-2">
              <button
                onClick={addFile}
                className="text-xs px-2 py-1 bg-[#393939] hover:bg-[#393939]/80 rounded cursor-pointer text-gray-300 transition-colors"
                title="Add File"
              >
                + Add
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-gray-400 hover:text-white"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <SidebarFiles
            files={files}
            activeIndex={activeFileIndex}
            onSelect={(idx) => {
              setActiveFileIndex(idx);
              setSidebarOpen(false); // Close sidebar on mobile after selection
            }}
            onDelete={deleteFile}
          />
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header with Tabs and Run Button */}
        <div className="flex flex-col sm:flex-row sm:items-center bg-[#252526] border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <EditorTabs
              files={files}
              activeIndex={activeFileIndex}
              onSelect={setActiveFileIndex}
              onDelete={deleteFile}
            />
          </div>
          
          <div className="flex items-center gap-2 p-2 border-t sm:border-t-0 sm:border-l border-gray-700">
            <button
              onClick={runCode}
              disabled={loading}
              className="flex cursor-pointer items-center px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50 disabled:cursor-not-allowed select-none text-sm"
              aria-label="Run code"
              title="Run code"
            >
              { loading ? <Loader size={14} className="mr-1 animate-spin" /> : <Play size={14} className="mr-1" /> }
              {loading ?  "Running": "Run"}
            </button>
            
            <button
              onClick={() => setTerminalCollapsed(!terminalCollapsed)}
              className="md:hidden px-2 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-xs"
              title={terminalCollapsed ? "Show Terminal" : "Hide Terminal"}
            >
              {terminalCollapsed ? "Show" : "Hide"} Terminal
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className={`flex-1 min-h-0 ${terminalCollapsed ? 'md:flex-1' : ''}`}>
          <div className="h-full" ref={editorRef}>
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              language={activeFile.language === "plaintext" ? "plaintext" : activeFile.language}
              value={activeFile.content}
              onChange={(value) => updateFileContent(activeFileIndex, value || "")}
              className="w-full h-full"
              options={{ 
                minimap: { enabled: false }, 
                fontSize,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                lineNumbers: 'on',
                mouseWheelZoom: true,
                contextmenu: true,
                renderLineHighlight: 'all',
                renderWhitespace: 'boundary',
                renderControlCharacters: true,
                folding: true,
                foldingStrategy: 'auto',
                overviewRulerLanes: 2,
                overviewRulerBorder: false,
                scrollBeyondLastColumn: 0,
                fixedOverflowWidgets: true,
                cursorBlinking: 'smooth',
                cursorStyle: 'line',
                cursorWidth: 2,
                selectionHighlight: true,
                selectionClipboard: true,
                tabSize: 4,
                useTabStops: true,
                formatOnPaste: true,
                formatOnType: true,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                  alwaysConsumeMouseWheel: false,
                  handleMouseWheel: true,
                  useShadows: false,
                  arrowSize: 11,
                  horizontalHasArrows: false,
                  verticalHasArrows: false,
                  horizontalSliderSize: 8,
                  verticalSliderSize: 8,
                },
              }}
            />
          </div>
        </div>

        {/* Terminal */}
        <div className={`bg-black font-mono border-t border-gray-700 ${
          terminalCollapsed ? 'hidden md:block h-20' : 'h-48 sm:h-56 md:h-80 lg:h-80'
        } transition-all duration-300`}>
          <div className="h-full overflow-auto">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3 px-2 sm:px-3 pt-2">
              <span className="text-[#E6D26D] ml-2 text-xs sm:text-sm">Terminal</span>
              <button
                onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                className="hidden md:block ml-auto text-gray-400 hover:text-white text-xs"
                title={terminalCollapsed ? "Expand Terminal" : "Collapse Terminal"}
              >
                {terminalCollapsed ? "▲" : "▼"}
              </button>
            </div>
            
            {!terminalCollapsed && (
              <div className="text-xs sm:text-sm px-2 sm:px-3 whitespace-pre-wrap break-words">
                {result ? (
                  <>
                    <div className="mb-2 text-xs">
                      <span className="mr-1 text-blue-400">✓</span> Executed: {activeFile.filename}
                    </div>
                    {result.error && <p className="text-red-400 mb-1">Error: {result.error}</p>}
                    {result.stdout && (
                      <div className="mb-1">
                        <span className="text-gray-400 hidden">Output:</span>
                        <pre className="whitespace-pre-wrap break-words mt-1">{result.stdout}</pre>
                      </div>
                    )}
                    {result.stderr && (
                      <div className="mb-1">
                        <span className="flex items-center"><span className="mr-1 text-red-400">⚠</span> Error Output:</span>
                        <pre className="text-red-400 whitespace-pre-wrap break-words mt-1 pl-2 border-l-2 border-red-400">{result.stderr}</pre>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 select-none">
                      <span>Exit Code: {result.returncode}</span>
                      {result.timed_out && <span className="text-yellow-400">⏱ Timed Out</span>}
                      <span className="text-green-400"><span className="mr-1">✓</span> Completed</span>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 select-none flex items-center">
                    <span className="mr-2">💻</span>
                    <span>Ready to run {activeFile.filename} ({activeFile.language})</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles for webkit browsers */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}