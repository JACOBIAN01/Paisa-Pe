import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ContainerProvider, createContainer, createToken, useService } from '../index';

const GREETING = createToken<string>('greeting');

function Greeting() {
  return <Text testID="out">{useService(GREETING)}</Text>;
}

describe('react bindings', () => {
  it('resolves a service from the nearest container', async () => {
    const container = createContainer();
    container.registerValue(GREETING, 'hello');
    await render(
      <ContainerProvider container={container}>
        <Greeting />
      </ContainerProvider>,
    );
    expect(screen.getByTestId('out').props.children).toBe('hello');
  });

  it('resolves through a parent container', async () => {
    const parent = createContainer();
    parent.registerValue(GREETING, 'from parent');
    await render(
      <ContainerProvider container={parent.child()}>
        <Greeting />
      </ContainerProvider>,
    );
    expect(screen.getByTestId('out').props.children).toBe('from parent');
  });

  it('throws a clear error without a provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Greeting />)).rejects.toThrow('ContainerProvider');
    spy.mockRestore();
  });

  it('throws a clear error for a missing token', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      render(
        <ContainerProvider container={createContainer()}>
          <Greeting />
        </ContainerProvider>,
      ),
    ).rejects.toThrow('No provider for token: greeting');
    spy.mockRestore();
  });
});
