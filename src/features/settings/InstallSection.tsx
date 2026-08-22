import { useInstallPrompt } from '../../shared/hooks/use-install-prompt';
import { useI18n } from '../../shared/i18n/i18n';
import { Button } from '../../shared/ui/Button';
import { Section } from './Section';
import styles from './InstallSection.module.css';

export function InstallSection(): JSX.Element | null {
  const { t } = useI18n();
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <Section label={t('settings.install.title')}>
      <div className={styles.row}>
        <p className={styles.hint}>{t('settings.install.hint')}</p>
        <Button variant="outline" className={styles.action} onClick={() => void promptInstall()}>
          {t('settings.install.action')}
        </Button>
      </div>
    </Section>
  );
}
