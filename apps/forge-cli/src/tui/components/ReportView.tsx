import React from 'react';
import { Box, Text } from 'ink';
import { useAgentStore } from 'forge-core';

export function ReportView() {
  const result = useAgentStore((s) => s.result);
  const events = useAgentStore((s) => s.events);

  if (!result?.success) return null;

  const textOutput = events
    .filter((e) => e.type === 'text_delta')
    .map((e) => e.text)
    .join('');

  const summaryMatch = textOutput.match(/---SUMMARY---\s*(\{[\s\S]*?\})/);
  let stats: Record<string, number> | null = null;
  if (summaryMatch) {
    try {
      stats = JSON.parse(summaryMatch[1]);
    } catch {
      // ignore
    }
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="green">
        Review Complete
      </Text>

      {stats && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Statistics:</Text>
          <Box marginLeft={2}>
            <Text>Total: {stats.total} | </Text>
            <Text color="red">Critical: {stats.critical} | </Text>
            <Text color="yellow">Major: {stats.major} | </Text>
            <Text color="blue">Minor: {stats.minor} | </Text>
            <Text color="gray">Info: {stats.info}</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Report saved to .forge/review-report.md</Text>
      </Box>
    </Box>
  );
}
