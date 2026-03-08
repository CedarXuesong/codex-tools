type AppTab = "accounts" | "proxy";

type BottomDockProps = {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
};

function AccountsIcon() {
  return (
    <svg className="bottomDockIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ProxyIcon() {
  return (
    <svg className="bottomDockIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 7h10v4H7z" />
      <path d="M9 11v3" />
      <path d="M15 11v3" />
      <path d="M6 17h12" />
      <path d="M12 14v3" />
    </svg>
  );
}

export function BottomDock({ activeTab, onSelectTab }: BottomDockProps) {
  return (
    <nav className="bottomDock" aria-label="底部导航">
      <button
        className={`bottomDockButton${activeTab === "accounts" ? " isActive" : ""}`}
        onClick={() => onSelectTab("accounts")}
        aria-label="账号"
        title="账号"
      >
        <AccountsIcon />
      </button>
      <button
        className={`bottomDockButton${activeTab === "proxy" ? " isActive" : ""}`}
        onClick={() => onSelectTab("proxy")}
        aria-label="API 反代"
        title="API 反代"
      >
        <ProxyIcon />
      </button>
    </nav>
  );
}
