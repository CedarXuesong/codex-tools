import type { KeyboardEvent } from "react";
import { useI18n } from "../i18n/I18nProvider";
import type { AccountSummary } from "../types/app";
import {
  formatPlan,
  formatResetAt,
  formatWindowLabel,
  percent,
  planTone,
  remainingPercent,
  toProgressWidth,
} from "../utils/usage";

type AccountCardProps = {
  account: AccountSummary;
  isSwitching: boolean;
  isDeletePending: boolean;
  onSwitch: (account: AccountSummary) => void;
  onDelete: (account: AccountSummary) => void;
};

function LaunchIcon({ spinning }: { spinning: boolean }) {
  if (spinning) {
    return (
      <svg
        className="iconGlyph isSpinning"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    );
  }

  return (
    <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 5v14l11-7z" />
    </svg>
  );
}

export function AccountCard({
  account,
  isSwitching,
  isDeletePending,
  onSwitch,
  onDelete,
}: AccountCardProps) {
  const { copy, locale } = useI18n();
  const usage = account.usage;
  const fiveHour = usage?.fiveHour ?? null;
  const oneWeek = usage?.oneWeek ?? null;
  const normalizedPlan = account.planType || usage?.planType;
  const planLabel = formatPlan(normalizedPlan, copy.accountCard.planLabels);
  const tone = planTone(normalizedPlan);
  const launchLabel = isSwitching ? copy.accountCard.launching : copy.accountCard.launch;

  const handleLaunch = () => {
    if (isSwitching) return;
    onSwitch(account);
  };

  const handleLaunchKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleLaunch();
    }
  };

  return (
    <article
      className={`accountCard tone-${tone} ${account.isCurrent ? "isCurrent" : ""} ${
        isSwitching ? "isSwitching" : ""
      }`}
    >
      <div className="stamps">
        <span className="stamp stampPlan">{planLabel}</span>
        {account.isCurrent && <span className="stamp stampCurrent">{copy.accountCard.currentStamp}</span>}
      </div>
      <button
        className={`cardDeleteIcon ${isDeletePending ? "isPending" : ""}`}
        onClick={() => onDelete(account)}
        aria-label={isDeletePending ? copy.accountCard.deleteConfirm : copy.accountCard.delete}
        title={isDeletePending ? copy.accountCard.deleteConfirm : copy.accountCard.delete}
      >
        <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
      <div className="cardHead">
        <div>
          <h3 className={account.isCurrent ? "nameCurrent" : ""}>{account.label}</h3>
        </div>
      </div>

      <div className="usageRow">
        <div className="usageTitle">
          <span>
            {formatWindowLabel(fiveHour, {
              fallback: copy.accountCard.fiveHourFallback,
              oneWeek: copy.accountCard.oneWeekLabel,
              hourSuffix: copy.accountCard.hourSuffix,
              minuteSuffix: copy.accountCard.minuteSuffix,
            })}
          </span>
          <div className="usageStats">
            <strong>
              {copy.accountCard.used} {percent(fiveHour?.usedPercent)}
            </strong>
            <em>
              {copy.accountCard.remaining} {percent(remainingPercent(fiveHour))}
            </em>
          </div>
        </div>
        <div className="barTrack">
          <div className="barFill hot" style={{ width: toProgressWidth(fiveHour?.usedPercent) }} />
        </div>
        <small>
          {copy.accountCard.resetAt}：{formatResetAt(fiveHour?.resetAt, locale)}
        </small>
      </div>

      <div className="usageRow">
        <div className="usageTitle">
          <span>
            {formatWindowLabel(oneWeek, {
              fallback: copy.accountCard.oneWeekFallback,
              oneWeek: copy.accountCard.oneWeekLabel,
              hourSuffix: copy.accountCard.hourSuffix,
              minuteSuffix: copy.accountCard.minuteSuffix,
            })}
          </span>
          <div className="usageStats">
            <strong>
              {copy.accountCard.used} {percent(oneWeek?.usedPercent)}
            </strong>
            <em>
              {copy.accountCard.remaining} {percent(remainingPercent(oneWeek))}
            </em>
          </div>
        </div>
        <div className="barTrack">
          <div className="barFill cool" style={{ width: toProgressWidth(oneWeek?.usedPercent) }} />
        </div>
        <small>
          {copy.accountCard.resetAt}：{formatResetAt(oneWeek?.resetAt, locale)}
        </small>
      </div>

      {usage?.credits && (
        <p className="credits">
          {copy.accountCard.credits}:{" "}
          {usage.credits.unlimited ? copy.accountCard.unlimited : usage.credits.balance ?? "--"}
        </p>
      )}

      {account.usageError && <p className="errorText">{account.usageError}</p>}

      <div className="cardHoverOverlay">
        <span
          className={`launchOverlayIcon ${isSwitching ? "isDisabled" : ""}`}
          role="button"
          tabIndex={isSwitching ? -1 : 0}
          onClick={handleLaunch}
          onKeyDown={handleLaunchKeyDown}
          aria-label={launchLabel}
          aria-disabled={isSwitching}
          title={isSwitching ? `${copy.accountCard.launching}...` : copy.accountCard.launch}
        >
          <LaunchIcon spinning={isSwitching} />
        </span>
      </div>
    </article>
  );
}
