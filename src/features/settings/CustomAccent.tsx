import { useId, useState } from 'react';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { contrastRatio } from '../../shared/theme/contrast';
import { THEME_BG, THEME_SURFACE } from './theme-colors';
import styles from './CustomAccent.module.css';

const GRAPHIC_CONTRAST_MIN = 3;

// Cards sit on --surface, which is the closer of the two backdrops in dark mode, so
// checking --bg alone lets a colour through that disappears on the stats panel.
const BACKDROPS: readonly string[] = [...Object.values(THEME_BG), ...Object.values(THEME_SURFACE)];

export function CustomAccent(): JSX.Element {
  const { t } = useI18n();
  const { settings, setAccentKey, setCustomColor } = useSettings();
  const [open, setOpen] = useState(settings.accentKey === 'custom');
  const panelId = useId();

  const { customColor, accentKey } = settings;
  const legible = BACKDROPS.every(
    (backdrop) => contrastRatio(customColor, backdrop) >= GRAPHIC_CONTRAST_MIN,
  );

  const pick = (hex: string): void => {
    setCustomColor(hex);
    setAccentKey('custom');
  };

  return (
    <>
      <button
        type="button"
        className={styles.row}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className={styles.rowLabel}>{t('settings.accent.custom')}</span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? '▾' : '›'}
        </span>
      </button>

      <div className={styles.panel} id={panelId} hidden={!open}>
        <div className={styles.picker}>
          <input
            type="color"
            className={styles.input}
            data-selected={accentKey === 'custom'}
            value={customColor}
            aria-label={t('settings.accent.custom')}
            onChange={(event) => pick(event.target.value)}
          />
          <span className={styles.texts}>
            <span className={styles.hex}>{customColor}</span>
            <span className={styles.hint}>{t('settings.accent.customHint')}</span>
          </span>
        </div>
        {legible ? null : <p className={styles.warning}>{t('settings.accent.contrastWarning')}</p>}
      </div>
    </>
  );
}
