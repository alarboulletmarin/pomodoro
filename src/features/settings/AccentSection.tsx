import { ACCENT_PALETTE, type PresetAccentKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { CustomAccent } from './CustomAccent';
import { Section } from './Section';
import type { StyleVars } from './theme-colors';
import styles from './AccentSection.module.css';

const PRESETS: readonly PresetAccentKey[] = ['red', 'green', 'blue'];

export function AccentSection(): JSX.Element {
  const { t } = useI18n();
  const { settings, theme, setAccentKey } = useSettings();
  const { accentKey, customColor } = settings;
  const current = accentKey === 'custom' ? customColor : t(`settings.accent.${accentKey}`);

  return (
    <Section
      label={t('settings.accent.title')}
      trailing={<span className={styles.current}>{current}</span>}
    >
      <div className={styles.swatches}>
        {PRESETS.map((key) => {
          const selected = key === accentKey;
          const swatch: StyleVars = { '--swatch': ACCENT_PALETTE[key][theme] };

          return (
            <button
              key={key}
              type="button"
              className={selected ? `${styles.swatch} ${styles.selected}` : styles.swatch}
              style={swatch}
              aria-label={t(`settings.accent.${key}`)}
              aria-pressed={selected}
              onClick={() => setAccentKey(key)}
            >
              <span className={styles.dot} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <CustomAccent />
    </Section>
  );
}
