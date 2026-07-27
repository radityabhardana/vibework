export function getUndoMessageIds(
  messages: readonly { id: string; role: string }[],
  userMessageId: string
) {
  const targetIndex = messages.findLastIndex(message => message.role === 'user');
  if (targetIndex === -1 || messages[targetIndex].id !== userMessageId) return null;
  return messages.slice(targetIndex).map(message => message.id);
}
