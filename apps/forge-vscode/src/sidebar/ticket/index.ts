import { SectionViewProvider } from '../shared/sectionView.js';

export function createTicketView(): SectionViewProvider {
  return new SectionViewProvider([
    { label: 'Ticket A' },
    { label: 'Ticket B' },
  ]);
}
