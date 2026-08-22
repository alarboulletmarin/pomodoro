import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { Section } from './Section';
import styles from './SoundSection.module.css';

export function SoundSection(): JSX.Element {
  const { t } = useI18n();
  const { settings, setChime } = useSettings();
  const { chime } = settings;

  return (
    <Section label={t('settings.sound.title')}>
      <button
        type="button"
        role="switch"
        aria-checked={chime}
        className={styles.row}
        onClick={() => setChime(!chime)}
      >
        <span className={styles.name}>{t('settings.sound.chime')}</span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.knob} />
        </span>
      </button>
      <p className={styles.hint}>{t('settings.sound.hint')}</p>
    </Section>
  );
}
