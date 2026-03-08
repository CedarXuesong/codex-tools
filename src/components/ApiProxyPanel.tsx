import { useState } from "react";

import type {
  ApiProxyStatus,
  CloudflaredStatus,
  CloudflaredTunnelMode,
  StartCloudflaredTunnelInput,
} from "../types/app";

const DEFAULT_PROXY_PORT = "8787";
const QUICK_TUNNEL_NOTE =
  "临时 URL 会在每次重启后变化。Cloudflare 官方文档说明 Quick Tunnel 不支持 SSE。";

type ApiProxyPanelProps = {
  status: ApiProxyStatus;
  cloudflaredStatus: CloudflaredStatus;
  accountCount: number;
  starting: boolean;
  stopping: boolean;
  refreshingApiKey: boolean;
  installingCloudflared: boolean;
  startingCloudflared: boolean;
  stoppingCloudflared: boolean;
  onStart: (port: number | null) => void;
  onStop: () => void;
  onRefreshApiKey: () => void;
  onRefresh: () => void;
  onRefreshCloudflared: () => void;
  onInstallCloudflared: () => void;
  onStartCloudflared: (input: StartCloudflaredTunnelInput) => void;
  onStopCloudflared: () => void;
};

const PANEL_COPY = {
  kicker: "Codex Proxy",
  title: "API反代",
  hint: "按余量自动挑选可代理的 Codex 账号",
  startButton: "启动 API 反代",
} as const;

function copyText(value: string | null) {
  if (!value) {
    return;
  }
  void navigator.clipboard?.writeText(value).catch(() => {});
}

