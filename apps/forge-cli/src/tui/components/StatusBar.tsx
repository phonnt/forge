import React from 'react';
import { Box, Text } from 'ink';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { loadForgeConfig, getActiveProvider, findProjectRoot } from 'forge-core';

export function StatusBar() {
  const projectRoot = findProjectRoot() ?? process.cwd();
  const folderName = path.basename(projectRoot);
  const gitBranch = getGitBranch(projectRoot);
  const displayPath = gitBranch
    ? `${folderName} (${gitBranch})`
    : folderName;

  let modelInfo = 'No provider';
  try {
    const config = loadForgeConfig();
    const active = getActiveProvider(config);
    modelInfo = active.model;
  } catch {
    // no config
  }

  return (
    <Box
      paddingX={1}
      paddingY={1}
      borderStyle="round"
      borderColor="cyan"
      justifyContent="space-between"
      alignItems="center"
    >
      <Box gap={1}>
        <Text bold color="cyan">
          forge
        </Text>
        <Text dimColor>v0.1.0</Text>
      </Box>

      <Box>
        <Text dimColor>{displayPath}</Text>
      </Box>

      <Box gap={2}>
        <Text color="yellow">{modelInfo}</Text>
        <Text dimColor>/help</Text>
      </Box>
    </Box>
  );
}

function getGitBranch(cwd: string): string | null {
  try {
    const branch = execSync('git branch --show-current', {
      cwd,
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}
