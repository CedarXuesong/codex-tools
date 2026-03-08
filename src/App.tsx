import { useEffect, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import "./App.css";
import { ApiProxyPanel } from "./components/ApiProxyPanel";
import { AddAccountSection } from "./components/AddAccountSection";
import { AddAccountDialog } from "./components/AddAccountDialog";
import { AccountsGrid } from "./components/AccountsGrid";
import { AppTopBar } from "./components/AppTopBar";
import { BottomDock } from "./components/BottomDock";
import { MetaStrip } from "./components/MetaStrip";
import { NoticeBanner } from "./components/NoticeBanner";
import { SettingsPanel } from "./components/SettingsPanel";
import { UpdateBanner } from "./components/UpdateBanner";
import { useCodexController } from "./hooks/useCodexController";
import { useThemeMode } from "./hooks/useThemeMode";

type AppTab = "accounts" | "proxy";

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("accounts");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { themeMode, toggleTheme } = useThemeMode();
  const {
    accounts,
    loading,
    refreshing,
    addDialogOpen,
    startingAdd,
    addFlow,
    importingUpload,
    switchingId,
    pendingDeleteId,
    installingUpdate,
    updateProgress,
    pendingUpdate,
    updateDialogOpen,
    notice,
    settings,
    installedEditorApps,
    savingSettings,
    currentCount,
    apiProxyStatus,
    cloudflaredStatus,
    startingApiProxy,
    stoppingApiProxy,
    refreshingApiProxyKey,
    installingCloudflared,
    startingCloudflared,
    stoppingCloudflared,
    refreshUsage,
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
    smartSwitching,
  } = useCodexController();

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | null = null;
    void listen("app-menu-open-settings", () => {
      setSettingsOpen(true);
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
  }, []);

  return (
    <div className="shell">
      <div className="ambient" />
      <main className="panel">
        <AppTopBar
          onRefresh={() => void refreshUsage(false)}
          refreshing={refreshing}
        />

        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          settings={settings}
          installedEditorApps={installedEditorApps}
          savingSettings={savingSettings}
          onUpdateSettings={(patch, options) => void updateSettings(patch, options)}
        />

        <MetaStrip accountCount={accounts.length} currentCount={currentCount} />

        <AddAccountDialog
          open={addDialogOpen}
          startingAdd={startingAdd}
          addFlowActive={Boolean(addFlow)}
          importingUpload={importingUpload}
          onStartOauth={onStartAddAccount}
          onImportFiles={onImportAuthFiles}
          onClose={onCloseAddDialog}
        />

        <NoticeBanner notice={notice} />
        <UpdateBanner
          open={updateDialogOpen}
          pendingUpdate={pendingUpdate}
          updateProgress={updateProgress}
          installingUpdate={installingUpdate}
          onClose={closeUpdateDialog}
          onManualDownload={() => void openManualDownloadPage()}
          onRetryAutoDownload={() => void installPendingUpdate()}
        />

        <section className="viewStage">
          {activeTab === "accounts" ? (
            <>
              <AddAccountSection
                startingAdd={startingAdd}
                addFlowActive={Boolean(addFlow)}
                onOpenAddDialog={onOpenAddDialog}
                onSmartSwitch={() => void onSmartSwitch()}
                smartSwitching={smartSwitching}
              />
              <AccountsGrid
                accounts={accounts}
                loading={loading}
                switchingId={switchingId}
                pendingDeleteId={pendingDeleteId}
                onSwitch={(account) => void onSwitch(account)}
                onDelete={(account) => void onDelete(account)}
              />
            </>
          ) : (
            <ApiProxyPanel
              status={apiProxyStatus}
              cloudflaredStatus={cloudflaredStatus}
              accountCount={accounts.length}
              starting={startingApiProxy}
              stopping={stoppingApiProxy}
              refreshingApiKey={refreshingApiProxyKey}
              installingCloudflared={installingCloudflared}
              startingCloudflared={startingCloudflared}
              stoppingCloudflared={stoppingCloudflared}
              onStart={(port) => void onStartApiProxy(port)}
              onStop={() => void onStopApiProxy()}
              onRefreshApiKey={() => void onRefreshApiProxyKey()}
              onRefresh={() => void loadApiProxyStatus()}
              onRefreshCloudflared={() => void loadCloudflaredStatus()}
              onInstallCloudflared={() => void onInstallCloudflared()}
              onStartCloudflared={(input) => void onStartCloudflared(input)}
              onStopCloudflared={() => void onStopCloudflared()}
            />
          )}
        </section>
      </main>
      <BottomDock activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}

export default App;
