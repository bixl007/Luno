"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A modal confirmation built on the native <dialog>: focus trap, Escape and backdrop come for free. */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-lg backdrop:bg-foreground/30 backdrop:backdrop-blur-[2px] open:animate-pop-in"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-base font-semibold">{title}</h2>
        <p id="confirm-description" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
