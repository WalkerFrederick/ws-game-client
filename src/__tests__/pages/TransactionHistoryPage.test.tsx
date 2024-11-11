import { render, screen, waitFor } from '@testing-library/react';

import TransactionHistory from '@/app/transactions/page';

import { data as MockData } from '../../app/api/getTransactions/route';

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: MockData }),
  })
) as jest.Mock;

describe('Transaction History Page', () => {
  it('renders the transactions', async () => {
    render(<TransactionHistory />);

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });
  });
  it('transaction amounts display correctly', async () => {
    render(<TransactionHistory />);

    await waitFor(() => {
      const transactionAmountText = screen.getAllByText(`Amount: $5.00`);
      expect(transactionAmountText[0]).toBeInTheDocument();
    });
  });
});
