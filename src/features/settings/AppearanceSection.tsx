import { ACCENT_PALETTE, type Theme } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { Section } from './Section';
import { THEME_BG, THEME_INK, type StyleVars } from './theme-colors';
import styles from './AppearanceSection.module.css';

const THEMES: readonly Theme[] = ['light', 'dark'];

export function AppearanceSection(): JSX.Element {
  const { t } = useI18n();
  const { settings, setTheme } = useSettings();
  const { theme, accentKey, customColor } = settings;

  return (
    <Section label={t('settings.appearance')}>
      <div className={styles.tiles}>
        {THEMES.map((option) => {
          const selected = option === theme;
          const preview: StyleVars = {
            '--preview-bg': THEME_BG[option],
            '--preview-ink': THEME_INK[option],
            '--preview-accent':
              accentKey === 'custom' ? customColor : ACCENT_PALETTE[accentKey][option],
          };

          return (
            <button
              key={option}
              type="button"
              className={selected ? `${styles.tile} ${styles.selected}` : styles.tile}
              aria-pressed={selected}
              onClick={() => setTheme(option)}
            >
              <span className={styles.preview} style={preview} aria-hidden="true">
                <span className={styles.barInk} />
                <span className={styles.barAccent} />
              </span>
              <span className={styles.foot}>
                <span className={styles.name}>{t(`settings.theme.${option}`)}</span>
                {selected ? (
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
