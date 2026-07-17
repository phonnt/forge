import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useChatStore, loadForgeConfig, getActiveProvider } from 'forge-core';

export function InputBar() {
  const inputValue = useChatStore((s) => s.inputValue);
  const cursorPosition = useChatStore((s) => s.cursorPosition);
  const isExecuting = useChatStore((s) => s.isExecuting);
  const wizard = useChatStore((s) => s.wizard);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  const hasText = inputValue.length > 0;
  const lines = inputValue.split('\n');
  const lastLineIndex = lines.length - 1;

  let modelName = '';
  let providerType = '';
  try {
    const cfg = loadForgeConfig();
    const active = getActiveProvider(cfg);
    modelName = active.model;
    providerType = active.type;
  } catch {}

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={wizard.active ? 'yellow' : 'gray'}
      borderLeft={false}
      borderRight={false}
      borderBottom={false}
    >
      {wizard.active ? (
        <Box paddingX={2} paddingY={1}>
          <Text dimColor>⚡ Connect wizard active — see dialog above</Text>
        </Box>
      ) : (
        <InputPrompt
          inputValue={inputValue}
          cursorPosition={cursorPosition}
          lines={lines}
          lastLineIndex={lastLineIndex}
          hasText={hasText}
          cursorVisible={cursorVisible}
        />
      )}

      <Box paddingX={2} paddingBottom={1} justifyContent="space-between">
        <Box gap={2}>
          {wizard.active ? (
            <Text dimColor>Esc to cancel</Text>
          ) : (
            <>
              <Text dimColor>/review</Text>
              <Text dimColor>/connect</Text>
              <Text dimColor>/help</Text>
            </>
          )}
        </Box>
        <Box gap={2}>
          {isExecuting && (
            <Box gap={1}>
              <Text color="yellow">⏳</Text>
              <Text dimColor>Ctrl+C to cancel</Text>
            </Box>
          )}
          <Text color="yellow">{providerType} ({modelName})</Text>
        </Box>
      </Box>
    </Box>
  );
}

function InputPrompt({
  inputValue,
  cursorPosition,
  lines,
  lastLineIndex,
  hasText,
  cursorVisible,
}: {
  inputValue: string;
  cursorPosition: number;
  lines: string[];
  lastLineIndex: number;
  hasText: boolean;
  cursorVisible: boolean;
}) {
  if (lines.length > 1) {
    return (
      <Box paddingX={2} paddingY={1} flexDirection="column">
        {lines.map((line, i) => (
          <Box key={i} flexDirection="row">
            <Box marginRight={1}>
              <Text color="green" bold>▸</Text>
            </Box>
            <Box flexGrow={1}>
              <Text>{line}</Text>
              {i === lastLineIndex && cursorVisible && (
                <Text color="cyan">│</Text>
              )}
            </Box>
            {i === lastLineIndex && hasText && (
              <Text dimColor>↵ Enter</Text>
            )}
          </Box>
        ))}
        <Box marginTop={1}>
          <Text dimColor>  Shift+Enter for new line</Text>
        </Box>
      </Box>
    );
  }

  const before = inputValue.slice(0, cursorPosition);
  const after = inputValue.slice(cursorPosition);
  const cursor = cursorVisible ? '│' : ' ';

  return (
    <Box paddingX={2} paddingY={1}>
      <Box marginRight={1}>
        <Text color="green" bold>▸</Text>
      </Box>
      <Box flexGrow={1} marginRight={1}>
        <Text>{before}</Text>
        <Text color="cyan">{cursor}</Text>
        <Text>{after}</Text>
      </Box>
      {hasText && (
        <Text dimColor>↵ Enter</Text>
      )}
    </Box>
  );
}
