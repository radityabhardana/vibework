export type PhasedMessage<T> = T & { phase: number };

function readPhase(content: string) {
  const match = content.match(/\[(?:FASE|PROGRESS):\s*(\d+)\/(\d+)\]/i);
  if (!match) return null;

  const phase = Number(match[1]);
  const total = Number(match[2]);
  return total === 5 && phase >= 1 && phase <= total ? phase : null;
}

export function assignMessagePhases<T extends { role: string; content: string }>(messages: readonly T[]): PhasedMessage<T>[] {
  const hasExplicitPhase = messages.some(message =>
    message.role === 'assistant' && readPhase(message.content) !== null
  );

  let runningPhase = 1;
  let assistantCount = 0;

  return messages.map(message => {
    if (hasExplicitPhase) {
      if (message.role === 'assistant') {
        runningPhase = readPhase(message.content) ?? runningPhase;
      }
    } else if (message.role === 'assistant') {
      assistantCount++;
      runningPhase = Math.min(5, assistantCount);
    }

    return { ...message, phase: runningPhase };
  });
}

export function getMaxMessagePhase(messages: readonly { role: string; content: string }[]) {
  return Math.max(1, ...assignMessagePhases(messages).map(message => message.phase));
}
