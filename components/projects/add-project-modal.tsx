"use client";

import { useCallback, useEffect, useState } from "react";

import { NewProjectPanel } from "./new-project-panel";

export function AddProjectModal() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, isOpen]);

  return (
    <>
      <button type="button" className="btn btn-primary add-project-btn" onClick={openModal}>
        Add Project
      </button>

      {isOpen ? (
        <div className="modal-scrim" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="modal-card modal-card-wide" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close-btn" aria-label="Close add project form" onClick={closeModal}>
              ×
            </button>
            <NewProjectPanel onSuccess={closeModal} />
          </div>
        </div>
      ) : null}
    </>
  );
}
