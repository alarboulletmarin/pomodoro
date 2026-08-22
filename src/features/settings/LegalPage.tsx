import type { MessageKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { Section } from './Section';
import styles from './LegalPage.module.css';

const CLAUSES: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'legal.publisher.title', body: 'legal.publisher.body' },
  { title: 'legal.data.title', body: 'legal.data.body' },
  { title: 'legal.licences.title', body: 'legal.licences.body' },
];

export function LegalPage(): JSX.Element {
  const { t } = useI18n();

  return (
    <Section className={styles.page}>
      {CLAUSES.map((clause) => (
        <div key={clause.title} className={styles.clause}>
          <h3 className={styles.clauseTitle}>{t(clause.title)}</h3>
          <p className={styles.body}>{t(clause.body)}</p>
        </div>
      ))}
    </Section>
  );
}
