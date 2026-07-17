import React, { useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { useChatStore, PROVIDER_MODELS } from 'forge-core';
import type { ProviderType } from 'forge-core';
import { useTermSize } from '../hooks/useTermSize.js';

const STEP_ORDER = ['select_provider', 'enter_api_key', 'select_model'] as const;

export function WizardModal() {
  const wizard = useChatStore((s) => s.wizard);
  const { rows } = useTermSize();

  if (!wizard.active) return null;

  const stepIdx = STEP_ORDER.indexOf(wizard.step);
  const stepNum = stepIdx >= 0 ? stepIdx + 1 : 1;
  const padTop = Math.max(0, Math.floor((rows - 20) / 2));

  return (
    <Box flexDirection="column" minHeight={rows}>
      {Array.from({ length: padTop }).map((_, i) => (
        <Box key={`pad-${i}`} height={1} />
      ))}

      <Box flexDirection="column" borderStyle="round" borderColor="yellow"
        width={62} marginX={2} paddingX={1} paddingY={1} alignSelf="center">
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="yellow">⚡ Connect Provider ({stepNum}/{STEP_ORDER.length})</Text>
          <Text dimColor>Esc to cancel</Text>
        </Box>

        <Box marginBottom={1}>
          {STEP_ORDER.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            const prefix = done ? '●' : active ? '▶' : '○';
            const color = done ? 'green' : active ? 'yellow' : 'gray';
            const l: Record<string, string> = { select_provider: 'Provider', enter_api_key: 'API key', select_model: 'Model' };
            return (
              <Text key={s} color={color}>{prefix} {l[s]}  </Text>
            );
          })}
        </Box>

        <Box borderStyle="single" borderColor="gray" borderLeft={false} borderRight={false} borderBottom={false} borderTop={false} />

        <Box paddingY={1} flexDirection="column">
          <WizardContent />
        </Box>

        <Box borderStyle="single" borderColor="gray" borderLeft={false} borderRight={false} borderBottom={false} borderTop={false} />

        <Box justifyContent="flex-end" marginTop={1}>
          <Text dimColor>Esc cancel     </Text>
          <Text color="cyan">↵ continue</Text>
        </Box>
      </Box>
    </Box>
  );
}

function WizardContent() {
  const wizard = useChatStore((s) => s.wizard);
  const inputValue = useChatStore((s) => s.inputValue);

  if (wizard.step === 'select_provider') {
    return <ProviderList />;
  }
  if (wizard.step === 'enter_api_key') {
    return <ApiKeyInput />;
  }
  if (wizard.step === 'select_model' && wizard.providerType) {
    return <ModelList providerType={wizard.providerType as ProviderType} />;
  }
  return null;
}

function ProviderList() {
  const wizard = useChatStore((s) => s.wizard);
  const inputValue = useChatStore((s) => s.inputValue);

  const providers = wizard.detectedProviders.length > 0 ? wizard.detectedProviders : [];
  const filtered = inputValue.length > 0
    ? providers.filter((p) => p.name.toLowerCase().includes(inputValue.toLowerCase()) || p.id.includes(inputValue.toLowerCase()))
    : providers;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Select provider:</Text>
      </Box>
      {filtered.map((p) => {
        const idx = providers.indexOf(p);
        const isSelected = inputValue.length === 0 && idx === wizard.providerIndex;
        return (
          <Box key={p.id}>
            <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
              {isSelected ? '▶ ' : '  '}
              {p.available ? '✓ ' : '✗ '}
              {p.name}
            </Text>
            <Box marginLeft={1}>
              <Text dimColor>{p.source}</Text>
            </Box>
            {p.apiKey && (
              <Box marginLeft={1}>
                <Text color="yellow">🔑</Text>
              </Box>
            )}
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text color="green">▸ </Text>
        <Text>{inputValue}</Text>
        <Text color="cyan">│</Text>
      </Box>
      <Text dimColor>↑↓ navigate  type to filter  ↵ select</Text>
    </Box>
  );
}

function ApiKeyInput() {
  const inputValue = useChatStore((s) => s.inputValue);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>API key:</Text>
      </Box>
      <Box>
        <Text color="green">▸ </Text>
        <Text>{inputValue.length > 0 ? '*'.repeat(Math.min(inputValue.length, 50)) : ''}</Text>
        <Text color="cyan">│</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Paste your API key</Text>
      </Box>
    </Box>
  );
}

function ModelList({ providerType }: { providerType: ProviderType }) {
  const wizard = useChatStore((s) => s.wizard);
  const inputValue = useChatStore((s) => s.inputValue);

  const models = PROVIDER_MODELS[providerType] ?? [];
  const filtered = inputValue.length > 0
    ? models.filter((m) => m.toLowerCase().includes(inputValue.toLowerCase()))
    : models;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Choose model ({providerType}):</Text>
      </Box>
      {filtered.map((model) => {
        const isSelected = inputValue.length === 0 && model === wizard.modelName;
        return (
          <Box key={model}>
            <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
              {isSelected ? '▶ ' : '  '}{model}
            </Text>
          </Box>
        );
      })}
      {filtered.length === 0 && inputValue.length > 0 && (
        <Box>
          <Text color="yellow">Use custom: {inputValue}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="green">▸ </Text>
        <Text>{inputValue}</Text>
        <Text color="cyan">│</Text>
      </Box>
      <Text dimColor>↑↓ navigate  type to filter  ↵ select</Text>
    </Box>
  );
}
