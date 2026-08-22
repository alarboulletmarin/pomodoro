import { useI18n } from '../../shared/i18n/i18n';
import { useAppUpdate } from '../../shared/pwa/update-provider';
import { Button } from '../../shared/ui/Button';
import { Section } from './Section';
import styles from './UpdateSection.module.css';

/**
 * Le bandeau se ferme et ne revient pas ; ce bouton-ci ne bouge pas. Sur un
 * téléphone, c'est le seul endroit qui remplace « vider le cache ».
 */
export function UpdateSection(): JSX.Element {
  const { t } = useI18n();
  const { ready, checking, checkedAt, check, reload } = useAppUpdate();

  const label = ready
    ? t('update.reload')
    : checking
      ? t('update.checking')
      : checkedAt === null
        ? t('update.check')
        : t('update.upToDate');

  return (
    <Section label={t('settings.update.title')}>
      <div className={styles.row}>
        <span className={styles.version}>
          {t('settings.version', { version: __APP_VERSION__ })}
        </span>
        <Button
          variant={ready ? 'primary' : 'outline'}
          className={styles.action}
          disabled={checking || (!ready && checkedAt !== null)}
          onClick={ready ? reload : check}
        >
          {label}
        </Button>
      </div>
      <p className={styles.hint}>{t('settings.update.hint')}</p>
    </Section>
  );
}
