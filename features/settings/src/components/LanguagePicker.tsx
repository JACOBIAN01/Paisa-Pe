import type { Language } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { Button, Stack } from '@pp/design-system';
import { LANGUAGES, languageLabelKey } from '../state/settings-model';

interface Props {
  value: Language;
  disabled?: boolean;
  onChange(language: Language): void;
}

export function LanguagePicker({ value, disabled, onChange }: Props) {
  return (
    <Stack direction="row" gap="sm" testID="language-picker">
      {LANGUAGES.map((language) => (
        <Button
          key={language}
          testID={`language-${language}`}
          title={t(languageLabelKey(language))}
          variant={language === value ? 'primary' : 'secondary'}
          disabled={disabled}
          onPress={() => onChange(language)}
        />
      ))}
    </Stack>
  );
}
