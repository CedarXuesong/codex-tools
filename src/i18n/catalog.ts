export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocaleOption = {
  code: AppLocale;
  shortLabel: string;
  nativeLabel: string;
};

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: "zh-CN", shortLabel: "中", nativeLabel: "中文" },
  { code: "en-US", shortLabel: "EN", nativeLabel: "English" },
];

export const DEFAULT_LOCALE: AppLocale = "zh-CN";

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return value === "zh-CN" || value === "en-US";
}

export function getNextLocale(current: AppLocale): AppLocale {
  const index = LOCALE_OPTIONS.findIndex((item) => item.code === current);
  if (index < 0) {
    return DEFAULT_LOCALE;
  }
  return LOCALE_OPTIONS[(index + 1) % LOCALE_OPTIONS.length].code;
}

export type MessageCatalog = {
  common: {
    close: string;
  };
  topBar: {
    appTitle: string;
    logoAlt: string;
    checkUpdate: string;
    checkingUpdate: string;
    manualRefresh: string;
    refreshing: string;
    openSettings: string;
    toggleLanguage: (nextLanguage: string) => string;
  };
  metaStrip: {
    ariaLabel: string;
    accountCount: string;
    currentActive: string;
  };
  addAccount: {
    smartSwitch: string;
    startButton: string;
    startingButton: string;
    waitingButton: string;
    dialogAriaLabel: string;
    dialogTitle: string;
    dialogSubtitle: string;
    launchingTitle: string;
    watchingTitle: string;
    launchingDetail: string;
    watchingDetail: string;
    cancelListening: string;
    closeDialog: string;
  };
  accountCard: {
    currentStamp: string;
    launch: string;
    launching: string;
    delete: string;
    deleteConfirm: string;
    used: string;
    remaining: string;
    resetAt: string;
    credits: string;
    unlimited: string;
    fiveHourFallback: string;
    oneWeekFallback: string;
    oneWeekLabel: string;
    hourSuffix: string;
    minuteSuffix: string;
    planLabels: Record<string, string>;
  };
  accountsGrid: {
    emptyTitle: string;
    emptyDescription: string;
  };
  settings: {
    dialogAriaLabel: string;
    title: string;
    subtitle: string;
    close: string;
    launchAtStartup: {
      label: string;
      description: string;
      checkedText: string;
      uncheckedText: string;
    };
    launchCodexAfterSwitch: {
      label: string;
      description: string;
      checkedText: string;
      uncheckedText: string;
    };
    syncOpencode: {
      label: string;
      description: string;
      checkedText: string;
      uncheckedText: string;
    };
    restartEditorsOnSwitch: {
      label: string;
      description: string;
      checkedText: string;
      uncheckedText: string;
    };
    restartEditorTargets: {
      label: string;
      description: string;
    };
    noSupportedEditors: string;
    trayUsageDisplay: {
      label: string;
      description: string;
      groupAriaLabel: string;
      remaining: string;
      used: string;
    };
    theme: {
      label: string;
      description: string;
      switchAriaLabel: string;
      dark: string;
      light: string;
    };
  };
  editorPicker: {
    ariaLabel: string;
    placeholder: string;
  };
  editorAppLabels: Record<string, string>;
  updateDialog: {
    ariaLabel: string;
    title: (version: string) => string;
    subtitle: (currentVersion: string) => string;
    close: string;
    publishedAt: (date: string) => string;
    autoDownloading: string;
    autoPaused: string;
    manualDownload: string;
    retryAutoDownload: string;
    retryingAutoDownload: string;
  };
  notices: {
    settingsUpdated: string;
    updateSettingsFailed: (error: string) => string;
    usageRefreshed: string;
    refreshFailed: (error: string) => string;
    restoreAuthFailed: (error: string) => string;
    preparingUpdateDownload: string;
    alreadyLatest: string;
    updateDownloadStarted: string;
    updateDownloadingPercent: (percent: number) => string;
    updateDownloading: string;
    updateDownloadFinished: string;
    updateInstalling: string;
    updateInstallFailed: (error: string) => string;
    foundNewVersion: (version: string, currentVersion: string) => string;
    updateCheckFailed: (error: string) => string;
    openManualDownloadFailed: (error: string) => string;
    addAccountSuccess: string;
    addAccountAutoImportFailed: (error: string) => string;
    addAccountTimeout: string;
    startLoginFlowFailed: (error: string) => string;
    deleteConfirm: (label: string) => string;
    accountDeleted: string;
    deleteFailed: (error: string) => string;
    switchedOnly: string;
    switchedAndLaunchByCli: string;
    switchedAndLaunching: string;
    opencodeSyncFailed: (base: string, error: string) => string;
    opencodeSynced: (base: string) => string;
    editorRestartFailed: (base: string, error: string) => string;
    editorsRestarted: (base: string, labels: string) => string;
    noEditorRestarted: (base: string) => string;
    switchFailed: (error: string) => string;
    smartSwitchNoTarget: string;
    smartSwitchAlreadyBest: string;
  };
};

