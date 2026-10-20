import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { gh, formatPhone, COUNTRY_DIAL_CODES } from '../constants';
import { CustomerItem } from '../types';
import { CustomerStatementModal } from '../components/CustomerStatementModal';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { vibrateSuccess } from '../utils/haptics';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const CreditView: React.FC = () => {
  const { appState, can, debts, addCustomer, updateCustomer, payDebt, mayDel, delItem, refreshFromCloud } = useApp();

  const [custName, setCustName] = useState('');
  const [custDialCode, setCustDialCode] = useState('+233');
  const [custPhone, setCustPhone] = useState('');
  const [payInputs, setPayInputs] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statementCustomer, setStatementCustomer] = useState<CustomerItem | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [submittingCust, setSubmittingCust] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await refreshFromCloud();
    setSyncing(false);
  };

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
      <Breadcrumbs currentTab="credit" />

      <div className="c">
        <h1>Customer Credit Accounts &amp; Statements</h1>

        {/* Live Search Bar */}
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

                        {mayDel('customers', c) && (
                          <button
                            type="button"
                            className="s"
                            style={{
                              color: 'var(--rd)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              background: 'var(--bg)',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              delItem('customers', c.id);
                            }}
                            aria-label={`Delete customer ${c.name}`}
                            title="Delete customer permanently"
                          >
                            🗑️
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

        {/* Add Customer Form */}
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

        {/* Outstanding Debts list */}
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
                  {can('pay') && (
                    <>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Pay GH₵"
                        value={currentPayVal}
                        onChange={e =>
                          setPayInputs(prev => ({ ...prev, [x.id]: e.target.value }))
                        }
                        style={{ width: '110px', margin: 0, padding: '4px 8px', fontSize: '12px' }}
                      />
                      <button
                        type="button"
                        className="s"
                        onClick={() => {
                          const val = parseFloat(currentPayVal);
                          if (val > 0) {
                            handleRecordPayment(x.id, val);
                            setPayInputs(prev => ({ ...prev, [x.id]: '' }));
                          }
                        }}
                        style={{ padding: '4px 10px', fontSize: '12px', minHeight: 'auto' }}
                      >
                        Record
                      </button>
                    </>
                  )}

                  {custObj && (
                    <button
                      type="button"
                      className="s"
                      style={{ background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)', padding: '4px 8px', fontSize: '11px', minHeight: 'auto' }}
                      onClick={() => setStatementCustomer(custObj)}
                    >
                      Statement
                    </button>
                  )}

                  {waLink && (
                    <a
                      className="btn-link btn-wa"
                      style={{ padding: '4px 8px', fontSize: '11px', width: 'auto', minHeight: 'auto' }}
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Remind WA
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <small style={{ color: 'var(--mu)' }}>
            {searchTerm ? 'No matching customer balances.' : 'No outstanding debts.'}
          </small>
        )}
      </div>

      {/* Full Customer Directory (Collapsible Dropdown) */}
      <details className="c" open={Boolean(cleanSearch)}>
        <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>👥 All Customers Directory ({filteredCustomers.length})</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="s"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                handleSync();
              }}
              disabled={syncing}
              title="Refresh customers from Supabase database"
              style={{ fontSize: '11px', padding: '3px 8px', minHeight: 'auto' }}
            >
              {syncing ? 'Syncing...' : '🔄 Sync DB'}
            </button>
            <span className="summary-chevron">▼</span>
          </div>
        </summary>
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
                        title="Delete customer permanently"
                        style={{
                          color: 'var(--rd)',
                          borderColor: 'rgba(239, 68, 68, 0.35)',
                          background: 'var(--bg)',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        🗑️ Delete
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
          onDelete={mayDel('customers', editingCustomer) ? id => delItem('customers', id) : undefined}
        />
      )}
    </>
  );
};
