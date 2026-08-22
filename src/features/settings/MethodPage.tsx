import type { MessageKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { Section } from './Section';
import styles from './MethodPage.module.css';

const CLAUSES: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'method.origin.title', body: 'method.origin.body' },
  { title: 'method.attention.title', body: 'method.attention.body' },
  { title: 'method.breaks.title', body: 'method.breaks.body' },
  { title: 'method.numbers.title', body: 'method.numbers.body' },
];

// Cited in the order the sections lean on them. Titles stay in the language they
// were published in, as a citation should.
const REFERENCES: readonly { id: string; text: string; doi: string }[] = [
  {
    id: 'ariga',
    text: 'Ariga, A. & Lleras, A. (2011). Brief and rare mental “breaks” keep you focused: deactivation and reactivation of task goals preempt vigilance decrements. Cognition, 118(3), 439–443.',
    doi: '10.1016/j.cognition.2010.12.007',
  },
  {
    id: 'sievertsen',
    text: 'Sievertsen, H. H., Gino, F. & Piovesan, M. (2016). Cognitive fatigue influences students’ performance on standardized tests. PNAS, 113(10), 2621–2624.',
    doi: '10.1073/pnas.1516947113',
  },
  {
    id: 'albulescu',
    text: 'Albulescu, P., Macsinga, I., Rusu, A., Sulea, C., Bodnaru, A. & Tulbure, B. T. (2022). “Give me a break!” A systematic review and meta-analysis on the efficacy of micro-breaks for increasing well-being and performance. PLOS ONE, 17(8), e0272460.',
    doi: '10.1371/journal.pone.0272460',
  },
  {
    id: 'biwer',
    text: 'Biwer, F., Wiradhany, W., oude Egbrink, M. G. A. & de Bruin, A. B. H. (2023). Understanding effort regulation: comparing “Pomodoro” breaks and self-regulated breaks. British Journal of Educational Psychology, 93(S2), 353–367.',
    doi: '10.1111/bjep.12593',
  },
];

export function MethodPage(): JSX.Element {
  const { t } = useI18n();

  return (
    <>
      <Section className={styles.page}>
        <p className={styles.lead}>{t('method.lead')}</p>
        {CLAUSES.map((clause) => (
          <div key={clause.title} className={styles.clause}>
            <h3 className={styles.clauseTitle}>{t(clause.title)}</h3>
            <p className={styles.body}>{t(clause.body)}</p>
          </div>
        ))}
      </Section>

      <Section label={t('method.references.title')} className={styles.references}>
        <ul className={styles.list}>
          {REFERENCES.map((reference) => (
            <li key={reference.id} className={styles.reference}>
              <p className={styles.citation}>{reference.text}</p>
              <a
                className={styles.doi}
                href={`https://doi.org/${reference.doi}`}
                target="_blank"
                rel="noreferrer"
              >
                doi.org/{reference.doi}
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>{t('method.references.hint')}</p>
      </Section>
    </>
  );
}
