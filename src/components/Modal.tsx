"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#05081a]/70 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={`panel flex max-h-[92vh] w-full flex-col !rounded-b-none sm:!rounded-[22px] ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
        style={{ background: "var(--panel-solid)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="display text-2xl">{title}</h2>
          <button className="btn btn-quiet" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
