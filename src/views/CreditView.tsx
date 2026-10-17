import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { gh, formatPhone, COUNTRY_DIAL_CODES } from '../constants';
import { CustomerItem } from '../types';
import { CustomerStatementModal } from '../components/CustomerStatementModal';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { vibrateSuccess } from '../utils/haptics';

export const CreditView: React.FC = () => {
  const { appState, can, debts, addCustomer, updateCustomer, payDebt, mayDel, delItem, me } = useApp();

  const [custName, setCustName] = useState('');
  const [custDialCode, setCustDialCode] = useState('+233');
  const [custPhone, setCustPhone] = useState('');
  const [payInputs, setPayInputs] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statementCustomer, setStatementCustomer] = useState<CustomerItem | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [submittingCust, setSubmittingCust] = useState(false);

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
    if (submittingCust) return;
    setSubmittingCust(true);
    const finalPhone = custPhone.trim()
      ? (custDialCode === '+' ? custPhone.trim() : `${custDialCode}${custPhone.trim().replace(/^0+/, '')}`)
      : '';
    const ok = addCustomer(custName, finalPhone);
    if (ok) {
      vibrateSuccess();
      setCustName('');
      setCustPhone('');
    }
    setTimeout(() => setSubmittingCust(false), 400);
  };

  const handleRecordPayment = (custId: string, amt: number) => {
    payDebt(custId, amt);
    vibrateSuccess();
  };

  const allDebts = debts();

  const debtMap = useMemo(() => {
    const m: Record<string, number> = {};
    allDebts.forEach(d => {
      m[d.id] = d.bal;
    });
    return m;
  }, [allDebts]);

  const cleanSearch = searchTerm.trim().toLowerCase();
  const searchDigits = searchTerm.replace(/\D/g, '');

  // Smart matching across both name and phone numbers
  const matchingCustomers = useMemo(() => {
    if (!cleanSearch) return [];
    return appState.customers.filter(c => {
      if (c.name.toLowerCase().includes(cleanSearch)) return true;
      if (c.phone && c.phone.toLowerCase().includes(cleanSearch)) return true;
      if (searchDigits && c.phone) {
        const pDigits = c.phone.replace(/\D/g, '');
        if (pDigits.includes(searchDigits)) return true;
      }
      return false;
    });
  }, [appState.customers, cleanSearch, searchDigits]);

  const filteredDebts = allDebts.filter(d =>
    d.name.toLowerCase().includes(cleanSearch)
  );

  const filteredCustomers = useMemo(() => {
    if (!cleanSearch) return appState.customers;
    return matchingCustomers;
  }, [appState.customers, cleanSearch, matchingCustomers]);

  return (
    <>
      <div className="c">
        <h2>Customer Credit & Directory</h2>

        {/* Live Customer Search Bar */}
        <div style={{ marginBottom: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="search"
              placeholder="🔍 Search customer by name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ margin: 0 }}
              autoFocus={Boolean(searchTerm)}
            />
            {searchTerm && (
              <button
                type="button"
                className="s"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                title="Clear search"
                style={{ padding: '10px 14px', fontSize: '13px', minHeight: 'auto', flex: 'none', background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Search Results Dropdown / Picker */}
        {cleanSearch && (
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: '14px',
              border: '2px solid var(--g)',
              padding: '12px',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(31, 94, 59, 0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <b style={{ fontSize: '13px', color: 'var(--g)' }}>
                🎯 Search Results ({matchingCustomers.length})
              </b>
              <small style={{ color: 'var(--mu)', fontSize: '11px' }}>
                Tap customer to select & view statement
              </small>
            </div>

            {matchingCustomers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                {matchingCustomers.map(c => {
                  const bal = debtMap[c.id] || 0;
                  const wa = c.phone ? (
                    <a
                      className="btn-link btn-wa"
                      style={{ padding: '5px 8px', fontSize: '11px', width: 'auto', minHeight: 'auto' }}
                      href={`https://wa.me/${formatPhone(c.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                    >
                      💬 Chat
                    </a>
                  ) : null;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setStatementCustomer(c)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: 'var(--cd)',
                        borderRadius: '10px',
                        border: '1px solid var(--bd)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, border-color 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--g)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd)')}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <b style={{ fontSize: '15px', color: 'var(--tx)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </b>
                        <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                          📞 {c.phone || 'No phone recorded'}
                        </small>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 'none' }}>
                        {bal > 0 ? (
                          <span
                            className="sync-pill"
                            style={{ background: 'rgba(211, 47, 47, 0.15)', color: 'var(--rd)', fontWeight: 700, fontSize: '11px' }}
                          >
                            Due: {gh(bal)}
                          </span>
                        ) : (
                          <span
                            className="sync-pill"
                            style={{ background: 'rgba(37, 211, 102, 0.15)', color: 'var(--g)', fontWeight: 600, fontSize: '11px' }}
                          >
                            ✅ No Balance
                          </span>
                        )}

                        <button
                          type="button"
                          className="s"
                          style={{
                            color: '#ffffff',
                            background: 'var(--g)',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            setStatementCustomer(c);
                          }}
                        >
                          Select ➔
                        </button>

                        {can('customer') && (
                          <button
                            type="button"
                            className="s"
                            style={{ color: 'var(--tx)', border: '1px solid var(--bd)', background: 'var(--bg)', padding: '5px 8px', fontSize: '11px' }}
                            onClick={e => {
                              e.stopPropagation();
                              setEditingCustomer(c);
                            }}
                            aria-label={`Edit ${c.name}`}
                            title="Edit customer details"
                          >
                            ✏️
                          </button>
                        )}

                        {wa}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '12px 6px', textAlign: 'center' }}>
                <div style={{ color: 'var(--mu)', fontSize: '13px', marginBottom: '10px' }}>
                  No customer found matching &ldquo;{searchTerm}&rdquo;.
                </div>
                {can('customer') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustName(searchTerm.trim());
                    }}
                    style={{
                      width: 'auto',
                      padding: '8px 16px',
                      fontSize: '13px',
                      background: 'var(--g)',
                      color: '#ffffff'
                    }}
                  >
                    + Add &ldquo;{searchTerm.trim()}&rdquo; as Customer
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {can('customer') && (
          <form onSubmit={handleAddCustomer} style={{ marginBottom: '14px' }}>
            <input
              placeholder="New customer name"
              value={custName}
              onChange={e => setCustName(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', marginBottom: '8px' }}>
              <select
                value={custDialCode}
                onChange={e => setCustDialCode(e.target.value)}
                aria-label="Country Code"
                style={{ margin: 0 }}
              >
                {COUNTRY_DIAL_CODES.map(cd => (
                  <option key={cd.code} value={cd.code}>
                    {cd.flag} {cd.country} ({cd.code})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="Phone number"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                style={{ margin: 0 }}
              />
            </div>
            <small style={{ display: 'block', color: 'var(--mu)', fontSize: '11px', margin: '0 0 8px' }}>
              ℹ️ Customer details are collected strictly for order receipts and credit balance statements.
            </small>
            <button type="submit" disabled={submittingCust}>
              {submittingCust ? 'Saving...' : 'Add Customer'}
            </button>
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
      <details className="c" open={Boolean(cleanSearch)}>
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
                    {can('customer') && (
                      <button
                        type="button"
                        className="s"
                        style={{ color: 'var(--tx)', border: '1px solid var(--bd)', background: 'var(--bg)', padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => setEditingCustomer(c)}
                        aria-label={`Edit ${c.name}`}
                        title="Edit customer details"
                      >
                        ✏️ Edit
                      </button>
                    )}
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
                        aria-label={`Delete customer ${c.name}`}
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

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onSave={updateCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </>
  );
};
