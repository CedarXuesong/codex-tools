import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/I18nProvider";

type AddAccountDialogProps = {
  open: boolean;
  startingAdd: boolean;
  addFlowActive: boolean;
  onClose: () => void;
};

export function AddAccountDialog({
  open,
  startingAdd,
  addFlowActive,
  onClose,
}: AddAccountDialogProps) {
  const { copy } = useI18n();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const stageTitle =
    startingAdd && !addFlowActive ? copy.addAccount.launchingTitle : copy.addAccount.watchingTitle;
  const stageDetail =
    startingAdd && !addFlowActive
      ? copy.addAccount.launchingDetail
      : copy.addAccount.watchingDetail;

  return createPortal(
    <div className="settingsOverlay" onClick={onClose}>
      <section
        className="settingsDialog addAuthDialog"
        role="dialog"
        aria-modal="true"
        aria-label={copy.addAccount.dialogAriaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settingsHeader">
          <div>
            <h2>{copy.addAccount.dialogTitle}</h2>
            <p>{copy.addAccount.dialogSubtitle}</p>
          </div>
          <button
            className="iconButton ghost"
            onClick={onClose}
            aria-label={copy.addAccount.closeDialog}
            title={copy.common.close}
          >
            <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m6 6 12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="addAuthState">
          <div className="addAuthTitleRow">
            <svg
              className="iconGlyph isSpinning addAuthSpinner"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            </svg>
            <strong>{stageTitle}</strong>
          </div>
          <p>{stageDetail}</p>
        </div>

        <div className="updateDialogActions">
          <button className="ghost" onClick={onClose}>
            {copy.addAccount.cancelListening}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
