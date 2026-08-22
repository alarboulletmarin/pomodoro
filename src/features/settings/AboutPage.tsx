import { useI18n } from '../../shared/i18n/i18n';
import { Section } from './Section';
import styles from './AboutPage.module.css';

export function AboutPage(): JSX.Element {
  const { t } = useI18n();

  return (
    <Section className={styles.page}>
      <p className={styles.lead}>{t('about.lead')}</p>
      <p className={styles.body}>{t('about.body1')}</p>
      <p className={styles.body}>{t('about.body2')}</p>
    </Section>
  );
}
