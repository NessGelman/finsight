import { formatCurrency, formatMonths } from '../../utils/formatters';

export function AmortizationModal({ product, onClose }) {
    if (!product) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3>{product.label} Schedule</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {formatMonths(product.termMonths)} Term • {formatCurrency(product.principal)} Principal
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="schedule-summary-grid">
                        <div className="summary-item">
                            <span className="summary-label">Monthly Payment</span>
                            <span className="summary-value">{formatCurrency(product.monthlyPayment)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Total Interest/Fees</span>
                            <span className="summary-value">{formatCurrency(product.totalInterest)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Total Payback</span>
                            <span className="summary-value">{formatCurrency(product.totalCost)}</span>
                        </div>
                    </div>

                    <div className="schedule-table-container">
                        <table className="schedule-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Payment</th>
                                    <th>Principal</th>
                                    <th>Interest</th>
                                    <th>Remaining</th>
                                </tr>
                            </thead>
                            <tbody>
                                {product.schedule?.map((row) => (
                                    <tr key={row.month}>
                                        <td>{row.month}</td>
                                        <td>{formatCurrency(row.payment)}</td>
                                        <td>{formatCurrency(row.principal)}</td>
                                        <td>{formatCurrency(row.interest)}</td>
                                        <td>{formatCurrency(row.remaining)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="modal-footer">
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        * This schedule is an estimate based on standard amortization. Actual terms may vary by lender.
                    </p>
                </div>
            </div>
        </div>
    );
}
