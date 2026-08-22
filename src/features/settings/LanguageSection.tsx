import type { Locale } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { Section } from './Section';
import styles from './LanguageSection.module.css';

const LOCALES: readonly Locale[] = ['fr', 'en'];

export function LanguageSection(): JSX.Element {
  const { lang, setLang, t } = useI18n();

  return (
    <Section label={t('settings.language.title')}>
      <div className={styles.chips}>
        {LOCALES.map((locale) => {
          const selected = locale === lang;
          return (
            <button
              key={locale}
              type="button"
              className={selected ? `${styles.chip} ${styles.selected}` : styles.chip}
              aria-pressed={selected}
              onClick={() => setLang(locale)}
            >
              {t(`settings.language.${locale}`)}
            </button>
          );
        })}
      </div>
    </Section>
  );
}
