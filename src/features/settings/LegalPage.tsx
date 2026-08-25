import type { MessageKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { Section } from './Section';
import styles from './LegalPage.module.css';

type Clause = {
  title: MessageKey;
  body: MessageKey;
  link?: { href: string; label: MessageKey };
};

const CLAUSES: readonly Clause[] = [
  { title: 'legal.publisher.title', body: 'legal.publisher.body' },
  { title: 'legal.data.title', body: 'legal.data.body' },
  {
    // Le fichier est produit par « npm run licences » et servi depuis `public/`,
    // donc il voyage dans le même build que les fontes qu'il couvre. C'est ce que
    // l'OFL et la FFL demandent, et une clause qui les nomme sans les donner à
    // lire ne le ferait pas.
    title: 'legal.licences.title',
    body: 'legal.licences.body',
    link: { href: '/licences-tierces.txt', label: 'legal.licences.link' },
  },
];

export function LegalPage(): JSX.Element {
  const { t } = useI18n();

  return (
    <Section className={styles.page}>
      {CLAUSES.map((clause) => (
        <div key={clause.title} className={styles.clause}>
          <h3 className={styles.clauseTitle}>{t(clause.title)}</h3>
          <p className={styles.body}>{t(clause.body)}</p>
          {clause.link ? (
            <a className={styles.link} href={clause.link.href} target="_blank" rel="noreferrer">
              {t(clause.link.label)}
            </a>
          ) : null}
        </div>
      ))}
    </Section>
  );
}
