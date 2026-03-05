import { useI18n } from "../i18n/I18nProvider";

type MetaStripProps = {
  accountCount: number;
  currentCount: number;
};

export function MetaStrip({ accountCount, currentCount }: MetaStripProps) {
  const { copy } = useI18n();

  return (
    <section className="metaStrip" aria-label={copy.metaStrip.ariaLabel}>
      <article className="metaPill">
        <span>{copy.metaStrip.accountCount}</span>
        <strong>{accountCount}</strong>
      </article>
      <article className="metaPill">
        <span>{copy.metaStrip.currentActive}</span>
        <strong>{currentCount}</strong>
      </article>
    </section>
  );
}
