import type { MessageKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Mark } from '../../shared/ui/Mark';
import styles from './IntroScreen.module.css';

export interface IntroScreenProps {
  onStart(): void;
  onMethod(): void;
}

// Three questions a stranger who was sent a link has, in the order they ask them:
// what does it do, what will it do to me, where does what I do go.
const POINTS: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'intro.what.title', body: 'intro.what.body' },
  { title: 'intro.quiet.title', body: 'intro.quiet.body' },
  { title: 'intro.local.title', body: 'intro.local.body' },
];

export function IntroScreen({ onStart, onMethod }: IntroScreenProps): JSX.Element {
  const { t } = useI18n();

  return (
    <section className={styles.intro}>
      <Card className={styles.card}>
        <p className={styles.name}>
          <Mark size={18} />
          {t('app.name')}
        </p>
        <h1 className={styles.lead}>{t('intro.lead')}</h1>

        <ul className={styles.points}>
          {POINTS.map((point) => (
            <li key={point.title} className={styles.point}>
              <h2 className={styles.pointTitle}>{t(point.title)}</h2>
              <p className={styles.pointBody}>{t(point.body)}</p>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <Button className={styles.start} onClick={onStart}>
            {t('intro.start')}
          </Button>
          <Button variant="quiet" className={styles.method} onClick={onMethod}>
            {t('intro.method')}
          </Button>
        </div>
      </Card>
    </section>
  );
}
