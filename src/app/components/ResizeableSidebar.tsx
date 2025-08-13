"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SiPython, SiJavascript, SiSharp } from "react-icons/si";
import { IconType } from "react-icons";
import { PencilIcon, TrashIcon } from "lucide-react";

type Language = "python" | "javascript" | "csharp" | "plaintext" | "typescript";

const languageIcons: Record<Language, IconType> = {
  python: SiPython,
  javascript: SiJavascript,
  csharp: SiSharp,
  plaintext: SiJavascript,
  typescript: SiJavascript,
};

type FileType = {
  filename: string;
  language: Language;
};

type ResizableSidebarProps = {
  files: FileType[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onAddFile: () => void;
  onRenameFile: (index: number, newName: string) => void;
};

export function ResizableSidebar({
  files,
  activeIndex,
  onSelect,
  onDelete,
  onAddFile, onRenameFile,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const contextMenuRef = useRef<{
    visible: boolean;
    x: number;
    y: number;
    fileIndex: number | null;
  }>({ visible: false, x: 0, y: 0, fileIndex: null });
  const [, setContextMenuState] = useState(contextMenuRef.current); // to trigger re-render only when changed

  const sidebarRef = useRef<HTMLDivElement>(null);

  // For smooth resizing using requestAnimationFrame
  const resizingRef = useRef(false);
  const lastClientXRef = useRef(0);

  const updateWidth = useCallback(() => {
    if (!resizingRef.current) return;

    let newWidth = lastClientXRef.current;
    if (newWidth < 200) newWidth = 200;
    if (newWidth > 600) newWidth = 600;

    setWidth(newWidth);

    requestAnimationFrame(updateWidth);
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing) return;
      lastClientXRef.current = e.clientX;
      if (!resizingRef.current) {
        resizingRef.current = true;
        requestAnimationFrame(updateWidth);
      }
    }

    function onMouseUp() {
      if (isResizing) {
        setIsResizing(false);
        resizingRef.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    }

    function onClickOutside() {
      if (contextMenuRef.current.visible) {
        contextMenuRef.current = { visible: false, x: 0, y: 0, fileIndex: null };
        setContextMenuState({ ...contextMenuRef.current });
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("click", onClickOutside);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("click", onClickOutside);
    };
  }, [isResizing, updateWidth]);

  function onMouseDown() {
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }

  function onContextMenuFile(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();

    let x = e.clientX;
    let y = e.clientY;

    if (sidebarRect) {
      const menuWidth = 120;
      const menuHeight = 40;

      if (x + menuWidth > sidebarRect.right) {
        x = sidebarRect.right - menuWidth;
      }
      if (y + menuHeight > sidebarRect.bottom) {
        y = sidebarRect.bottom - menuHeight;
      }
    }

    contextMenuRef.current = { visible: true, x, y, fileIndex: idx };
    setContextMenuState({ ...contextMenuRef.current });
  }

  function onDeleteFromMenu() {
    if (contextMenuRef.current.fileIndex !== null) {
      onDelete(contextMenuRef.current.fileIndex);
      contextMenuRef.current = { visible: false, x: 0, y: 0, fileIndex: null };
      setContextMenuState({ ...contextMenuRef.current });
    }
  }

  // Track which file is being renamed
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Start renaming a file
  function startRename(index: number) {
    setRenamingIndex(index);
    setRenameValue(files[index].filename);
    setContextMenuState({ visible: false, x: 0, y: 0, fileIndex: null }); // close context menu
  }

  // Save rename changes
  function saveRename() {
    if (renamingIndex !== null && renameValue.trim()) {
      onRenameFile(renamingIndex, renameValue.trim());
    }
    setRenamingIndex(null);
    setRenameValue("");
  }

  // Cancel rename (on blur or escape)
  function cancelRename() {
    setRenamingIndex(null);
    setRenameValue("");
  }

  // Context menu item for rename
  function RenameMenuItem() {
    if (contextMenuRef.current.fileIndex === null) return null;
    return (
      <li
        className="px-4 py-2 cursor-pointer hover:bg-[#282935] text-gray-400 rounded-lg flex items-center transition-colors duration-200 ease-in-out"
        onClick={() => startRename(contextMenuRef.current.fileIndex!)}
        role="menuitem"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            startRename(contextMenuRef.current.fileIndex!);
          }
        }}
        aria-label="Rename file"
      >
        <PencilIcon className="inline mr-2 h-5 w-5" />
        <span>Rename</span>
      </li>
    );
  }

  return (
    <div
      ref={sidebarRef}
      className="flex flex-col bg-[#1e1e1e] border-r border-gray-700 relative select-none"
      style={{
        width,
        minWidth: 200,
        maxWidth: 600,
        transition: isResizing ? "none" : "width 0.3s ease",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700">
        <h2 className="text-gray-400 font-semibold text-sm select-none">EXPLORER</h2>
        <button
          onClick={onAddFile}
          className="text-green-400 hover:text-green-300 font-bold text-xl leading-none"
          aria-label="Add new file"
          title="Add new file"
          type="button"
        >
          +
        </button>
      </div>

      {/* Files list */}
      {/* Files list */}
      <div className="flex-1 overflow-auto">
        {files.map((file, idx) => {
          const Icon = languageIcons[file.language] || SiJavascript;
          const isActive = idx === activeIndex;

          return (
            <div
              key={idx}
              onClick={() => onSelect(idx)}
              onContextMenu={(e) => onContextMenuFile(e, idx)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                isActive ? "bg-gray-700" : ""
              }`}
            >
              <div className="flex items-center space-x-2 flex-grow">
                <Icon
                  size={16}
                  color={
                    file.language === "python"
                      ? "#3776AB"
                      : file.language === "javascript" || file.language === "typescript"
                      ? "#F7DF1E"
                      : "#178600"
                  }
                />
                {renamingIndex === idx ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={saveRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveRename();
                      } else if (e.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    autoFocus
                    className="bg-[#252526] text-white px-1 rounded w-full max-w-[200px]"
                  />
                ) : (
                  <span>{file.filename}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenuRef.current.visible && (
        <ul
          className="absolute bg-[#252526] w-auto p-2 rounded-lg shadow-md overflow-hidden"
          style={{
            top: contextMenuRef.current.y,
            left: contextMenuRef.current.x,
            width: 160,
            zIndex: 1000,
            userSelect: "none",
          }}
        >

            {/* RENAME */}
            <RenameMenuItem />
            
            {/* DELETE */}
          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#292929] text-red-400 rounded-lg flex items-center transition-colors duration-200 ease-in-out"
            onClick={onDeleteFromMenu}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onDeleteFromMenu();
              }
            }}
            aria-label="Delete file"            
          >
            <TrashIcon className="inline mr-2" />
            <span>Delete</span>
          </li>

          <li
            className="px-4 py-2 cursor-pointer hover:bg-[#292929] text-gray-400 rounded-lg flex items-center transition-colors duration-200 ease-in-out"
            onClick={() => {
              contextMenuRef.current = { visible: false, x: 0, y: 0, fileIndex: null };
              setContextMenuState({ ...contextMenuRef.current });
            }}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                contextMenuRef.current = { visible: false, x: 0, y: 0, fileIndex: null };
                setContextMenuState({ ...contextMenuRef.current });
              }
            }}
            aria-label="Close menu"
          >
            <span>Close</span>
        </li>
        </ul>
      )}

      {/* Resizer */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-0 h-full w-2 cursor-ew-resize hover:bg-gray-600"
        title="Resize sidebar"
        aria-label="Resize sidebar"
        style={{ userSelect: "none" }}
      />
    </div>
  );
}
