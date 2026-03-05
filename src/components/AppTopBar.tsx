import type { MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "../i18n/I18nProvider";

type AppTopBarProps = {
  onOpenSettings: () => void;
  onCheckUpdate: () => void;
  checkingUpdate: boolean;
  installingUpdate: boolean;
  onRefresh: () => void;
  refreshing: boolean;
};

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`iconGlyph ${spinning ? "isSpinning" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function UpdateIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`iconGlyph ${spinning ? "isSpinning" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 12a9 9 0 0 1 15.54-6.36" />
      <path d="M18.54 3.64v4.92h-4.9" />
      <path d="M21 12a9 9 0 0 1-15.54 6.36" />
      <path d="M5.46 20.36v-4.92h4.9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.9 1.9 0 1 1-3.8 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.9 1.9 0 1 1 0-3.8h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a1.9 1.9 0 1 1 3.8 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a1.9 1.9 0 1 1 0 3.8h-.2a1 1 0 0 0-.9.6Z" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 5h12" />
      <path d="M9 3v2" />
      <path d="M7 13h4" />
      <path d="m6 5 3 8 3-8" />
      <path d="M15 19h6" />
      <path d="M18 13v6" />
      <path d="m15 16 3-3 3 3" />
    </svg>
  );
}

export function AppTopBar({
  onOpenSettings,
  onCheckUpdate,
  checkingUpdate,
  installingUpdate,
  onRefresh,
  refreshing,
}: AppTopBarProps) {
  const { locale, localeOptions, copy, toggleLocale } = useI18n();
  const checking = checkingUpdate || installingUpdate;
  const appWindow = getCurrentWindow();
  const currentLocale = localeOptions.find((item) => item.code === locale) ?? localeOptions[0];
  const nextLocale =
    localeOptions[(localeOptions.findIndex((item) => item.code === currentLocale.code) + 1) % localeOptions.length];
  const toggleLanguageTitle = copy.topBar.toggleLanguage(nextLocale.nativeLabel);

  const handleDragMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "button, a, input, textarea, select, label, [role='button'], .topActions",
      )
    ) {
      return;
    }
    void appWindow.startDragging().catch(() => {});
  };

  return (
    <header className="topbar" onMouseDown={handleDragMouseDown}>
      <div className="topDragRegion" data-tauri-drag-region>
        <div className="brandLine">
          <img className="appLogo" src="/codex-tools.png" alt={copy.topBar.logoAlt} />
          <h1>{copy.topBar.appTitle}</h1>
        </div>
      </div>
      <div className="topActions">
        <button
          className="iconButton ghost"
          onClick={onCheckUpdate}
          disabled={checking}
          title={checking ? copy.topBar.checkingUpdate : copy.topBar.checkUpdate}
          aria-label={checking ? copy.topBar.checkingUpdate : copy.topBar.checkUpdate}
        >
          <UpdateIcon spinning={checking} />
        </button>
        <button
          className="iconButton primary"
          onClick={onRefresh}
          disabled={refreshing}
          title={refreshing ? copy.topBar.refreshing : copy.topBar.manualRefresh}
          aria-label={refreshing ? copy.topBar.refreshing : copy.topBar.manualRefresh}
        >
          <RefreshIcon spinning={refreshing} />
        </button>
        <button
          className="iconButton ghost"
          onClick={onOpenSettings}
          title={copy.topBar.openSettings}
          aria-label={copy.topBar.openSettings}
        >
          <SettingsIcon />
        </button>
        <button
          className="iconButton ghost languageButton"
          onClick={toggleLocale}
          title={toggleLanguageTitle}
          aria-label={toggleLanguageTitle}
        >
          <LanguageIcon />
          <span className="languageButtonCode">{currentLocale.shortLabel}</span>
        </button>
      </div>
    </header>
  );
}
