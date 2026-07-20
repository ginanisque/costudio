import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
};

export default function SettingsPortal({ open, onClose, width = 560, children }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "grid",
    placeItems: "center",
    zIndex: 2147483647, // bulletproof
  };
  const card: React.CSSProperties = {
    width,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 12px 40px rgba(0,0,0,.2)",
    color: "#111",
    maxHeight: "85vh",
    overflow: "auto",
  };

  return createPortal(
    <div id="settings-portal-overlay" style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
