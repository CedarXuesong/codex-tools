import type { AccountSummary } from "../types/app";
import { useI18n } from "../i18n/I18nProvider";
import { AccountCard } from "./AccountCard";

type AccountsGridProps = {
  accounts: AccountSummary[];
  loading: boolean;
  switchingId: string | null;
  pendingDeleteId: string | null;
  onSwitch: (account: AccountSummary) => void;
  onDelete: (account: AccountSummary) => void;
};

export function AccountsGrid({
  accounts,
  loading,
  switchingId,
  pendingDeleteId,
  onSwitch,
  onDelete,
}: AccountsGridProps) {
  const { copy } = useI18n();

  return (
    <section className="cards" aria-busy={loading}>
      {accounts.length === 0 && !loading && (
        <div className="emptyState">
          <h3>{copy.accountsGrid.emptyTitle}</h3>
          <p>{copy.accountsGrid.emptyDescription}</p>
        </div>
      )}

      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          isSwitching={switchingId === account.id}
          isDeletePending={pendingDeleteId === account.id}
          onSwitch={onSwitch}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}
