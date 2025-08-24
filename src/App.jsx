import React, { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next"
import "./styles.css";

const ENDPOINT = "https://graphql.union.build/v1/graphql";

function nanoToDecimal(amount, decimals = 18) {
  try {
    const v = BigInt(amount);
    const d = BigInt(10) ** BigInt(decimals);
    const whole = v / d;
    const frac = (v % d).toString().padStart(Number(decimals), "0").slice(0, 6);
    return `${whole}.${frac}`;
  } catch {
    return amount;
  }
}

const UnionDashboard = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [addressFilter, setAddressFilter] = useState("");
  const [status, setStatus] = useState("Loading…");
  const [prevCursor, setPrevCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  const fetchTransfers = async (cur = cursor, comp = comparison, addr = addressFilter) => {
    setLoading(true);
    setStatus("Loading…");
    const args = [`p_limit: 12`];
    if (cur) args.push(`p_sort_order: "${cur}"`);
    if (comp) args.push(`p_comparison: "${comp}"`);
    if (addr) args.push(`p_addresses_canonical: ["${addr}"]`);

    const query = `query GetTransfers @cached(ttl: 1) {
      v2_transfers(args: { ${args.join(", ")} }) {
        sender_canonical
        receiver_canonical
        base_amount
        base_token_meta { denom representations { name symbol decimals } }
        source_universal_chain_id
        destination_universal_chain_id
        sort_order
      }
    }`;

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      const items = json?.data?.v2_transfers ?? [];
      setTransfers(items);
      if (items.length > 0) {
        setPrevCursor(items[0].sort_order);
        setNextCursor(items[items.length - 1].sort_order);
      }
      setStatus(`Loaded ${items.length} transfers`);
    } catch (err) {
      console.error(err);
      setStatus("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
    const interval = setInterval(() => fetchTransfers(), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    setComparison("lt");
    fetchTransfers(nextCursor, "lt");
  };

  const handlePrev = () => {
    setComparison("gt");
    fetchTransfers(prevCursor, "gt");
  };

  const handleFilter = () => {
    setCursor(null);
    setComparison(null);
    fetchTransfers(null, null, addressFilter);
  };

  return (
    <div className="container">
      <header>
        <div className="brand">
          <div className="logo">
            <img src="https://union.build/favicon.ico" alt="Union" style={{ height: "32px", marginLeft: "4px" }} />
          </div>
          <div>
            <h1>Union Dapp Demo</h1>
            <div className="muted small">
              Live transfers from <span className="mono">graphql.union.build</span> + quick actions
            </div>
          </div>
        </div>
        <div className="actions">
          <a className="btn" href="https://app.union.build/transfer" target="_blank" rel="noopener noreferrer">🚀 Try a Transfer</a>
          <a className="btn" href="https://app.union.build/faucet" target="_blank" rel="noopener noreferrer">💧 Get Testnet Tokens</a>
          <a className="btn" href="https://docs.union.build/" target="_blank" rel="noopener noreferrer">📚 Docs</a>
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <div className="caption">
            <h2>Latest Transfers</h2>
            <div className="row muted small">
              {loading && <div className="spinner"></div>} <span>{status}</span>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>From → To</th>
                <th>Sender → Receiver</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <Analytics />
              {transfers.map((t, idx) => {
                const rep = t.base_token_meta?.representations?.[0] ?? { name: "", symbol: "", decimals: 18 };
                const amount = nanoToDecimal(t.base_amount, rep.decimals);
                return (
                  <tr key={idx}>
                    <td className="small">
                      <span className="pill">{t.source_universal_chain_id}</span> → <span className="pill">{t.destination_universal_chain_id}</span>
                    </td>
                    <td className="mono small">{t.sender_canonical.slice(0,10)}… → {t.receiver_canonical.slice(0,10)}…</td>
                    <td className="mono">{amount} <span className="muted">{rep.symbol || rep.name}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="row" style={{ justifyContent: "space-between", marginTop: "10px" }}>
            <button className="btn" onClick={handlePrev} disabled={!prevCursor}>◀ Prev</button>
            <h3 className="small">Auto-refresh every 5 seconds</h3>
            <button className="btn" onClick={handleNext} disabled={!nextCursor}>Next ▶</button>
          </div>
        </section>

        <aside className="card">
          <h2>Quick Start</h2>
          <ol className="small" style={{ lineHeight: "1.6" }}>
            <li>Install <strong>Keplr</strong> (Cosmos) and an <strong>EVM wallet</strong> (e.g. Rabby).</li>
            <li>Claim tokens at the <a href="https://app.union.build/faucet" target="_blank" rel="noopener noreferrer">Union faucets</a>.</li>
            <li>Make a tiny cross-chain transfer in <a href="https://app.union.build/transfer" target="_blank" rel="noopener noreferrer">Union App</a>.</li>
          </ol>
          <h2 style={{ marginTop: "12px" }}>Dev Links</h2>
          <ul className="small">
            <li><a href="https://docs.union.build/integrations/api/graphql/" target="_blank" rel="noopener noreferrer">GraphQL guide</a></li>
            <li><a href="https://docs.union.build/integrations/typescript/" target="_blank" rel="noopener noreferrer">TypeScript SDK</a></li>
            <li><a href="https://docs.union.build/ucs/00/" target="_blank" rel="noopener noreferrer">UCS00 Ping-Pong (Hello World)</a></li>
          </ul>
          <h2 style={{ marginTop: "12px" }}>Filter by Address</h2>
          <h3 className="small">Filter by canonical address (sender or receiver)</h3>
          <input className="mono" placeholder="0xabc… or cosmos1…" value={addressFilter} onChange={(e)=>setAddressFilter(e.target.value)} style={{ width: "100%", padding:"10px", borderRadius:"10px", border:"1px solid #334155", background:"#0b1222", color:"var(--text)"}} />
          <button className="btn" style={{ marginTop:"8px", width:"100%" }} onClick={handleFilter}>Apply Filter</button>
          <h3 className="small">Tip: paste your EVM or Cosmos canonical address to see only your transfers.</h3>
        </aside>
      </div>

      <footer>
        Built by <a href="https://github.com/fawazdevx" target="_blank" rel="noopener noreferrer" style={{ color:"var(--accent)" }}>Unrealfdev</a>. Not affiliated with <a href="https://union.build/" target="_blank" rel="noopener noreferrer" style={{ color:"var(--accent)" }}>Union</a>. Follow updates on <a href="https://x.com/fawaz2022oy" target="_blank" rel="noopener noreferrer" style={{ color:"var(--accent)" }}>X</a>. Data via <span className="mono">graphql.union.build</span>.
      </footer>
    </div>
  )
}

export default UnionDashboard;
