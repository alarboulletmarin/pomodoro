import { DURATION_BOUNDS } from '../../domain/timer/durations';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { Section } from './Section';
import { Stepper } from './Stepper';
import styles from './Stepper.module.css';

export function DurationsSection(): JSX.Element {
  const { t } = useI18n();
  const { settings, setFocusMinutes, setBreakMinutes } = useSettings();
  const { focusMinutes, breakMinutes } = settings;

  return (
    <Section label={t('settings.durations.title')}>
      <Stepper
        name={t('settings.durations.focus')}
        value={t('settings.durations.minutes', { minutes: focusMinutes })}
        current={focusMinutes}
        min={DURATION_BOUNDS.focus.min}
        max={DURATION_BOUNDS.focus.max}
        onChange={setFocusMinutes}
      />
      <Stepper
        name={t('settings.durations.break')}
        value={t('settings.durations.minutes', { minutes: breakMinutes })}
        current={breakMinutes}
        min={DURATION_BOUNDS.break.min}
        max={DURATION_BOUNDS.break.max}
        onChange={setBreakMinutes}
      />
      <p className={styles.hint}>{t('settings.durations.hint')}</p>
    </Section>
  );
}
