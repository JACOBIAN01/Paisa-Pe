import { Switch } from 'react-native';
import { ListRow } from '@pp/design-system';

interface Props {
  title: string;
  value: boolean;
  disabled?: boolean;
  testID: string;
  onChange(next: boolean): void;
}

export function ToggleRow({ title, value, disabled, testID, onChange }: Props) {
  return (
    <ListRow
      title={title}
      right={
        <Switch
          testID={testID}
          accessibilityLabel={title}
          value={value}
          disabled={disabled}
          onValueChange={onChange}
        />
      }
    />
  );
}
