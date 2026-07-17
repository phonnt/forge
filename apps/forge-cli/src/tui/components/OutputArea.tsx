import React from 'react';
import { Box, Text } from 'ink';
import { useChatStore } from 'forge-core';
import type { ChatMessage } from 'forge-core';
import { useTermSize } from '../hooks/useTermSize.js';

export function OutputArea() {
  const messages = useChatStore((s) => s.messages);
  const scrollOffset = useChatStore((s) => s.scrollOffset);
  const { rows } = useTermSize();

  const visibleRows = Math.max(5, rows - 6);
  const totalMessages = messages.length;

  let visibleMessages = messages;
  if (scrollOffset > 0 && totalMessages > visibleRows) {
    visibleMessages = messages.slice(0, Math.max(0, totalMessages - scrollOffset));
  }
  if (visibleMessages.length > visibleRows) {
    visibleMessages = visibleMessages.slice(-visibleRows);
  }

  const hasMoreAbove = scrollOffset > 0 || visibleMessages.length < totalMessages;
  const hasMoreBelow = scrollOffset > 0;

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {hasMoreAbove && (
        <Box>
          <Text dimColor>▲ {scrollOffset} messages above (Ctrl+U/D to scroll)</Text>
        </Box>
      )}
      {visibleMessages.map((msg) => (
        <MessageLine key={msg.id} message={msg} />
      ))}
      {hasMoreBelow && (
        <Box>
          <Text dimColor>▼ more messages</Text>
        </Box>
      )}
    </Box>
  );
}

function MessageLine({ message }: { message: ChatMessage }) {
  switch (message.role) {
    case 'system':
      return (
        <Box marginY={1}>
          <Text dimColor>{message.content.split('\n').map((line, i) => (
            i === 0 ? line : `\n  ${line}`
          ))}</Text>
        </Box>
      );
    case 'user':
      return (
        <Box marginY={1}>
          <Box marginRight={1}>
            <Text color="green" bold>{'>'}</Text>
          </Box>
          <Text>{message.content}</Text>
        </Box>
      );
    case 'assistant':
      return (
        <Box marginY={1} flexDirection="column">
          {message.content.split('\n').map((line, i) => (
            <Box key={i}>
              <Text>{line || ' '}</Text>
            </Box>
          ))}
        </Box>
      );
  }
}
