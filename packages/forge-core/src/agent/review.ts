export interface ReviewFinding {
  id: string;
  file: string;
  lineStart?: number;
  lineEnd?: number;
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: 'security' | 'performance' | 'bug' | 'style' | 'maintainability' | 'naming' | 'other';
  title: string;
  description: string;
  suggestion: string;
}

export interface ReviewSession {
  id: string;
  source: string;
  url: string;
  status: 'fetching' | 'reviewing' | 'complete' | 'error';
  progress: string;
  findings: ReviewFinding[];
  summary: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface ReviewReport {
  session: ReviewSession;
  stats: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  checklist: ChecklistResult[];
}

export interface ChecklistResult {
  item: string;
  passed: boolean;
  details: string;
}
