export const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m',
  save: '\x1b[s',
  restore: '\x1b[u',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  clearScreen: '\x1b[2J',
  clearLine: '\x1b[2K',
  enterAlt: '\x1b[?1049h',
  exitAlt: '\x1b[?1049l',
  enableMouse: '\x1b[?1000h\x1b[?1015h\x1b[?1006h',
  disableMouse: '\x1b[?1000l\x1b[?1015l\x1b[?1006l',
} as const;

export function cls() {
  return C.reset + C.bgBlack;
}

export function move(y: number, x: number) {
  return `\x1b[${y};${x}H`;
}

export function write(out: string) {
  process.stdout.write(out);
}

export function pad(s: string, w: number): string {
  if (s.length >= w) return s;
  return s + ' '.repeat(w - s.length);
}

export function getTermSize(): { rows: number; cols: number } {
  return {
    rows: process.stdout.rows || 24,
    cols: process.stdout.columns || 80,
  };
}

export function drawBox(
  top: number,
  left: number,
  width: number,
  height: number,
  borderColor: string = C.yellow,
): string[] {
  const out: string[] = [];
  for (let row = 0; row < height; row++) {
    out.push(move(top + row, left));
    if (row === 0) {
      out.push(`${borderColor}╭${'─'.repeat(width - 2)}╮${C.reset}`);
    } else if (row === height - 1) {
      out.push(`${borderColor}╰${'─'.repeat(width - 2)}╯${C.reset}`);
    } else {
      out.push(`${borderColor}│${C.reset}`);
      out.push(`${cls()}${' '.repeat(width - 2)}${C.reset}`);
      out.push(`${move(top + row, left + width - 1)}${borderColor}│${C.reset}`);
    }
  }
  return out;
}

export function drawText(
  top: number,
  left: number,
  width: number,
  text: string,
  style: string = '',
): string[] {
  const out: string[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    out.push(move(top + i, left));
    out.push(`${cls()}${style}${pad(lines[i], width)}${C.reset}`);
  }
  return out;
}

export function drawHLine(
  top: number,
  left: number,
  width: number,
  color: string = C.gray,
): string {
  return `${move(top, left)}${color}${'─'.repeat(width)}${C.reset}`;
}

export function drawListSelector(
  top: number,
  left: number,
  width: number,
  maxHeight: number,
  items: string[],
  selectedIndex: number,
): string[] {
  const out: string[] = [];
  const display = items.slice(0, maxHeight);

  for (let i = 0; i < display.length; i++) {
    const isSelected = i === selectedIndex;
    out.push(move(top + i, left));
    const marker = isSelected ? `${C.green}▶${C.reset} ` : '  ';
    const text = isSelected ? `${C.green + C.bold}${pad(display[i], width - 2)}${C.reset}` : pad(display[i], width - 2);
    out.push(`${cls()}${marker}${text}`);
  }
  return out;
}
