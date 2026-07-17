import React from 'react';
import { Box, Text } from 'ink';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { findProjectRoot } from 'forge-core';

export function ContextBar() {
  const projectRoot = findProjectRoot() ?? process.cwd();
  const folderName = path.basename(projectRoot);
  const branch = getGitBranch(projectRoot);

  return (
    <Box paddingX={2} paddingY={1}>
      <Box flexGrow={1}>
        <Text dimColor>📁 </Text>
        <Text dimColor>{projectRoot}</Text>
        {branch && (
          <Box marginLeft={2}>
            <Text dimColor>⎇ </Text>
            <Text color="yellow">{branch}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function getGitBranch(cwd: string): string | null {
  try {
    return execSync('git branch --show-current', {
      cwd,
      encoding: 'utf-8',
      timeout: 3000,
    }).trim() || null;
  } catch {
    return null;
  }
}
