import type { ChimeVolume } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { playChime, primeChime } from '../timer/chime';
import { Button } from '../../shared/ui/Button';
import { Section } from './Section';
import styles from './SoundSection.module.css';

const VOLUMES: readonly ChimeVolume[] = ['soft', 'normal', 'loud'];

export function SoundSection(): JSX.Element {
  const { t } = useI18n();
  const { settings, setChime, setChimeVolume } = useSettings();
  const { chime, chimeVolume } = settings;

  return (
    <Section label={t('settings.sound.title')}>
      <button
        type="button"
        role="switch"
        aria-checked={chime}
        className={styles.row}
        onClick={() => {
          // Turning the chime on is a gesture: seize it, iOS accepts no other moment.
          if (!chime) primeChime(chimeVolume);
          setChime(!chime);
        }}
      >
        <span className={styles.name}>{t('settings.sound.chime')}</span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.knob} />
        </span>
      </button>
      {chime ? (
        <div className={styles.volumeRow}>
          <div className={styles.chips} role="group" aria-label={t('settings.sound.volume')}>
            {VOLUMES.map((volume) => {
              const selected = volume === chimeVolume;
              return (
                <button
                  key={volume}
                  type="button"
                  className={selected ? `${styles.chip} ${styles.selected}` : styles.chip}
                  aria-pressed={selected}
                  onClick={() => {
                    // Played on the spot: picking a level is the way to hear it.
                    setChimeVolume(volume);
                    playChime(volume);
                  }}
                >
                  {t(`settings.sound.volume.${volume}`)}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            className={styles.preview}
            onClick={() => playChime(chimeVolume)}
          >
            {t('settings.sound.preview')}
          </Button>
        </div>
      ) : null}
      <p className={styles.hint}>{t('settings.sound.hint')}</p>
    </Section>
  );
}
