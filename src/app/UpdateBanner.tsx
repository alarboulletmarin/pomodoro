import { useI18n } from '../shared/i18n/i18n';
import { useAppUpdate } from '../shared/pwa/update-provider';
import { Button } from '../shared/ui/Button';
import styles from './UpdateBanner.module.css';

/**
 * Le seul message que l'app s'autorise à faire apparaître de lui-même. Il ne
 * recouvre jamais une session en cours — la coquille ne le monte pas — et il
 * ne recharge rien sans qu'on le demande.
 */
export function UpdateBanner(): JSX.Element | null {
  const { t } = useI18n();
  const { notice, reload, dismiss } = useAppUpdate();

  if (!notice) return null;

  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>{t('update.ready')}</p>
      <div className={styles.actions}>
        <Button variant="quiet" className={styles.later} onClick={dismiss}>
          {t('update.later')}
        </Button>
        <Button variant="outline" className={styles.reload} onClick={reload}>
          {t('update.reload')}
        </Button>
      </div>
    </div>
  );
}
