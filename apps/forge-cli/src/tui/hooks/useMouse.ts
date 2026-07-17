import { useEffect, useRef } from 'react';
import { C } from '../ansi.js';

export interface MouseEventData {
  type: 'click' | 'scroll_up' | 'scroll_down';
  x: number;
  y: number;
}

export type MouseHandler = (event: MouseEventData) => void;

const MOUSE_PATTERN = /\x1b\[<(\d+);(\d+);(\d+)([mM])/;

export function isMouseSequence(data: string): boolean {
  return MOUSE_PATTERN.test(data);
}

export function useMouse(handler: MouseHandler, active: boolean = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;

    const stdin = process.stdin;
    process.stdout.write(C.enableMouse);

    const onData = (data: Buffer) => {
      const str = data.toString();
      const match = str.match(MOUSE_PATTERN);
      if (!match) return;

      const code = parseInt(match[1], 10);
      const x = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);

      if (code === 0) {
        handlerRef.current({ type: 'click', x, y });
      } else if (code === 64) {
        handlerRef.current({ type: 'scroll_up', x, y });
      } else if (code === 65) {
        handlerRef.current({ type: 'scroll_down', x, y });
      }
    };

    stdin.on('data', onData);

    return () => {
      process.stdout.write(C.disableMouse);
      stdin.removeListener('data', onData);
    };
  }, [active]);
}
