import React, { useEffect } from 'react';
import { Box, useInput } from 'ink';
import { useChatStore, useAgentStore } from 'forge-core';
import { useTermSize } from '../hooks/useTermSize.js';
import { StatusBar } from './StatusBar.js';
import { ContextBar } from './ContextBar.js';
import { OutputArea } from './OutputArea.js';
import { InputBar } from './InputBar.js';
import { Autocomplete } from './Autocomplete.js';
import { WizardModal } from './WizardModal.js';
import { handleCommand } from '../commands.js';
import { getCleanup } from '../screen.js';

export function ChatShell() {
  const { rows } = useTermSize();
  const submitInput = useChatStore((s) => s.submitInput);
  const addMessage = useChatStore((s) => s.addMessage);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const insertText = useChatStore((s) => s.insertText);
  const deleteChar = useChatStore((s) => s.deleteChar);
  const moveCursorLeft = useChatStore((s) => s.moveCursorLeft);
  const moveCursorRight = useChatStore((s) => s.moveCursorRight);
  const setExecuting = useChatStore((s) => s.setExecuting);
  const isExecuting = useChatStore((s) => s.isExecuting);
  const navigateHistory = useChatStore((s) => s.navigateHistory);
  const wizard = useChatStore((s) => s.wizard);
  const wizardNext = useChatStore((s) => s.wizardNext);
  const cancelWizard = useChatStore((s) => s.cancelWizard);
  const resetAgent = useAgentStore((s) => s.reset);

  useEffect(() => {
    process.stdout.write('\x1b[?25l');
    return () => {
      process.stdout.write('\x1b[?25h');
    };
  }, []);

  useInput((input, key) => {
    if (wizard.active) {
      if (key.escape) {
        cancelWizard();
        addMessage('system', 'Cancelled.');
        return;
      }

      if (wizard.step === 'select_provider') {
        if (key.upArrow) {
          useChatStore.getState().wizardNavigateProvider('up');
          return;
        }
        if (key.downArrow) {
          useChatStore.getState().wizardNavigateProvider('down');
          return;
        }
        if (key.return) {
          useChatStore.getState().wizardSelectProvider();
          submitInput();
          return;
        }
        if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
          setInputValue(useChatStore.getState().inputValue.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta && !key.tab) {
          setInputValue(useChatStore.getState().inputValue + input);
        }
        return;
      }

      if (wizard.step === 'select_model') {
        if (key.upArrow) {
          useChatStore.getState().wizardNavigateModel('up');
          return;
        }
        if (key.downArrow) {
          useChatStore.getState().wizardNavigateModel('down');
          return;
        }
        if (key.return) {
          const result = useChatStore.getState().wizardSelectModel();
          if (result?.done) {
            completeConnection(useChatStore.getState().wizard);
          }
          return;
        }
        if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
          setInputValue(useChatStore.getState().inputValue.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta && !key.tab) {
          setInputValue(useChatStore.getState().inputValue + input);
        }
        return;
      }

      if (key.return) {
        const value = useChatStore.getState().inputValue;
        const result = wizardNext(value);

        if (result === null) return;

        submitInput();

        if (result.done) {
          completeConnection(useChatStore.getState().wizard);
        }
        return;
      }

      if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
        const cur = useChatStore.getState().inputValue;
        setInputValue(cur.slice(0, -1));
        return;
      }

      if (input && !key.ctrl && !key.meta && !key.tab) {
        setInputValue(useChatStore.getState().inputValue + input);
      }
      return;
    }

    const focused = true;

    if (key.shift && key.return) {
      insertText('\n');
      return;
    }

    if (key.return) {
      const curInput = useChatStore.getState().inputValue;
      if (curInput.startsWith('/') && !curInput.includes(' ')) {
        useChatStore.getState().autocompleteAccept();
        return;
      }

      const cmd = submitInput();
      if (!cmd) return;

      const cleanCmd = cmd.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      addMessage('user', cleanCmd);

      handleCommand(cleanCmd).then((result) => {
        if (result.message) {
          addMessage('assistant', result.message);
        }
      }).catch((err: Error) => {
        addMessage('system', `Error: ${err.message}`);
        setExecuting(false);
      });
      return;
    }

    if (key.leftArrow) {
      moveCursorLeft();
      return;
    }

    if (key.rightArrow) {
      moveCursorRight();
      return;
    }

    if (key.tab) {
      useChatStore.getState().autocompleteAccept();
      return;
    }

    if (key.upArrow) {
      const cur = useChatStore.getState().inputValue;
      if (cur.startsWith('/') && !cur.includes(' ')) {
        useChatStore.getState().autocompleteNavigate('up');
      } else {
        navigateHistory('up');
      }
      return;
    }

    if (key.downArrow) {
      const cur = useChatStore.getState().inputValue;
      if (cur.startsWith('/') && !cur.includes(' ')) {
        useChatStore.getState().autocompleteNavigate('down');
      } else {
        navigateHistory('down');
      }
      return;
    }

    if (key.backspace || key.delete) {
      deleteChar();
      return;
    }

    if (key.ctrl && input === 'u') {
      useChatStore.getState().scrollUp();
      return;
    }

    if (key.ctrl && input === 'd') {
      useChatStore.getState().scrollDown();
      return;
    }

    if (key.ctrl && (input === 'c' || input === 'C')) {
      if (isExecuting) {
        setExecuting(false);
        resetAgent();
        addMessage('system', '⏹ Cancelled');
      } else {
        getCleanup()?.();
        process.exit(0);
      }
      return;
    }

    if (input && !key.ctrl && !key.meta && !key.tab && !key.escape) {
      insertText(input);
    }
  });

  return (
    <Box flexDirection="column" minHeight={rows}>
      <WizardModal />
      {!wizard.active && (
        <>
          <StatusBar />
          <OutputArea />
          <ContextBar />
          <AutocompleteWrapper />
          <InputBar />
        </>
      )}
    </Box>
  );
}

import { loadForgeConfig, saveForgeConfig } from 'forge-core';
import type { WizardState } from 'forge-core';

function AutocompleteWrapper() {
  const inputValue = useChatStore((s) => s.inputValue);
  const autocompleteIndex = useChatStore((s) => s.autocompleteIndex);
  return <Autocomplete inputValue={inputValue} selectedIndex={autocompleteIndex} />;
}

function completeConnection(w: WizardState) {
  const addMessage = useChatStore.getState().addMessage;

  if (!w.providerType || !w.apiKey) {
    addMessage('system', '❌ Connection failed: missing provider info.');
    return;
  }

  try {
    let config;
    try {
      config = loadForgeConfig();
    } catch {
      config = { providers: [] };
    }

    const name = `${w.providerType}-${Date.now()}`;
    const existing = config.providers.findIndex(
      (p) => p.type === w.providerType && p.model === w.modelName,
    );

    if (existing >= 0) {
      config.providers[existing].apiKey = w.apiKey;
    } else {
      config.providers.push({
        name,
        type: w.providerType,
        model: w.modelName,
        apiKey: w.apiKey,
      });
    }

    config.active = name;
    saveForgeConfig(config);

    addMessage('system', `✅ Connected!\n  Provider: ${w.providerType}\n  Model: ${w.modelName}`);
  } catch (err) {
    addMessage('system', `❌ Failed to save config: ${err instanceof Error ? err.message : String(err)}`);
  }
}
