"use client";

import { useEffect, useRef } from "react";

import { Icon } from "@/components/icons";
import type { ReleaseGate } from "@/lib/types";

interface EvidenceDrawerProps {
  gate: ReleaseGate | null;
  onClose: () => void;
}

function formatTime(value: string) {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
}

export function EvidenceDrawer({ gate, onClose }: EvidenceDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!gate) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const focusFrame = window.requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("drawer-open");
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("drawer-open");
      previouslyFocused?.focus();
    };
  }, [gate, onClose]);

  if (!gate) return null;

  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close evidence panel" />
      <aside ref={drawerRef} className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">GATE EVIDENCE</span>
            <h2 id="drawer-title">{gate.label}</h2>
          </div>
          <button autoFocus className="icon-button" onClick={onClose} aria-label="Close evidence panel">
            <Icon name="x" />
          </button>
        </div>

        <div className="drawer-verdict">
          <span className={`status-dot ${gate.status}`} />
          <div>
            <strong>{gate.result}</strong>
            <p>{gate.summary}</p>
          </div>
        </div>

        <div className="evidence-stack">
          {gate.evidence.map((item, index) => (
            <article className="evidence-card" key={item.id}>
              <div className="evidence-number">EVIDENCE {String(index + 1).padStart(2, "0")}</div>
              <h3>{item.label}</h3>
              <dl className="evidence-grid">
                <div>
                  <dt>Actual</dt>
                  <dd>{item.actual}</dd>
                </div>
                <div>
                  <dt>Threshold</dt>
                  <dd>{item.threshold}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{item.source}</dd>
                </div>
                <div>
                  <dt>Recorded</dt>
                  <dd>{formatTime(item.timestamp)}</dd>
                </div>
              </dl>
              <div className="why-note">
                <span>Why this matters</span>
                <p>{item.whyItMatters}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="drawer-foot">
          <Icon name={gate.automated ? "terminal" : "users"} size={16} />
          {gate.automated ? "Automated evidence · human policy" : "Human-owned decision"}
        </div>
      </aside>
    </div>
  );
}