export const MESSAGES: Record<AppLocale, MessageCatalog> = {
  "zh-CN": {
    common: {
      close: "关闭",
    },
    topBar: {
      appTitle: "Codex Tools",
      logoAlt: "Codex Tools 标志",
      checkUpdate: "检查更新",
      checkingUpdate: "检查更新中",
      manualRefresh: "手动刷新",
      refreshing: "刷新中",
      openSettings: "打开设置",
      toggleLanguage: (nextLanguage) => `切换语言（下一项：${nextLanguage}）`,
    },
    metaStrip: {
      ariaLabel: "账号概览",
      accountCount: "账号数",
      currentActive: "当前活跃",
    },
    addAccount: {
      smartSwitch: "智能切换",
      startButton: "添加账号",
      startingButton: "启动中...",
      waitingButton: "等待授权中...",
      dialogAriaLabel: "添加账号授权",
      dialogTitle: "添加账号",
      dialogSubtitle: "浏览器授权完成后会自动写入账号列表。",
      launchingTitle: "正在启动授权流程...",
      watchingTitle: "正在监听登录状态变化",
      launchingDetail: "正在打开浏览器并初始化监听，请稍候。",
      watchingDetail:
        "请在浏览器完成登录授权。授权成功后会自动导入账号并刷新列表（最长 10 分钟）。",
      cancelListening: "取消监听",
      closeDialog: "关闭弹窗",
    },
    accountCard: {
      currentStamp: "当前",
      launch: "切换并启动",
      launching: "启动中",
      delete: "删除账号",
      deleteConfirm: "再次点击确认删除账号",
      used: "已用",
      remaining: "剩余",
      resetAt: "重置时间",
      credits: "Credits",
      unlimited: "无限制",
      fiveHourFallback: "5h",
      oneWeekFallback: "1week",
      oneWeekLabel: "1周",
      hourSuffix: "h",
      minuteSuffix: "m",
      planLabels: {
        unknown: "UNKNOWN",
        free: "FREE",
        plus: "PLUS",
        pro: "PRO",
        team: "TEAM",
        enterprise: "ENTERPRISE",
        business: "BUSINESS",
      },
    },
    accountsGrid: {
      emptyTitle: "还没有账号",
      emptyDescription: "点击“添加账号”，完成授权后会自动出现在列表中。",
    },
    settings: {
      dialogAriaLabel: "应用设置",
      title: "设置",
      subtitle: "可配置开机启动、状态栏显示模式和主题。",
      close: "关闭设置",
      launchAtStartup: {
        label: "开机启动",
        description: "启用后会在系统登录时自动启动 Codex Tools。",
        checkedText: "开启",
        uncheckedText: "关闭",
      },
      launchCodexAfterSwitch: {
        label: "切换后启动 Codex",
        description: "默认开启。关闭时仅切换账号，不自动拉起 Codex。",
        checkedText: "启动",
        uncheckedText: "仅切换",
      },
      syncOpencode: {
        label: "同步 Opencode OpenAI",
        description: "切换账号时自动探测 opencode 认证文件，并同步 refresh/access。",
        checkedText: "同步",
        uncheckedText: "不同步",
      },
      restartEditorsOnSwitch: {
        label: "切换时重启编辑器（兼容 Codex 编辑器插件）",
        description: "默认关闭。开启后切换账号会强制关闭并重启你选中的编辑器。",
        checkedText: "重启",
        uncheckedText: "不重启",
      },
      restartEditorTargets: {
        label: "重启目标编辑器（单选）",
        description:
          "后台自动检测已安装的 VSCode/VSCode Insiders/Cursor/Antigravity/Kiro/Trae/Qoder。",
      },
      noSupportedEditors: "当前未检测到支持重启的编辑器。",
      trayUsageDisplay: {
        label: "状态栏展示",
        description: "控制状态栏菜单中显示“已用”还是“剩余”。",
        groupAriaLabel: "状态栏展示模式",
        remaining: "剩余",
        used: "已用",
      },
      theme: {
        label: "主题",
        description: "使用开关切换浅色和深色主题。",
        switchAriaLabel: "切换主题",
        dark: "深色",
        light: "浅色",
      },
    },
    editorPicker: {
      ariaLabel: "选择需要重启的编辑器",
      placeholder: "请选择编辑器",
    },
    editorAppLabels: {
      vscode: "VS Code",
      vscodeInsiders: "Visual Studio Code - Insiders",
      cursor: "Cursor",
      antigravity: "Antigravity",
      kiro: "Kiro",
      trae: "Trae",
      qoder: "Qoder",
    },
    updateDialog: {
      ariaLabel: "应用更新",
      title: (version) => `发现新版本 ${version}`,
      subtitle: (currentVersion) => `当前版本 ${currentVersion}，已自动开始下载更新。`,
      close: "关闭更新弹窗",
      publishedAt: (date) => `发布时间 ${date}`,
      autoDownloading: "自动下载中...",
      autoPaused: "自动下载已暂停或失败，可手动处理。",
      manualDownload: "手动下载",
      retryAutoDownload: "重新自动下载",
      retryingAutoDownload: "自动下载中...",
    },
    notices: {
      settingsUpdated: "设置已更新",
      updateSettingsFailed: (error) => `更新设置失败：${error}`,
      usageRefreshed: "用量已刷新",
      refreshFailed: (error) => `刷新失败：${error}`,
      restoreAuthFailed: (error) => `恢复原账号失败：${error}`,
      preparingUpdateDownload: "准备下载更新...",
      alreadyLatest: "当前已是最新版本",
      updateDownloadStarted: "开始下载更新...",
      updateDownloadingPercent: (percent) => `下载中 ${percent}%`,
      updateDownloading: "下载中...",
      updateDownloadFinished: "下载完成，准备安装...",
      updateInstalling: "安装完成，正在重启...",
      updateInstallFailed: (error) => `安装更新失败：${error}`,
      foundNewVersion: (version, currentVersion) =>
        `发现新版本 ${version}（当前 ${currentVersion}），已开始自动下载。`,
      updateCheckFailed: (error) => `检查更新失败：${error}`,
      openManualDownloadFailed: (error) => `打开下载页面失败：${error}`,
      addAccountSuccess: "授权成功，账号已自动添加并刷新。",
      addAccountAutoImportFailed: (error) => `自动导入失败：${error}`,
      addAccountTimeout: "等待授权超时，请重新点击“添加账号”。",
      startLoginFlowFailed: (error) => `无法启动登录流程：${error}`,
      deleteConfirm: (label) => `再次点击删除账号 ${label} 以确认。`,
      accountDeleted: "账号已删除",
      deleteFailed: (error) => `删除失败：${error}`,
      switchedOnly: "账号已切换（未自动启动 Codex）。",
      switchedAndLaunchByCli: "账号已切换。未找到本地 Codex.app，已尝试通过 codex app 启动。",
      switchedAndLaunching: "账号已切换，正在启动 Codex。",
      opencodeSyncFailed: (base, error) => `${base} Opencode 同步失败：${error}`,
      opencodeSynced: (base) => `${base} 已同步 Opencode OpenAI 认证。`,
      editorRestartFailed: (base, error) => `${base} 编辑器重启失败：${error}`,
      editorsRestarted: (base, labels) => `${base} 已重启编辑器：${labels}`,
      noEditorRestarted: (base) => `${base} 未检测到可重启的已安装编辑器。`,
      switchFailed: (error) => `切换失败：${error}`,
      smartSwitchNoTarget: "暂无可切换账号，请先添加账号。",
      smartSwitchAlreadyBest: "当前账号已是最优余量账号（优先 1week，其次 5h）。",
    },
  },
  "en-US": {
    common: {
      close: "Close",
    },
    topBar: {
      appTitle: "Codex Tools",
      logoAlt: "Codex Tools logo",
      checkUpdate: "Check updates",
      checkingUpdate: "Checking updates",
      manualRefresh: "Refresh usage",
      refreshing: "Refreshing",
      openSettings: "Open settings",
      toggleLanguage: (nextLanguage) => `Switch language (next: ${nextLanguage})`,
    },
    metaStrip: {
      ariaLabel: "Account overview",
      accountCount: "Accounts",
      currentActive: "Active now",
    },
    addAccount: {
      smartSwitch: "Smart switch",
      startButton: "Add account",
      startingButton: "Starting...",
      waitingButton: "Waiting for auth...",
      dialogAriaLabel: "Add account authorization",
      dialogTitle: "Add account",
      dialogSubtitle: "The account list will update automatically after browser authorization.",
      launchingTitle: "Launching authorization flow...",
      watchingTitle: "Watching login status changes",
      launchingDetail: "Opening browser and initializing listener. Please wait.",
      watchingDetail:
        "Complete login in your browser. The account will be imported and refreshed automatically (up to 10 minutes).",
      cancelListening: "Cancel listening",
      closeDialog: "Close dialog",
    },
    accountCard: {
      currentStamp: "Current",
      launch: "Switch and launch",
      launching: "Launching",
      delete: "Delete account",
      deleteConfirm: "Click again to confirm deleting account",
      used: "Used",
      remaining: "Remaining",
      resetAt: "Reset at",
      credits: "Credits",
      unlimited: "Unlimited",
      fiveHourFallback: "5h",
      oneWeekFallback: "1week",
      oneWeekLabel: "1 week",
      hourSuffix: "h",
      minuteSuffix: "m",
      planLabels: {
        unknown: "UNKNOWN",
        free: "FREE",
        plus: "PLUS",
        pro: "PRO",
        team: "TEAM",
        enterprise: "ENTERPRISE",
        business: "BUSINESS",
      },
    },
    accountsGrid: {
      emptyTitle: "No accounts yet",
      emptyDescription: "Click “Add account”. It appears automatically after authorization.",
    },
    settings: {
      dialogAriaLabel: "App settings",
      title: "Settings",
      subtitle: "Configure startup, tray usage display mode, and theme.",
      close: "Close settings",
      launchAtStartup: {
        label: "Launch at startup",
        description: "Automatically start Codex Tools when you log in.",
        checkedText: "On",
        uncheckedText: "Off",
      },
      launchCodexAfterSwitch: {
        label: "Launch Codex after switch",
        description: "Enabled by default. When disabled, only switch account without launching Codex.",
        checkedText: "Launch",
        uncheckedText: "Switch only",
      },
      syncOpencode: {
        label: "Sync Opencode OpenAI auth",
        description: "Auto-detect opencode auth file and sync refresh/access on switch.",
        checkedText: "Sync",
        uncheckedText: "No sync",
      },
      restartEditorsOnSwitch: {
        label: "Restart editors on switch (Codex plugin compatible)",
        description: "Disabled by default. When enabled, selected editors are force-restarted on account switch.",
        checkedText: "Restart",
        uncheckedText: "No restart",
      },
      restartEditorTargets: {
        label: "Editor restart target (single)",
        description:
          "Auto-detect installed VSCode/VSCode Insiders/Cursor/Antigravity/Kiro/Trae/Qoder in background.",
      },
      noSupportedEditors: "No supported editor detected for restart.",
      trayUsageDisplay: {
        label: "Status bar display",
        description: "Choose whether tray menu shows used quota or remaining quota.",
        groupAriaLabel: "Status bar display mode",
        remaining: "Remaining",
        used: "Used",
      },
      theme: {
        label: "Theme",
        description: "Use the switch to toggle light and dark theme.",
        switchAriaLabel: "Toggle theme",
        dark: "Dark",
        light: "Light",
      },
    },
    editorPicker: {
      ariaLabel: "Select editor to restart",
      placeholder: "Select an editor",
    },
    editorAppLabels: {
      vscode: "VS Code",
      vscodeInsiders: "Visual Studio Code - Insiders",
      cursor: "Cursor",
      antigravity: "Antigravity",
      kiro: "Kiro",
      trae: "Trae",
      qoder: "Qoder",
    },
    updateDialog: {
      ariaLabel: "App update",
      title: (version) => `New version ${version} found`,
      subtitle: (currentVersion) => `Current version ${currentVersion}. Auto download has started.`,
      close: "Close update dialog",
      publishedAt: (date) => `Published at ${date}`,
      autoDownloading: "Auto downloading...",
      autoPaused: "Auto download paused or failed. You can continue manually.",
      manualDownload: "Manual download",
      retryAutoDownload: "Retry auto download",
      retryingAutoDownload: "Auto downloading...",
    },
    notices: {
      settingsUpdated: "Settings updated",
      updateSettingsFailed: (error) => `Failed to update settings: ${error}`,
      usageRefreshed: "Usage refreshed",
      refreshFailed: (error) => `Refresh failed: ${error}`,
      restoreAuthFailed: (error) => `Failed to restore previous account: ${error}`,
      preparingUpdateDownload: "Preparing update download...",
      alreadyLatest: "Already up to date",
      updateDownloadStarted: "Update download started...",
      updateDownloadingPercent: (percent) => `Downloading ${percent}%`,
      updateDownloading: "Downloading...",
      updateDownloadFinished: "Download complete, preparing install...",
      updateInstalling: "Install complete, restarting...",
      updateInstallFailed: (error) => `Failed to install update: ${error}`,
      foundNewVersion: (version, currentVersion) =>
        `New version ${version} found (current ${currentVersion}). Auto download started.`,
      updateCheckFailed: (error) => `Failed to check updates: ${error}`,
      openManualDownloadFailed: (error) => `Failed to open download page: ${error}`,
      addAccountSuccess: "Authorization successful. Account was added and refreshed automatically.",
      addAccountAutoImportFailed: (error) => `Auto import failed: ${error}`,
      addAccountTimeout: "Authorization timed out. Please click “Add account” again.",
      startLoginFlowFailed: (error) => `Failed to start login flow: ${error}`,
      deleteConfirm: (label) => `Click delete again to confirm removing ${label}.`,
      accountDeleted: "Account deleted",
      deleteFailed: (error) => `Delete failed: ${error}`,
      switchedOnly: "Account switched (Codex not launched automatically).",
      switchedAndLaunchByCli:
        "Account switched. Codex.app was not found locally; tried launching via `codex app`.",
      switchedAndLaunching: "Account switched. Launching Codex.",
      opencodeSyncFailed: (base, error) => `${base} Opencode sync failed: ${error}`,
      opencodeSynced: (base) => `${base} Opencode OpenAI auth synced.`,
      editorRestartFailed: (base, error) => `${base} Editor restart failed: ${error}`,
      editorsRestarted: (base, labels) => `${base} Editors restarted: ${labels}`,
      noEditorRestarted: (base) => `${base} No installed editor found for restart.`,
      switchFailed: (error) => `Switch failed: ${error}`,
      smartSwitchNoTarget: "No switchable account. Please add an account first.",
      smartSwitchAlreadyBest:
        "Current account already has the best remaining quota (1week first, then 5h).",
    },
  },
};
