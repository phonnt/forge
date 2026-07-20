import { SectionViewProvider } from '../shared/sectionView.js';

export function createTitleView(): SectionViewProvider {
  return new SectionViewProvider([
    { label: 'Reviewer' },
    { label: 'Architect' },
  ]);
}
