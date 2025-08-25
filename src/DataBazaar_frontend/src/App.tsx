import { FormEvent, useState, useEffect } from 'react';
import './index.scss';
// @ts-ignore
import { backend, createActor, canisterId } from '../declarations/backend';
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

  // Function to get a working backend actor
  const getBackendActor = () => {
    if (backend) {
      return backend;
    }
    if (canisterId) {
      return createActor(canisterId);
    }
    throw new Error('Backend canister not available');
  };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
      const backendActor = getBackendActor();
      // Use the new get_listings method
      const listings: any = await (backendActor as any).get_listings();
      if (listings && Array.isArray(listings)) {
        const results = listings.map((listing: any) => ({
          id: Number(listing.id),
          name: listing.name,
          description: listing.description,
          price: Number(listing.price),
          owner: listing.owner,
          created_at: Number(listing.created_at)
        }));
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
                setAddError(null);
                if (!selectedFile) {
                  setAddError('Please select a CSV file');
                  return;
                }
                try {
                  setAdding(true);
                  const form = e.currentTarget as HTMLFormElement;
                  const name = (form.querySelector('#dbName') as HTMLInputElement)?.value?.trim() || selectedFile.name;
                  const desc = (form.querySelector('#dbDesc') as HTMLInputElement)?.value?.trim() || selectedFile.name;

                  // Read file as ArrayBuffer
                  const arrayBuffer = await selectedFile.arrayBuffer();
                  const bytes = Array.from(new Uint8Array(arrayBuffer));
                  
                  // Get backend actor
                  const backendActor = getBackendActor();
                  
                  // Create listing with the new backend API
                  const listingRes: any = await (backendActor as any).create_data_listing(name, desc, BigInt(100));
                  if (!listingRes || !listingRes.Ok) {
                    throw new Error(listingRes?.Err || 'create_data_listing failed');
                  }
                  const dataId: bigint = listingRes.Ok;
                  
                  // Upload the CSV data to the canister using the bytes already read above
                  const uploadRes: any = await (backendActor as any).upload_data(Number(dataId), Array.from(bytes));
                  if (!uploadRes || !uploadRes.Ok) {
                    throw new Error(uploadRes?.Err || 'upload_data failed');
                  }
                  
                  console.log('Dataset uploaded successfully:', uploadRes.Ok);
                  
                  setAddSuccess(true);
                  setTimeout(() => setAddSuccess(false), 2000);
                  setView('menu');
                  setSelectedFile(null);
                  fetchCanisterDatabases();
                } catch (err: any) {
                  console.error(err);
                  setAddError(err?.message || 'Failed to add database');
                } finally {
                  setAdding(false);
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
                <button className="primary-btn" type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add Database'}</button>
                {addError && <div style={{ color: 'var(--danger-color)', marginTop: 10 }}>{addError}</div>}
                {addSuccess && <div style={{ color: 'var(--success-color)', marginTop: 10 }}>Database added!</div>}
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
