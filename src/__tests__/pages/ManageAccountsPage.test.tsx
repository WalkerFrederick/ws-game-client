import { render, screen, waitFor } from '@testing-library/react';

import ManageAccounts from '@/app/manage-accounts/page';

import { data as MockData } from '../../app/api/getAccounts/route';

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: MockData }),
  })
) as jest.Mock;

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as jest.Mock;

describe('Manage Accounts Page', () => {
  it('renders the accounts', async () => {
    render(<ManageAccounts />);

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });
  });
});
