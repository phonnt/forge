import React from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  status: string;
  label: string;
}

export function ProgressBar({ status, label }: ProgressBarProps) {
  const isActive = status === 'thinking' || status === 'executing';

  return (
    <Box>
      {isActive ? (
        <Box marginRight={1}>
          <Text color="yellow">●</Text>
        </Box>
      ) : status === 'done' ? (
        <Box marginRight={1}>
          <Text color="green">✓</Text>
        </Box>
      ) : status === 'error' ? (
        <Box marginRight={1}>
          <Text color="red">✗</Text>
        </Box>
      ) : null}

      <Text dimColor={status === 'done'}>
        {label || status}
      </Text>
    </Box>
  );
}
