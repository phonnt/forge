import { C } from './ansi.js';

function enterFullScreen(): void {
  process.stdout.write(C.enterAlt + C.clearScreen + moveHome());
}

function exitFullScreen(): void {
  process.stdout.write(C.showCursor + C.exitAlt);
}

function moveHome(): string {
  return '\x1b[H';
}

let _cleanup: (() => void) | null = null;

export function getCleanup(): (() => void) | null {
  return _cleanup;
}

export function setupFullScreen(): () => void {
  const wasTTY = process.stdout.isTTY;

  if (!wasTTY) {
    return () => {};
  }

  enterFullScreen();

  const cleanup = () => {
    exitFullScreen();
  };
  _cleanup = cleanup;

  const onSigint = () => {
    cleanup();
    process.exit(0);
  };

  const onSigterm = () => {
    cleanup();
    process.exit(0);
  };

  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  return () => {
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
    _cleanup = null;
    cleanup();
  };
}
