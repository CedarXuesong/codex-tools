import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useI18n } from "../i18n/I18nProvider";
import type {
  AccountSummary,
  ApiProxyStatus,
  AppSettings,
  AddFlow,
  AuthJsonImportInput,
  CloudflaredStatus,
  CurrentAuthStatus,
  ImportAccountsResult,
  InstalledEditorApp,
  Notice,
  PendingUpdateInfo,
  StartCloudflaredTunnelInput,
  SwitchAccountResult,
  UpdateSettingsOptions,
} from "../types/app";
import { pickBestRemainingAccount, sortAccountsByRemaining } from "../utils/accountRanking";

const REFRESH_MS = 30_000;
const EDITOR_SCAN_MS = 60_000;
const ADD_FLOW_TIMEOUT_MS = 10 * 60_000;
const ADD_FLOW_POLL_MS = 2_500;
const API_PROXY_POLL_MS = 4_000;
const CLOUDFLARED_POLL_MS = 3_000;
const MANUAL_DOWNLOAD_URL = "https://github.com/170-carry/codex-tools/releases/latest";
const DEFAULT_SETTINGS: AppSettings = {
  launchAtStartup: false,
  trayUsageDisplayMode: "remaining",
  launchCodexAfterSwitch: true,
  syncOpencodeOpenaiAuth: false,
  restartEditorsOnSwitch: false,
  restartEditorTargets: [],
};
const DEFAULT_API_PROXY_STATUS: ApiProxyStatus = {
  running: false,
  port: null,
  apiKey: null,
  baseUrl: null,
  activeAccountId: null,
  activeAccountLabel: null,
  lastError: null,
};
const DEFAULT_CLOUDFLARED_STATUS: CloudflaredStatus = {
  installed: false,
  binaryPath: null,
  running: false,
  tunnelMode: null,
  publicUrl: null,
  customHostname: null,
  useHttp2: false,
  lastError: null,
};

function buildImportNotice(result: ImportAccountsResult, prefix: string): Notice {
  const successCount = result.importedCount + result.updatedCount;
  const failureCount = result.failures.length;
  const firstFailure = result.failures[0];

  if (successCount === 0) {
    if (firstFailure) {
      return {
        type: "error",
        message: `${prefix}失败：${firstFailure.source}，${firstFailure.error}`,
      };
    }
    return {
      type: "error",
      message: `${prefix}失败：没有可导入的有效 JSON。`,
    };
  }

  const segments: string[] = [];
  if (result.importedCount > 0) {
    segments.push(`新增 ${result.importedCount} 个`);
  }
  if (result.updatedCount > 0) {
    segments.push(`更新 ${result.updatedCount} 个`);
  }
  if (failureCount > 0) {
    segments.push(`失败 ${failureCount} 个`);
  }

  const suffix =
    failureCount > 0 && firstFailure
      ? ` 首个失败：${firstFailure.source}，${firstFailure.error}`
      : "";

  return {
    type: failureCount > 0 ? "info" : "ok",
    message: `${prefix}完成：${segments.join("，")}。${suffix}`.trim(),
  };
}

