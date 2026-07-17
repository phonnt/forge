import React from 'react';
import { Box, Text } from 'ink';
import { useAgentStore } from 'forge-core';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'red',
  major: 'yellow',
  minor: 'blue',
  info: 'gray',
};

export function FindingList() {
  const events = useAgentStore((s) => s.events);

  const findings = events
    .filter((e) => e.type === 'text_delta')
    .map((e) => e.text)
    .join('')
    .split('\n')
    .filter((line) => line.startsWith('{"file"'));

  if (findings.length === 0) return null;

  const parsed = findings
    .map((line) => {
      try {
        return JSON.parse(line) as {
          severity: string;
          title: string;
          file: string;
          lineStart?: number;
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Findings ({parsed.length})</Text>
      {parsed.slice(-10).map((f, i) => (
        <Box key={i} marginLeft={2}>
          <Text color={SEVERITY_COLORS[f!.severity] ?? 'white'}>
            [{f!.severity.toUpperCase()}] {f!.title} - {f!.file}
            {f!.lineStart ? `:${f!.lineStart}` : ''}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