export function ApiProxyPanel({
  status,
  cloudflaredStatus,
  accountCount,
  starting,
  stopping,
  refreshingApiKey,
  installingCloudflared,
  startingCloudflared,
  stoppingCloudflared,
  onStart,
  onStop,
  onRefreshApiKey,
  onRefresh,
  onRefreshCloudflared,
  onInstallCloudflared,
  onStartCloudflared,
  onStopCloudflared,
}: ApiProxyPanelProps) {
  const busy = starting || stopping;
  const cloudflaredBusy = installingCloudflared || startingCloudflared || stoppingCloudflared;
  const [portInput, setPortInput] = useState(DEFAULT_PROXY_PORT);
  const [publicAccessEnabled, setPublicAccessEnabled] = useState(cloudflaredStatus.running);
  const [tunnelMode, setTunnelMode] = useState<CloudflaredTunnelMode>(
    cloudflaredStatus.tunnelMode ?? "quick",
  );
  const [useHttp2, setUseHttp2] = useState(cloudflaredStatus.useHttp2);
  const [namedInput, setNamedInput] = useState({
    apiToken: "",
    accountId: "",
    zoneId: "",
    hostname: cloudflaredStatus.customHostname ?? "",
  });
  const cloudflaredEnabled = publicAccessEnabled || cloudflaredStatus.running;

  const rawPort = portInput.trim();
  const effectivePort = !rawPort
    ? 8787
    : Number.isInteger(Number(rawPort)) && Number(rawPort) >= 1 && Number(rawPort) <= 65535
      ? Number(rawPort)
      : null;

  const namedReady =
    namedInput.apiToken.trim() !== "" &&
    namedInput.accountId.trim() !== "" &&
    namedInput.zoneId.trim() !== "" &&
    namedInput.hostname.trim() !== "";

  const canStartCloudflared =
    status.running &&
    status.port !== null &&
    cloudflaredStatus.installed &&
    !cloudflaredBusy &&
    (tunnelMode === "quick" || namedReady);

  const cloudflaredInput: StartCloudflaredTunnelInput | null =
    status.port === null
      ? null
      : {
          apiProxyPort: status.port,
          useHttp2,
          mode: tunnelMode,
          named:
            tunnelMode === "named"
              ? {
                  apiToken: namedInput.apiToken.trim(),
                  accountId: namedInput.accountId.trim(),
                  zoneId: namedInput.zoneId.trim(),
                  hostname: namedInput.hostname.trim(),
                }
              : null,
        };

  return (
    <section className="proxyPage">
      <div className="proxyHero">
        <div>
          <p className="proxyKicker">{PANEL_COPY.kicker}</p>
          <h2>{PANEL_COPY.title}</h2>
          <div className="proxyHeroBody proxyHeroStats">
            <span className="proxyHeroStat">
              <span className={`proxyStatusDot${status.running ? " isRunning" : ""}`} aria-hidden="true" />
              状态：<strong>{status.running ? "运行中" : "未启动"}</strong>
            </span>
            <span className="proxyHeroStat">
              端口：<strong>{status.port ?? "--"}</strong>
            </span>
            <span className="proxyHeroStat">
              可用账号：<strong>{accountCount}</strong>
            </span>
          </div>
        </div>
        <div className="proxyHeroActions">
          <label className="proxyPortField">
            <input
              className="proxyPortInput"
              inputMode="numeric"
              aria-label="代理端口"
              placeholder={DEFAULT_PROXY_PORT}
              value={portInput}
              onChange={(event) => setPortInput(event.target.value)}
              disabled={busy || status.running}
            />
          </label>
          <button className="ghost" onClick={onRefresh} disabled={busy}>
            刷新状态
          </button>
          {status.running ? (
            <button className="danger" onClick={onStop} disabled={busy}>
              {stopping ? "停止中..." : "停止反代"}
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => onStart(effectivePort)}
              disabled={busy || accountCount === 0 || effectivePort === null}
            >
              {starting ? "启动中..." : PANEL_COPY.startButton}
            </button>
          )}
        </div>
      </div>

      <div className="proxyDetailGrid">
        <article className="proxyDetailCard">
          <div className="proxyDetailHeader">
            <span className="proxyLabel">Base URL</span>
            <button className="ghost proxyCopyButton" onClick={() => copyText(status.baseUrl)} disabled={!status.baseUrl}>
              复制
            </button>
          </div>
          <code>{status.baseUrl ?? "启动后生成"}</code>
        </article>

        <article className="proxyDetailCard">
          <div className="proxyDetailHeader">
            <span className="proxyLabel">API Key</span>
            <div className="proxyDetailActions">
              <button
                className="ghost proxyCopyButton"
                onClick={onRefreshApiKey}
                disabled={refreshingApiKey}
              >
                {refreshingApiKey ? "刷新中..." : "刷新"}
              </button>
              <button className="ghost proxyCopyButton" onClick={() => copyText(status.apiKey)} disabled={!status.apiKey}>
                复制
              </button>
            </div>
          </div>
          <code>{status.apiKey ?? "首次启动后生成"}</code>
        </article>

        <article className="proxyDetailCard">
          <span className="proxyLabel">当前路由账号</span>
          <strong>{status.activeAccountLabel ?? "尚未命中请求"}</strong>
          <p>{status.activeAccountId ?? "收到请求后会显示当前使用的账号"}</p>
        </article>

        <article className="proxyDetailCard">
          <span className="proxyLabel">最近错误</span>
          <p className="proxyErrorText">{status.lastError ?? "暂无"}</p>
        </article>
      </div>

      <section className="cloudflaredSection">
        <div className="cloudflaredHeader">
          <div>
            <p className="proxyKicker">Cloudflared</p>
            <h3>公网访问</h3>
            <p className="cloudflaredBody">把当前本地代理继续暴露到公网，适合临时联调或固定域名接入。</p>
          </div>
          <label className="cloudflaredToggle">
            <input
              type="checkbox"
              checked={publicAccessEnabled}
              onChange={(event) => setPublicAccessEnabled(event.target.checked)}
            />
            <span>启用 cloudflared 公网访问</span>
          </label>
        </div>

        {cloudflaredEnabled ? (
          <div className="cloudflaredContent">
            {!status.running ? (
              <article className="cloudflaredCallout">
                <strong>请先启动本地代理</strong>
                <p>cloudflared 只会把当前本机代理端口转发出去，所以需要先启动上面的本地代理。</p>
              </article>
            ) : null}

            {!cloudflaredStatus.installed ? (
              <article className="cloudflaredInstallCard">
                <div>
                  <span className="proxyLabel">cloudflared 未安装</span>
                  <strong>需要先安装 cloudflared</strong>
                  <p>安装完成后才能选择快速隧道或命名隧道。</p>
                </div>
                <button className="primary" onClick={onInstallCloudflared} disabled={installingCloudflared}>
                  {installingCloudflared ? "安装中..." : "一键安装 cloudflared"}
                </button>
              </article>
            ) : (
              <>
                <div className="cloudflaredModeGrid">
                  <button
                    className={`cloudflaredModeCard${tunnelMode === "quick" ? " isActive" : ""}`}
                    onClick={() => setTunnelMode("quick")}
                    disabled={cloudflaredBusy || cloudflaredStatus.running}
                  >
                    <span className="proxyLabel">快速隧道</span>
                    <strong>临时 URL</strong>
                    <p>自动生成 `*.trycloudflare.com`，无需账号，重启后 URL 会变化。</p>
                  </button>
                  <button
                    className={`cloudflaredModeCard${tunnelMode === "named" ? " isActive" : ""}`}
                    onClick={() => setTunnelMode("named")}
                    disabled={cloudflaredBusy || cloudflaredStatus.running}
                  >
                    <span className="proxyLabel">命名隧道</span>
                    <strong>固定域名</strong>
                    <p>使用 Cloudflare API Token，支持自定义域名，公网 URL 保持不变。</p>
                  </button>
                </div>

                {tunnelMode === "quick" ? (
                  <article className="cloudflaredCallout">
                    <strong>Quick Tunnel 提示</strong>
                    <p>{QUICK_TUNNEL_NOTE}</p>
                  </article>
                ) : null}

                {tunnelMode === "named" ? (
                  <div className="cloudflaredFormGrid">
                    <label className="cloudflaredInputField">
                      <span>Cloudflare API Token</span>
                      <input
                        type="password"
                        value={namedInput.apiToken}
                        onChange={(event) =>
                          setNamedInput((current) => ({ ...current, apiToken: event.target.value }))
                        }
                        placeholder="需要 Tunnel Edit + DNS Edit 权限"
                        disabled={cloudflaredBusy || cloudflaredStatus.running}
                      />
                    </label>
                    <label className="cloudflaredInputField">
                      <span>Account ID</span>
                      <input
                        value={namedInput.accountId}
                        onChange={(event) =>
                          setNamedInput((current) => ({ ...current, accountId: event.target.value }))
                        }
                        placeholder="Cloudflare Account ID"
                        disabled={cloudflaredBusy || cloudflaredStatus.running}
                      />
                    </label>
                    <label className="cloudflaredInputField">
                      <span>Zone ID</span>
                      <input
                        value={namedInput.zoneId}
                        onChange={(event) =>
                          setNamedInput((current) => ({ ...current, zoneId: event.target.value }))
                        }
                        placeholder="Zone ID"
                        disabled={cloudflaredBusy || cloudflaredStatus.running}
                      />
                    </label>
                    <label className="cloudflaredInputField">
                      <span>自定义域名</span>
                      <input
                        value={namedInput.hostname}
                        onChange={(event) =>
                          setNamedInput((current) => ({ ...current, hostname: event.target.value }))
                        }
                        placeholder="api.example.com"
                        disabled={cloudflaredBusy || cloudflaredStatus.running}
                      />
                    </label>
                  </div>
                ) : null}

                <div className="cloudflaredToolbar">
                  <label className="cloudflaredCheckbox">
                    <input
                      type="checkbox"
                      checked={useHttp2}
                      onChange={(event) => setUseHttp2(event.target.checked)}
                      disabled={cloudflaredBusy || cloudflaredStatus.running}
                    />
                    <span>使用 HTTP/2</span>
                  </label>
                  <div className="cloudflaredToolbarActions">
                    <button className="ghost" onClick={onRefreshCloudflared} disabled={cloudflaredBusy}>
                      刷新公网状态
                    </button>
                    {cloudflaredStatus.running ? (
                      <button className="danger" onClick={onStopCloudflared} disabled={cloudflaredBusy}>
                        {stoppingCloudflared ? "停止中..." : "停止公网访问"}
                      </button>
                    ) : (
                      <button
                        className="primary"
                        onClick={() => {
                          if (cloudflaredInput) {
                            onStartCloudflared(cloudflaredInput);
                          }
                        }}
                        disabled={!canStartCloudflared || cloudflaredInput === null}
                      >
                        {startingCloudflared ? "启动中..." : "启动公网访问"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="proxyDetailGrid">
                  <article className="proxyDetailCard">
                    <span className="proxyLabel">公网状态</span>
                    <strong className={`proxyStatus${cloudflaredStatus.running ? " isRunning" : ""}`}>
                      {cloudflaredStatus.running ? "运行中" : "未启动"}
                    </strong>
                    <p>{cloudflaredStatus.running ? "cloudflared 正在把本地反代暴露到公网" : "启动后会生成公网访问地址"}</p>
                  </article>

                  <article className="proxyDetailCard">
                    <div className="proxyDetailHeader">
                      <span className="proxyLabel">公网 URL</span>
                      <button
                        className="ghost proxyCopyButton"
                        onClick={() => copyText(cloudflaredStatus.publicUrl)}
                        disabled={!cloudflaredStatus.publicUrl}
                      >
                        复制
                      </button>
                    </div>
                    <code>{cloudflaredStatus.publicUrl ?? "启动后生成"}</code>
                  </article>

                  <article className="proxyDetailCard">
                    <span className="proxyLabel">安装路径</span>
                    <code>{cloudflaredStatus.binaryPath ?? "未检测到"}</code>
                  </article>

                  <article className="proxyDetailCard">
                    <span className="proxyLabel">最近错误</span>
                    <p className="proxyErrorText">{cloudflaredStatus.lastError ?? "暂无"}</p>
                  </article>
                </div>
              </>
            )}
          </div>
        ) : null}
      </section>
    </section>
  );
}