export function useCodexController() {
  const { copy } = useI18n();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [startingAdd, setStartingAdd] = useState(false);
  const [addFlow, setAddFlow] = useState<AddFlow | null>(null);
  const [importingUpload, setImportingUpload] = useState(false);
  const [apiProxyStatus, setApiProxyStatus] = useState<ApiProxyStatus>(DEFAULT_API_PROXY_STATUS);
  const [cloudflaredStatus, setCloudflaredStatus] = useState<CloudflaredStatus>(DEFAULT_CLOUDFLARED_STATUS);
  const [startingApiProxy, setStartingApiProxy] = useState(false);
  const [stoppingApiProxy, setStoppingApiProxy] = useState(false);
  const [refreshingApiProxyKey, setRefreshingApiProxyKey] = useState(false);
  const [installingCloudflared, setInstallingCloudflared] = useState(false);
  const [startingCloudflared, setStartingCloudflared] = useState(false);
  const [stoppingCloudflared, setStoppingCloudflared] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdateInfo | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [installedEditorApps, setInstalledEditorApps] = useState<InstalledEditorApp[]>([]);
  const installingUpdateRef = useRef(false);
  const addFlowCancelledRef = useRef(false);
  const deleteConfirmTimerRef = useRef<number | null>(null);
  const settingsUpdateQueueRef = useRef<Promise<void>>(Promise.resolve());

  const currentCount = useMemo(
    () => accounts.filter((account) => account.isCurrent).length,
    [accounts],
  );
  const sortedAccounts = useMemo(() => sortAccountsByRemaining(accounts), [accounts]);

  const loadAccounts = useCallback(async () => {
    const data = await invoke<AccountSummary[]>("list_accounts");
    setAccounts(data);
  }, []);

  const loadSettings = useCallback(async () => {
    const data = await invoke<AppSettings>("get_app_settings");
    setSettings(data);
  }, []);

  const loadInstalledEditorApps = useCallback(async () => {
    try {
      const data = await invoke<InstalledEditorApp[]>("list_installed_editor_apps");
      setInstalledEditorApps(data);
    } catch {
      setInstalledEditorApps([]);
    }
  }, []);

  const loadApiProxyStatus = useCallback(async () => {
    try {
      const data = await invoke<ApiProxyStatus>("get_api_proxy_status");
      setApiProxyStatus(data);
    } catch {
      setApiProxyStatus(DEFAULT_API_PROXY_STATUS);
    }
  }, []);

  const loadCloudflaredStatus = useCallback(async () => {
    try {
      const data = await invoke<CloudflaredStatus>("get_cloudflared_status");
      setCloudflaredStatus(data);
    } catch {
      setCloudflaredStatus(DEFAULT_CLOUDFLARED_STATUS);
    }
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>, options?: UpdateSettingsOptions) => {
      const shouldLockUi = !options?.keepInteractive;
      const task = async () => {
        if (shouldLockUi) {
          setSavingSettings(true);
        }

        try {
          const data = await invoke<AppSettings>("update_app_settings", { patch });
          setSettings(data);
          if (!options?.silent) {
            setNotice({ type: "ok", message: copy.notices.settingsUpdated });
          }
        } catch (error) {
          setNotice({ type: "error", message: copy.notices.updateSettingsFailed(String(error)) });
        } finally {
          if (shouldLockUi) {
            setSavingSettings(false);
          }
        }
      };

      const run = settingsUpdateQueueRef.current.then(task, task);
      settingsUpdateQueueRef.current = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    [copy.notices],
  );

  const refreshUsage = useCallback(async (quiet = false) => {
    try {
      if (!quiet) {
        setRefreshing(true);
      }
      const data = await invoke<AccountSummary[]>("refresh_all_usage", {
        forceAuthRefresh: !quiet,
      });
      setAccounts(data);
      if (!quiet) {
        setNotice({ type: "ok", message: copy.notices.usageRefreshed });
      }
    } catch (error) {
      if (!quiet) {
        setNotice({ type: "error", message: copy.notices.refreshFailed(String(error)) });
      }
    } finally {
      if (!quiet) {
        setRefreshing(false);
      }
    }
  }, [copy.notices]);

  const restoreAuthAfterAddFlow = useCallback(async () => {
    try {
      await invoke<boolean>("restore_auth_after_add_flow");
    } catch (error) {
      setNotice({ type: "error", message: copy.notices.restoreAuthFailed(String(error)) });
    }
  }, [copy.notices]);

  const applyImportResult = useCallback(
    async (result: ImportAccountsResult, prefix: string) => {
      const successCount = result.importedCount + result.updatedCount;
      if (successCount > 0) {
        await loadAccounts();
      }

      if (successCount > 0 && result.failures.length === 0) {
        setAddDialogOpen(false);
      }

      setNotice(buildImportNotice(result, prefix));
    },
    [loadAccounts],
  );

  useEffect(() => {
    installingUpdateRef.current = installingUpdate;
  }, [installingUpdate]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const ttl = notice.type === "error" ? 6_000 : 3_500;
    const timer = window.setTimeout(() => {
      setNotice((current) => (current === notice ? null : current));
    }, ttl);
    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(
    () => () => {
      if (deleteConfirmTimerRef.current !== null) {
        window.clearTimeout(deleteConfirmTimerRef.current);
        deleteConfirmTimerRef.current = null;
      }
    },
    [],
  );

  const installPendingUpdate = useCallback(
    async (knownUpdate?: NonNullable<Awaited<ReturnType<typeof check>>>) => {
      if (installingUpdateRef.current) {
        return;
      }

      setInstallingUpdate(true);
      setUpdateProgress(copy.notices.preparingUpdateDownload);
      try {
        const update = knownUpdate ?? (await check());
        if (!update) {
          setPendingUpdate(null);
          setUpdateDialogOpen(false);
          setNotice({ type: "ok", message: copy.notices.alreadyLatest });
          return;
        }

        let totalBytes = 0;
        let downloadedBytes = 0;
        await update.downloadAndInstall((event) => {
          if (event.event === "Started") {
            totalBytes = event.data.contentLength ?? 0;
            downloadedBytes = 0;
            setUpdateProgress(copy.notices.updateDownloadStarted);
          } else if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength;
            if (totalBytes > 0) {
              const percentValue = Math.min(
                100,
                Math.round((downloadedBytes / totalBytes) * 100),
              );
              setUpdateProgress(copy.notices.updateDownloadingPercent(percentValue));
            } else {
              setUpdateProgress(copy.notices.updateDownloading);
            }
          } else if (event.event === "Finished") {
            setUpdateProgress(copy.notices.updateDownloadFinished);
          }
        });

        setUpdateProgress(copy.notices.updateInstalling);
        await relaunch();
      } catch (error) {
        setNotice({ type: "error", message: copy.notices.updateInstallFailed(String(error)) });
        setUpdateProgress(null);
      } finally {
        setInstallingUpdate(false);
      }
    },
    [copy.notices],
  );

  const checkForAppUpdate = useCallback(
    async (quiet = false) => {
      if (!quiet) {
        setCheckingUpdate(true);
      }
      try {
        const update = await check();
        if (update) {
          setPendingUpdate({
            currentVersion: update.currentVersion,
            version: update.version,
            body: update.body,
            date: update.date,
          });
          setUpdateDialogOpen(true);
          if (!quiet) {
            setNotice({
              type: "info",
              message: copy.notices.foundNewVersion(update.version, update.currentVersion),
            });
          }
          void installPendingUpdate(update);
        } else {
          setPendingUpdate(null);
          setUpdateDialogOpen(false);
          if (!quiet) {
            setNotice({ type: "ok", message: copy.notices.alreadyLatest });
          }
        }
      } catch (error) {
        if (!quiet) {
          setNotice({ type: "error", message: copy.notices.updateCheckFailed(String(error)) });
        }
      } finally {
        if (!quiet) {
          setCheckingUpdate(false);
        }
      }
    },
    [copy.notices, installPendingUpdate],
  );

  const openManualDownloadPage = useCallback(async () => {
    try {
      await invoke("open_external_url", { url: MANUAL_DOWNLOAD_URL });
    } catch (error) {
      setNotice({ type: "error", message: copy.notices.openManualDownloadFailed(String(error)) });
    }
  }, [copy.notices]);

  const closeUpdateDialog = useCallback(() => {
    setUpdateDialogOpen(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await loadInstalledEditorApps();
        await loadSettings();
        await loadAccounts();
        await loadApiProxyStatus();
        await loadCloudflaredStatus();
        await refreshUsage(true);
        await checkForAppUpdate(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const usageTimer = setInterval(() => {
      void refreshUsage(true);
    }, REFRESH_MS);

    const editorTimer = setInterval(() => {
      void loadInstalledEditorApps();
    }, EDITOR_SCAN_MS);

    return () => {
      cancelled = true;
      clearInterval(usageTimer);
      clearInterval(editorTimer);
    };
  }, [
    checkForAppUpdate,
    loadAccounts,
    loadApiProxyStatus,
    loadCloudflaredStatus,
    loadInstalledEditorApps,
    loadSettings,
    refreshUsage,
  ]);

  useEffect(() => {
    if (!apiProxyStatus.running) {
      return;
    }

    const timer = setInterval(() => {
      void loadApiProxyStatus();
    }, API_PROXY_POLL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [apiProxyStatus.running, loadApiProxyStatus]);

  useEffect(() => {
    if (!cloudflaredStatus.running) {
      return;
    }

    const timer = setInterval(() => {
      void loadCloudflaredStatus();
    }, CLOUDFLARED_POLL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [cloudflaredStatus.running, loadCloudflaredStatus]);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | null = null;

    void listen("app-menu-check-update", () => {
      void checkForAppUpdate(false);
    })
      .then((fn) => {
        if (disposed) {
          void fn();
          return;
        }
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      if (unlisten) {
        void unlisten();
      }
    };
  }, [checkForAppUpdate]);

  useEffect(() => {
    if (!addFlow) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      if (cancelled || inFlight) {
        return;
      }
      inFlight = true;

      try {
        const current = await invoke<CurrentAuthStatus>("get_current_auth_status");
        if (!current.available || !current.fingerprint) {
          return;
        }

        if (current.fingerprint === addFlow.baselineFingerprint) {
          return;
        }

        await invoke<AccountSummary>("import_current_auth_account", { label: null });
        await restoreAuthAfterAddFlow();
        await refreshUsage(true);
        await loadAccounts();

        if (!cancelled) {
          setAddFlow(null);
          setAddDialogOpen(false);
          setNotice({ type: "ok", message: copy.notices.addAccountSuccess });
        }
      } catch (error) {
        await restoreAuthAfterAddFlow();
        if (!cancelled) {
          setAddFlow(null);
          setNotice({ type: "error", message: copy.notices.addAccountAutoImportFailed(String(error)) });
        }
      } finally {
        inFlight = false;
      }
    };

    void poll();

    const timer = setInterval(() => {
      void poll();
    }, ADD_FLOW_POLL_MS);

    const timeoutTimer = setTimeout(() => {
      if (!cancelled) {
        setAddFlow(null);
        void restoreAuthAfterAddFlow();
        setNotice({ type: "error", message: copy.notices.addAccountTimeout });
      }
    }, ADD_FLOW_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(timeoutTimer);
    };
  }, [addFlow, copy.notices, loadAccounts, refreshUsage, restoreAuthAfterAddFlow]);

  const onStartAddAccount = useCallback(async () => {
    if (addFlow || startingAdd || importingUpload) {
      return;
    }

    addFlowCancelledRef.current = false;
    setAddDialogOpen(true);
    setStartingAdd(true);
    try {
      const baseline = await invoke<CurrentAuthStatus>("get_current_auth_status");
      if (addFlowCancelledRef.current) {
        return;
      }
      await invoke<void>("launch_codex_login");
      if (addFlowCancelledRef.current) {
        await restoreAuthAfterAddFlow();
        return;
      }
      setAddFlow({
        baselineFingerprint: baseline.fingerprint,
      });
    } catch (error) {
      setNotice({ type: "error", message: copy.notices.startLoginFlowFailed(String(error)) });
    } finally {
      setStartingAdd(false);
    }
  }, [addFlow, copy.notices, importingUpload, restoreAuthAfterAddFlow, startingAdd]);

  const onOpenAddDialog = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const onCloseAddDialog = useCallback(() => {
    if (importingUpload) {
      return;
    }

    addFlowCancelledRef.current = true;
    if (addFlow) {
      setAddFlow(null);
      void restoreAuthAfterAddFlow();
    }
    setAddDialogOpen(false);
  }, [addFlow, importingUpload, restoreAuthAfterAddFlow]);

  const onImportAuthFiles = useCallback(
    async (items: AuthJsonImportInput[]) => {
      if (items.length === 0) {
        setNotice({ type: "error", message: "请选择要导入的 JSON 文件或文件夹。" });
        return;
      }

      setImportingUpload(true);
      try {
        const result = await invoke<ImportAccountsResult>("import_auth_json_accounts", {
          items,
        });
        await applyImportResult(result, "文件导入");
      } catch (error) {
        setNotice({ type: "error", message: `文件导入失败：${String(error)}` });
      } finally {
        setImportingUpload(false);
      }
    },
    [applyImportResult],
  );

  const onStartApiProxy = useCallback(async (port?: number | null) => {
    if (startingApiProxy || apiProxyStatus.running) {
      return;
    }

    setStartingApiProxy(true);
    try {
      const status = await invoke<ApiProxyStatus>("start_api_proxy", {
        port: port ?? null,
      });
      setApiProxyStatus(status);
      const target = status.port ? `127.0.0.1:${status.port}` : "本地端口";
      setNotice({ type: "ok", message: `API 反代已启动：${target}` });
    } catch (error) {
      setNotice({ type: "error", message: `启动 API 反代失败：${String(error)}` });
    } finally {
      setStartingApiProxy(false);
    }
  }, [apiProxyStatus.running, startingApiProxy]);

  const onStopApiProxy = useCallback(async () => {
    if (stoppingApiProxy || !apiProxyStatus.running) {
      return;
    }

    setStoppingApiProxy(true);
    try {
      const status = await invoke<ApiProxyStatus>("stop_api_proxy");
      setApiProxyStatus(status);
      setNotice({ type: "ok", message: "API 反代已停止" });
    } catch (error) {
      setNotice({ type: "error", message: `停止 API 反代失败：${String(error)}` });
    } finally {
      setStoppingApiProxy(false);
    }
  }, [apiProxyStatus.running, stoppingApiProxy]);

  const onRefreshApiProxyKey = useCallback(async () => {
    if (refreshingApiProxyKey) {
      return;
    }

    setRefreshingApiProxyKey(true);
    try {
      const status = await invoke<ApiProxyStatus>("refresh_api_proxy_key");
      setApiProxyStatus(status);
      setNotice({ type: "ok", message: "API Key 已刷新" });
    } catch (error) {
      setNotice({ type: "error", message: `刷新 API Key 失败：${String(error)}` });
    } finally {
      setRefreshingApiProxyKey(false);
    }
  }, [refreshingApiProxyKey]);

  const onInstallCloudflared = useCallback(async () => {
    if (installingCloudflared) {
      return;
    }

    setInstallingCloudflared(true);
    try {
      const status = await invoke<CloudflaredStatus>("install_cloudflared");
      setCloudflaredStatus(status);
      setNotice({ type: "ok", message: "cloudflared 安装完成" });
    } catch (error) {
      setNotice({ type: "error", message: `安装 cloudflared 失败：${String(error)}` });
    } finally {
      setInstallingCloudflared(false);
    }
  }, [installingCloudflared]);

  const onStartCloudflared = useCallback(async (input: StartCloudflaredTunnelInput) => {
    if (startingCloudflared || cloudflaredStatus.running) {
      return;
    }

    setStartingCloudflared(true);
    try {
      const status = await invoke<CloudflaredStatus>("start_cloudflared_tunnel", { input });
      setCloudflaredStatus(status);
      const target = status.publicUrl ?? "Cloudflare 公网地址";
      setNotice({ type: "ok", message: `公网隧道已启动：${target}` });
    } catch (error) {
      setNotice({ type: "error", message: `启动 cloudflared 公网访问失败：${String(error)}` });
    } finally {
      setStartingCloudflared(false);
    }
  }, [cloudflaredStatus.running, startingCloudflared]);

  const onStopCloudflared = useCallback(async () => {
    if (stoppingCloudflared || !cloudflaredStatus.running) {
      return;
    }

    setStoppingCloudflared(true);
    try {
      const status = await invoke<CloudflaredStatus>("stop_cloudflared_tunnel");
      setCloudflaredStatus(status);
      setNotice({ type: "ok", message: "cloudflared 公网访问已停止" });
    } catch (error) {
      setNotice({ type: "error", message: `停止 cloudflared 公网访问失败：${String(error)}` });
    } finally {
      setStoppingCloudflared(false);
    }
  }, [cloudflaredStatus.running, stoppingCloudflared]);

  const onDelete = useCallback(async (account: AccountSummary) => {
    if (pendingDeleteId !== account.id) {
      setPendingDeleteId(account.id);
      if (deleteConfirmTimerRef.current !== null) {
        window.clearTimeout(deleteConfirmTimerRef.current);
      }
      deleteConfirmTimerRef.current = window.setTimeout(() => {
        setPendingDeleteId((current) => (current === account.id ? null : current));
        deleteConfirmTimerRef.current = null;
      }, 5_000);
      setNotice({ type: "info", message: copy.notices.deleteConfirm(account.label) });
      return;
    }

    if (deleteConfirmTimerRef.current !== null) {
      window.clearTimeout(deleteConfirmTimerRef.current);
      deleteConfirmTimerRef.current = null;
    }
    setPendingDeleteId(null);

    try {
      await invoke<void>("delete_account", { id: account.id });
      setAccounts((prev) => prev.filter((item) => item.id !== account.id));
      setNotice({ type: "ok", message: copy.notices.accountDeleted });
    } catch (error) {
      setNotice({ type: "error", message: copy.notices.deleteFailed(String(error)) });
    }
  }, [copy.notices, pendingDeleteId]);

  const onSwitch = useCallback(
    async (account: AccountSummary) => {
      setSwitchingId(account.id);
      try {
        const result = await invoke<SwitchAccountResult>("switch_account_and_launch", {
          id: account.id,
          workspacePath: null,
          launchCodex: settings.launchCodexAfterSwitch,
          restartEditorsOnSwitch: settings.restartEditorsOnSwitch,
          restartEditorTargets: settings.restartEditorTargets,
        });
        await loadAccounts();

        let baseNotice: Notice;
        if (!settings.launchCodexAfterSwitch) {
          baseNotice = { type: "ok", message: copy.notices.switchedOnly };
        } else if (result.usedFallbackCli) {
          baseNotice = {
            type: "info",
            message: copy.notices.switchedAndLaunchByCli,
          };
        } else {
          baseNotice = { type: "ok", message: copy.notices.switchedAndLaunching };
        }

        if (settings.syncOpencodeOpenaiAuth) {
          if (result.opencodeSyncError) {
            baseNotice = {
              type: "error",
              message: copy.notices.opencodeSyncFailed(baseNotice.message, result.opencodeSyncError),
            };
          } else if (result.opencodeSynced) {
            baseNotice = {
              ...baseNotice,
              message: copy.notices.opencodeSynced(baseNotice.message),
            };
          }
        }

        if (settings.restartEditorsOnSwitch) {
          if (result.editorRestartError) {
            baseNotice = {
              type: "error",
              message: copy.notices.editorRestartFailed(baseNotice.message, result.editorRestartError),
            };
          } else if (result.restartedEditorApps.length > 0) {
            const restartedLabels = result.restartedEditorApps
              .map((id) => copy.editorAppLabels[id] ?? id)
              .join(" / ");
            baseNotice = {
              ...baseNotice,
              message: copy.notices.editorsRestarted(baseNotice.message, restartedLabels),
            };
          } else {
            baseNotice = {
              ...baseNotice,
              message: copy.notices.noEditorRestarted(baseNotice.message),
            };
          }
        }

        setNotice(baseNotice);
      } catch (error) {
        setNotice({ type: "error", message: copy.notices.switchFailed(String(error)) });
      } finally {
        setSwitchingId(null);
      }
    },
    [
      copy.editorAppLabels,
      copy.notices,
      loadAccounts,
      settings.launchCodexAfterSwitch,
      settings.syncOpencodeOpenaiAuth,
      settings.restartEditorsOnSwitch,
      settings.restartEditorTargets,
    ],
  );

  const onSmartSwitch = useCallback(async () => {
    if (switchingId) {
      return;
    }

    const target = pickBestRemainingAccount(sortedAccounts);
    if (!target) {
      setNotice({ type: "info", message: copy.notices.smartSwitchNoTarget });
      return;
    }
    if (target.isCurrent) {
      setNotice({
        type: "info",
        message: copy.notices.smartSwitchAlreadyBest,
      });
      return;
    }

    await onSwitch(target);
  }, [copy.notices, onSwitch, sortedAccounts, switchingId]);

  return {
    accounts: sortedAccounts,
    loading,
    refreshing,
    addDialogOpen,
    startingAdd,
    addFlow,
    importingUpload,
    apiProxyStatus,
    cloudflaredStatus,
    startingApiProxy,
    stoppingApiProxy,
    refreshingApiProxyKey,
    installingCloudflared,
    startingCloudflared,
    stoppingCloudflared,
    switchingId,
    pendingDeleteId,
    checkingUpdate,
    installingUpdate,
    updateProgress,
    pendingUpdate,
    updateDialogOpen,
    notice,
    settings,
    savingSettings,
    installedEditorApps,
    currentCount,
    refreshUsage,
    checkForAppUpdate,
    installPendingUpdate,
    openManualDownloadPage,
    closeUpdateDialog,
    updateSettings,
    onOpenAddDialog,
    onStartAddAccount,
    onCloseAddDialog,
    onImportAuthFiles,
    loadApiProxyStatus,
    onStartApiProxy,
    onStopApiProxy,
    onRefreshApiProxyKey,
    loadCloudflaredStatus,
    onInstallCloudflared,
    onStartCloudflared,
    onStopCloudflared,
    onDelete,
    onSwitch,
    onSmartSwitch,
    smartSwitching: switchingId !== null,
  };
}
