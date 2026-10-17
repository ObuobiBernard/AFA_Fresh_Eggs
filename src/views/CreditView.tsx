import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { gh, formatPhone } from '../constants';
import { CustomerItem } from '../types';
import { CustomerStatementModal } from '../components/CustomerStatementModal';
import { vibrateSuccess } from '../utils/haptics';

export const CreditView: React.FC = () => {
  const { appState, can, debts, addCustomer, payDebt, mayDel, delItem, me } = useApp();

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [payInputs, setPayInputs] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statementCustomer, setStatementCustomer] = useState<CustomerItem | null>(null);

  if (!can('pay') && !can('customer')) {
    return (
      <div className="c">
        <h2>🔒 Customer Credit</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Your role does not include access to this screen.
        </p>
      </div>
    );
  }

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = addCustomer(custName, custPhone);
    if (ok) {
      vibrateSuccess();
      setCustName('');
      setCustPhone('');
    }
  };

  const handleRecordPayment = (custId: string, amt: number) => {
    payDebt(custId, amt);
    vibrateSuccess();
  };

  const allDebts = debts();
  const filteredDebts = allDebts.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = appState.customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <>
      <div className="c">
        <h2>Customer Credit & Directory</h2>

        {/* Live Customer Search Bar */}
        <div style={{ marginBottom: '14px' }}>
          <input
            type="search"
            placeholder="🔍 Search customers by name or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>

        {can('customer') && (
          <form onSubmit={handleAddCustomer} style={{ marginBottom: '14px' }}>
            <input
              placeholder="New customer name"
              value={custName}
              onChange={e => setCustName(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={custPhone}
              onChange={e => setCustPhone(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <button type="submit">Add Customer</button>
          </form>
        )}

        <h3>Outstanding Customer Balances ({filteredDebts.length})</h3>
        {filteredDebts.length > 0 ? (
          filteredDebts.map(x => {
            const custObj = appState.customers.find(c => c.id === x.id);
            const phone = custObj ? custObj.phone : '';
            const waMsg = encodeURIComponent(
              `Hello ${x.name}, friendly reminder from AFA Fresh Eggs for your balance of ${gh(x.bal)}. Thank you!`
            );
            const waLink = phone ? `https://wa.me/${formatPhone(phone)}?text=${waMsg}` : null;
            const currentPayVal = payInputs[x.id] ?? '';

            return (
              <div key={x.id} style={{ padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
                <div className="l" style={{ border: 0, padding: 0 }}>
                  <div
                    style={{ cursor: custObj ? 'pointer' : 'default' }}
                    onClick={() => custObj && setStatementCustomer(custObj)}
                  >
                    <b>{x.name}</b>
                    <small>
                      📞 {phone || 'None'}
                      {x.due && ` · Due ${x.due}`}
                    </small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b className="n">{gh(x.bal)}</b>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {custObj && (
                    <button
                      type="button"
                      className="s"
                      style={{ color: 'var(--tx)', border: '1px solid var(--bd)', background: 'var(--bg)', padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => setStatementCustomer(custObj)}
                    >
                      📄 Statement
                    </button>
                  )}
                  {waLink && (
                    <a
                      className="btn-link btn-wa"
                      style={{ padding: '5px 10px', fontSize: '12px', width: 'auto' }}
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </div>

                {can('pay') && (
                  <div className="r" style={{ marginTop: '8px', gridTemplateColumns: '1fr auto' }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Amount"
                      value={currentPayVal}
                      onChange={e => setPayInputs({ ...payInputs, [x.id]: e.target.value })}
                      style={{ margin: 0 }}
                    />
                    <button
                      type="button"
                      style={{ width: 'auto' }}
                      onClick={() => {
                        const amt = parseFloat(currentPayVal) || 0;
                        handleRecordPayment(x.id, amt);
                        setPayInputs({ ...payInputs, [x.id]: '' });
                      }}
                    >
                      Record Payment
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <small style={{ color: 'var(--mu)' }}>
            {searchTerm ? 'No matching customer balances.' : 'No outstanding debts.'}
          </small>
        )}
      </div>

      {/* Debt payment history with undo/delete */}
      {(can('del') || me.role === 'data_entry') && (
        <div className="c">
          <h3>Recent Debt Payments</h3>
          {appState.pay.length > 0 ? (
            appState.pay.slice(-8).reverse().map(p => {
              const cObj = appState.customers.find(c => c.id === p.cust_id);
              return (
                <div className="l" key={p.id}>
                  <div>
                    <b>{cObj ? cObj.name : 'Customer'}</b>
                    <small>{p.date}</small>
                  </div>
                  <b>{gh(p.amt)}</b>
                  {mayDel('pay', p) && (
                    <button
                      type="button"
                      className="s"
                      onClick={() => delItem('pay', p.id)}
                      title="Delete payment"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <small style={{ color: 'var(--mu)' }}>No debt payments recorded yet.</small>
          )}
        </div>
      )}

      {/* Full customer directory with Search & Statement shortcuts */}
      <details className="c">
        <summary>👥 All Customers Directory ({filteredCustomers.length})</summary>
        <div>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(c => {
              const wa = c.phone ? (
                <a
                  className="btn-link btn-wa"
                  style={{ padding: '4px 8px', fontSize: '11px', width: 'auto', minHeight: 'auto' }}
                  href={`https://wa.me/${formatPhone(c.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 Chat
                </a>
              ) : null;

              return (
                <div className="l" key={c.id}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => setStatementCustomer(c)}
                  >
                    <b>{c.name}</b>
                    <small>📞 {c.phone || 'No phone'}</small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="s"
                      style={{ color: 'var(--tx)', border: '1px solid var(--bd)', background: 'var(--bg)', padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => setStatementCustomer(c)}
                    >
                      📄 Statement
                    </button>
                    {wa}
                    {mayDel('customers', c) && (
                      <button
                        type="button"
                        className="s"
                        onClick={() => delItem('customers', c.id)}
                        title="Delete customer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <small style={{ color: 'var(--mu)' }}>No customers found.</small>
          )}
        </div>
      </details>

      {/* Customer Statement Modal */}
      {statementCustomer && (
        <CustomerStatementModal
          customer={statementCustomer}
          sales={appState.sales}
          payments={appState.pay}
          onClose={() => setStatementCustomer(null)}
          onRecordPayment={can('pay') ? handleRecordPayment : undefined}
        />
      )}
    </>
  );
};
