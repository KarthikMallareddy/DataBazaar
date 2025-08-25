import { FormEvent, useState, useEffect } from 'react';
import './index.scss';
import { backend } from 'declarations/backend';
import { EnvironmentBanner } from './components/EnvironmentBanner';
import { splitFileIntoChunks, encryptChunk, generateEncryptionKey, hashChunk } from './utils/chunking';
import { Principal } from '@dfinity/principal';

interface DataState {
  dataId: string;
  data: string | null;
  isLoading: boolean;
  error: string | null;
  isUploading: boolean;
  uploadProgress: number;
  userProfile: UserProfile | null;
  selectedFile: File | null;
}

interface UserProfile {
  principal: string;
  username: string;
  roles: string[];
  created_at: bigint;
  data_items_sold: bigint;
  data_items_bought: bigint;
}

export default function App() {
  const [view, setView] = useState<'menu' | 'browse' | 'add'>('menu');
  const [csvFiles, setCsvFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Add this state for canister databases
  const [canisterDatabases, setCanisterDatabases] = useState<any[]>([]);

  useEffect(() => {
    setCsvFiles([
      'Final-50-stocks (1).csv',
      'Netflix Dataset.csv',
      'RBI-Reference-Rate-17-06-2025-to-17-07-2025.csv',
      'synthetic_coffee_health_10000.csv',
    ]);
  }, []);

  // Fetch all canister databases using canister API
  async function fetchCanisterDatabases() {
    try {
      // Prefer fetching all items in one call
      if (typeof (backend as any).list_data_items === 'function') {
        const items = await (backend as any).list_data_items();
        // items: Array<[bigint, DataItem]>
        const mapped = items.map(([id, item]: [bigint, any]) => ({ id: Number(id), ...item }));
        setCanisterDatabases(mapped);
        return;
      }
      // Fallback: use list_data_ids then fetch each
      if (typeof (backend as any).list_data_ids === 'function') {
        const ids: bigint[] = await (backend as any).list_data_ids();
        const results: any[] = [];
        for (const id of ids) {
          try {
            const res = await backend.get_data(id);
            if (res && res.Ok) results.push({ id: Number(id), ...res.Ok });
          } catch {}
        }
        setCanisterDatabases(results);
        return;
      }
    } catch (e) {
      console.error('Failed to fetch canister databases', e);
    }
  }

  useEffect(() => {
    fetchCanisterDatabases();
  }, []);

  // Sidebar menu items
  const menuItems = [
    { label: 'Home', icon: '🏠', onClick: () => setView('menu') },
    { label: 'Datasets', icon: '🗂️', onClick: () => setView('browse') },
    { label: 'Add Database', icon: '➕', onClick: () => setView('add') },
    // Add more items as needed
  ];

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar" style={{ width: 220, background: 'var(--primary-color)', borderRight: '1px solid #e0e0e0', padding: '2rem 0 2rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: '#fff' }}>
        <div className="sidebar-logo" style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 32, marginLeft: 12 }}>DataBazaar</div>
        <nav style={{ width: '100%' }}>
          {menuItems.map((item, idx) => {
            const isActive = view === (item.label === 'Home' ? 'menu' : item.label === 'Datasets' ? 'browse' : 'add');
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '90%',
                  background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                  border: isActive ? '2px solid #fff' : '2px solid transparent',
                  outline: 'none',
                  padding: '0.85rem 1.2rem',
                  fontSize: 17,
                  color: '#fff',
                  cursor: 'pointer',
                  borderRadius: 8,
                  marginBottom: 10,
                  fontWeight: isActive ? 'bold' : 'normal',
                  boxShadow: isActive ? '0 2px 8px 0 rgba(0,0,0,0.08)' : 'none',
                  transition: 'background 0.2s, border 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                onMouseOut={e => (e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.18)' : 'transparent')}
              >
                <span style={{ fontSize: 22, marginRight: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: '#aaa', marginLeft: 12 }}>&copy; 2025 DataBazaar</div>
      </aside>
      <div className="app-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header className="app-header" style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '1rem 2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="secondary-btn">Connect Wallet</button>
        </header>
        <main className="main-content" style={{ flex: 1, padding: '2rem 2rem' }}>
          {view === 'menu' && (
            <div className="menu">
              <h2>Welcome to DataBazaar</h2>
              <div className="menu-options">
                <button className="primary-btn" onClick={() => setView('browse')}>Browse Databases</button>
                <button className="primary-btn" onClick={() => setView('add')}>Add Database</button>
              </div>
              <div className="sample-databases">
                <h3>Sample Databases (CSV)</h3>
                <ul>
                  {csvFiles.map((file, idx) => (
                    <li key={idx} className="sample-db-card">
                      <a href={`/samples/${encodeURIComponent(file)}`} download>{file}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {view === 'browse' && (
            <div className="browse-view">
              <button className="secondary-btn" onClick={() => setView('menu')}>← Back to Menu</button>
              <h2>Browse Databases (CSV)</h2>
              {/* Sample datasets from /public/samples */}
              <section style={{ marginTop: 20 }}>
                <h3>Sample Datasets</h3>
                {csvFiles.length === 0 ? (
                  <div className="empty-hint">No sample datasets found.</div>
                ) : (
                  <ul>
                    {csvFiles.map((file, idx) => (
                      <li key={idx} className="sample-db-card">
                        <a href={`/samples/${encodeURIComponent(file)}`} download>{file}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Databases stored in canister */}
              <section style={{ marginTop: 28 }}>
                <h3>Canister Databases</h3>
                {canisterDatabases.length === 0 ? (
                  <div className="empty-hint">No canister databases yet. Add one from the "Add Database" tab.</div>
                ) : (
                  <ul>
                    {canisterDatabases.map((db, idx) => (
                      <li key={idx} className="sample-db-card">
                        <strong>{db.name}</strong> (ID: {db.id})
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
          {view === 'add' && (
            <div className="add-view">
              <button className="secondary-btn" onClick={() => { setView('menu'); setAddSuccess(false); setSelectedFile(null); }}>← Back to Menu</button>
              <h2>Add Database</h2>
              <form className="add-db-form" onSubmit={async e => {
                e.preventDefault();
                if (!selectedFile) return;
                // Read file as ArrayBuffer
                const arrayBuffer = await selectedFile.arrayBuffer();
                const bytes = Array.from(new Uint8Array(arrayBuffer));
                // Prepare metadata
                const metadata = {
                  category: 'csv',
                  tags: [],
                  file_type: 'csv',
                  total_chunks: 1,
                  total_size: BigInt(bytes.length),
                  created_at: BigInt(Date.now()),
                  updated_at: BigInt(Date.now()),
                };
                // Create listing
                const listingRes = await backend.create_data_listing(selectedFile.name, selectedFile.name, BigInt(0), metadata);
                if (listingRes && listingRes.Ok !== undefined) {
                  const dataId = listingRes.Ok;
                  // Upload chunk
                  const chunk = {
                    chunk_index: 0,
                    encrypted_data: bytes,
                    chunk_hash: [],
                  };
                  await backend.upload_data_chunk(dataId, chunk);
                  setAddSuccess(true);
                  setTimeout(() => setAddSuccess(false), 2000);
                  setView('menu');
                  setSelectedFile(null);
                  fetchCanisterDatabases();
                } else {
                  alert('Failed to add database');
                }
              }}>
                <div className="form-group">
                  <label htmlFor="dbName">Database Name</label>
                  <input id="dbName" name="dbName" type="text" required placeholder="Enter database name" />
                </div>
                <div className="form-group">
                  <label htmlFor="dbDesc">Description</label>
                  <input id="dbDesc" name="dbDesc" type="text" required placeholder="Enter description" />
                </div>
                <div className="form-group">
                  <label htmlFor="dbFile">CSV File</label>
                  <input id="dbFile" name="dbFile" type="file" accept=".csv" required onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                  {selectedFile && <div style={{ marginTop: 8, color: '#555' }}>Selected: {selectedFile.name}</div>}
                </div>
                <button className="primary-btn" type="submit">Add Database</button>
                {addSuccess && <div style={{ color: 'var(--success-color)', marginTop: 10 }}>Database added (demo)!</div>}
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
