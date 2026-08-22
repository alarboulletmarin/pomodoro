import { ACCENT_PALETTE, type Theme, type ThemeChoice } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { Section } from './Section';
import { THEME_BG, THEME_INK, type StyleVars } from './theme-colors';
import styles from './AppearanceSection.module.css';

const CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];
const SIDES: readonly Theme[] = ['light', 'dark'];

export function AppearanceSection(): JSX.Element {
  const { t } = useI18n();
  const { settings, setTheme } = useSettings();
  const { theme, accentKey, customColor } = settings;

  const previewFor = (side: Theme): StyleVars => ({
    '--preview-bg': THEME_BG[side],
    '--preview-ink': THEME_INK[side],
    '--preview-accent': accentKey === 'custom' ? customColor : ACCENT_PALETTE[accentKey][side],
  });

  return (
    <Section label={t('settings.appearance')}>
      <div className={styles.tiles}>
        {CHOICES.map((choice) => {
          const selected = choice === theme;
          // The system tile shows both halves, since it is both depending on the hour.
          const sides = choice === 'system' ? SIDES : [choice];

          return (
            <button
              key={choice}
              type="button"
              className={selected ? `${styles.tile} ${styles.selected}` : styles.tile}
              aria-pressed={selected}
              onClick={() => setTheme(choice)}
            >
              <span className={styles.preview} aria-hidden="true">
                {sides.map((side) => (
                  <span key={side} className={styles.half} style={previewFor(side)}>
                    <span className={styles.barInk} />
                    <span className={styles.barAccent} />
                  </span>
                ))}
              </span>
              <span className={styles.name}>{t(`settings.theme.${choice}`)}</span>
              {selected ? (
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {theme === 'system' ? <p className={styles.hint}>{t('settings.theme.systemHint')}</p> : null}
    </Section>
  );
}
