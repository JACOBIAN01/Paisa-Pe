import type { MoneyRequest } from '@pp/contracts-domain';
import { formatPaise } from '@pp/core-money';
import { Avatar, Badge, ListRow } from '@pp/design-system';
import { copy } from '../copy';

export interface RequestRowProps {
  request: MoneyRequest;
  name: string;
  onPress: (id: MoneyRequest['id']) => void;
}

/** Presentational only: all state lives in the screen and is keyed by the request id. */
export function RequestRow({ request, name, onPress }: RequestRowProps) {
  return (
    <ListRow
      testID={`request-${request.id}`}
      title={name}
      subtitle={request.note ?? copy.status[request.status]}
      left={<Avatar name={name} />}
      right={
        <Badge
          label={`${formatPaise(request.amount)}`}
          tone={request.status === 'pending' ? 'warning' : 'neutral'}
        />
      }
      onPress={() => onPress(request.id)}
    />
  );
}
