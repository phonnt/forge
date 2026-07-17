import React from 'react';
import { Box, Text } from 'ink';

export const COMMANDS = [
  { cmd: '/review', desc: 'Review a pull request or merge request', usage: '/review <url>' },
  { cmd: '/connect', desc: 'Connect to an AI provider', usage: '/connect' },
  { cmd: '/init', desc: 'Initialize forge in current project', usage: '/init' },
  { cmd: '/help', desc: 'Show available commands', usage: '/help' },
  { cmd: '/clear', desc: 'Clear chat messages', usage: '/clear' },
  { cmd: '/quit', desc: 'Exit forge', usage: '/quit' },
  { cmd: '/status', desc: 'Show current configuration', usage: '/status' },
];

interface AutocompleteProps {
  inputValue: string;
  selectedIndex: number;
}

export function Autocomplete({ inputValue, selectedIndex }: AutocompleteProps) {
  if (!inputValue.startsWith('/')) return null;

  const matches = COMMANDS.filter((c) =>
    c.cmd.startsWith(inputValue),
  );

  if (matches.length === 0 || (matches.length === 1 && matches[0].cmd === inputValue)) return null;

  return (
    <Box flexDirection="column" paddingX={2} paddingBottom={1}>
      {matches.map((m, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={m.cmd}>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {isSelected ? '▶ ' : '  '}
              {m.cmd}
            </Text>
            <Box marginLeft={2}>
              <Text dimColor>{m.desc}</Text>
            </Box>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>Tab to complete</Text>
      </Box>
    </Box>
  );
}
