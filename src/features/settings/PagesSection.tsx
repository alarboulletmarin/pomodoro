import { useI18n } from '../../shared/i18n/i18n';
import { Section } from './Section';
import styles from './PagesSection.module.css';

export type SubPage = 'about' | 'legal';

export interface PagesSectionProps {
  onOpen(page: SubPage): void;
}

const PAGES: readonly SubPage[] = ['about', 'legal'];

export function PagesSection({ onOpen }: PagesSectionProps): JSX.Element {
  const { t } = useI18n();

  return (
    <Section className={styles.section}>
      {PAGES.map((page) => (
        <button key={page} type="button" className={styles.row} onClick={() => onOpen(page)}>
          <span className={styles.label}>
            {page === 'about' ? t('settings.about') : t('settings.legal')}
          </span>
          <span className={styles.chevron} aria-hidden="true">
            ›
          </span>
        </button>
      ))}
    </Section>
  );
}
