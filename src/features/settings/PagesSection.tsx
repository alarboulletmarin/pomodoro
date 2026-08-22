import type { MessageKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { Section } from './Section';
import styles from './PagesSection.module.css';

export type SubPage = 'method' | 'about' | 'legal';

export interface PagesSectionProps {
  onOpen(page: SubPage): void;
}

const PAGES: readonly { page: SubPage; label: MessageKey }[] = [
  { page: 'method', label: 'settings.method' },
  { page: 'about', label: 'settings.about' },
  { page: 'legal', label: 'settings.legal' },
];

export function PagesSection({ onOpen }: PagesSectionProps): JSX.Element {
  const { t } = useI18n();

  return (
    <Section className={styles.section}>
      {PAGES.map(({ page, label }) => (
        <button key={page} type="button" className={styles.row} onClick={() => onOpen(page)}>
          <span className={styles.label}>{t(label)}</span>
          <span className={styles.chevron} aria-hidden="true">
            ›
          </span>
        </button>
      ))}
    </Section>
  );
}
