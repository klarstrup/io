"use client";

import { useRouter } from "next/navigation";
import { type ComponentRef, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useIsSSR } from "../../hooks/useIsSSR";

export function Modal({ children }: { children: React.ReactNode }) {
  const isSSR = useIsSSR();
  const router = useRouter();
  const dialogRef = useRef<ComponentRef<"dialog">>(null);

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, []);

  function onDismiss() {
    router.back();
  }

  if (isSSR) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={() => {
        dialogRef.current?.close();
      }}
    >
      <dialog ref={dialogRef} className="modal" onClose={onDismiss}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dialogRef.current?.close();
          }}
          className="close-button"
        />
      </dialog>
    </div>,
    document.getElementById("modal-root")!,
  );
}
