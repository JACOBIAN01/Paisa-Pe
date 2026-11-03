import { createLogger, createMemorySink, resetSink, setMinLevel, setSink } from '../logger';
import { redact, redactString } from '../redact';

describe('redact', () => {
  it('masks sensitive keys deeply', () => {
    const out = redact({
      user: { phone: '+919812345678', name: 'Asha' },
      items: [{ note: 'rent', pin: '1234' }],
      amount: 500,
    });
    expect(out).toEqual({
      user: { phone: '[redacted]', name: 'Asha' },
      items: [{ note: '[redacted]', pin: '[redacted]' }],
      amount: 500,
    });
  });

  it('scrubs phone numbers, bearer tokens and card numbers inside strings', () => {
    expect(redactString('call 9812345678 now')).toBe('call [redacted] now');
    expect(redactString('call +91 9812345678')).toBe('call [redacted]');
    expect(redactString('Authorization: Bearer abc.def-123')).toBe(
      'Authorization: Bearer [redacted]',
    );
    expect(redactString('card 4111 1111 1111 1111')).toBe('card [redacted]');
  });

  it('handles cycles and does not mutate input', () => {
    const a: Record<string, unknown> = { token: 't', list: [] };
    (a.list as unknown[]).push(a);
    const out = redact(a) as Record<string, unknown>;
    expect(out.token).toBe('[redacted]');
    expect((out.list as unknown[])[0]).toBe('[circular]');
    expect(a.token).toBe('t');
  });

  it('serialises errors without stack', () => {
    expect(redact(new Error('fail for 9812345678'))).toEqual({
      name: 'Error',
      message: 'fail for [redacted]',
    });
  });
});

describe('logger', () => {
  afterEach(() => {
    resetSink();
    setMinLevel('debug');
  });

  it('writes redacted entries to the sink', () => {
    const sink = createMemorySink();
    setSink(sink);
    createLogger('pay').info('sent', { phone: '+919812345678', amount: 10 });
    expect(sink.entries).toEqual([
      {
        level: 'info',
        namespace: 'pay',
        message: 'sent',
        context: { phone: '[redacted]', amount: 10 },
      },
    ]);
  });

  it('respects the minimum level and child namespaces', () => {
    const sink = createMemorySink();
    setSink(sink);
    setMinLevel('warn');
    const log = createLogger('a').child('b');
    log.info('hidden');
    log.error('shown');
    expect(sink.entries.map((e) => `${e.namespace}:${e.message}`)).toEqual(['a:b:shown']);
  });
});
