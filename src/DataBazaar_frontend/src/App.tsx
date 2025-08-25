import { FormEvent, useState, useEffect } from 'react';
import './index.scss';
// @ts-ignore
import { backend, createActor, canisterId } from './declarations/backend';
import { EnvironmentBanner } from './components/EnvironmentBanner';
import { splitFileIntoChunks, encryptChunk, generateEncryptionKey, hashChunk } from './utils/chunking';
import { Principal } from '@dfinity/principal';
import { Home, Database, Plus, Download, Upload, BarChart3 } from 'lucide-react';

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

  // Function to download a database from the canister
  const downloadDatabase = async (databaseId: number, databaseName: string) => {
    try {
      const backendActor = getBackendActor();
      const result: any = await (backendActor as any).get_listing(BigInt(databaseId));
      
      if (!result || !result.Ok) {
        throw new Error(result?.Err || 'Failed to fetch database');
      }
      
      const listing = result.Ok;
      const dataContent = listing.data_content;
      
      if (!dataContent || dataContent.length === 0) {
        throw new Error('No data content found for this database');
      }
      
      // Convert blob to Uint8Array and then to string
      const uint8Array = new Uint8Array(dataContent);
      const csvContent = new TextDecoder('utf-8').decode(uint8Array);
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${databaseName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Database downloaded successfully');
    } catch (error) {
      console.error('Failed to download database:', error);
      alert(`Failed to download database: ${error}`);
    }
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
    { label: 'Home', icon: <Home size={18} />, onClick: () => setView('menu') },
    { label: 'Datasets', icon: <Database size={18} />, onClick: () => setView('browse') },
    { label: 'Add Database', icon: <Plus size={18} />, onClick: () => setView('add') },
    // Add more items as needed
  ];

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar" style={{ width: 220, background: 'var(--primary-color)', borderRight: '1px solid #e0e0e0', padding: '2rem 0 2rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: '#fff' }}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="DataBazaar" />
          <span>DataBazaar</span>
        </div>
        <nav style={{ width: '100%' }}>
          {menuItems.map((item, idx) => {
            const isActive = view === (item.label === 'Home' ? 'menu' : item.label === 'Datasets' ? 'browse' : 'add');
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={isActive ? 'active' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '90%',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0.875rem 1rem',
                  fontSize: 15,
                  fontWeight: 500,
                  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  borderRadius: 8,
                  marginBottom: 8,
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.15)' : 'transparent';
                  e.currentTarget.style.color = isActive ? 'white' : 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <span style={{ fontSize: 18, marginRight: 12, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
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
            <div className="menu-view">
              <h1>Welcome to DataBazaar</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '3rem' }}>
                Your decentralized marketplace for data assets
              </p>
              
              <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ background: 'var(--background-color)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'var(--gradient-primary)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Total Datasets</h3>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-color)' }}>{canisterDatabases.length}</p>
                  </div>
                </div>
                <div style={{ background: 'var(--background-color)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'var(--gradient-success)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Sample Data</h3>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-color)' }}>{csvFiles.length}</p>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--background-color)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--gradient-accent)', borderRadius: 'var(--radius-lg)', padding: '0.75rem' }}>
                      <Database size={24} color="white" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Browse Datasets</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Explore available datasets and download what you need</p>
                  <button 
                    className="primary-btn" 
                    onClick={() => setView('browse')}
                    style={{ width: '100%' }}
                  >
                    Browse Datasets
                  </button>
                </div>
                
                <div style={{ background: 'var(--background-color)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--gradient-secondary)', borderRadius: 'var(--radius-lg)', padding: '0.75rem' }}>
                      <Upload size={24} color="white" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Upload Data</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Share your CSV datasets with the community</p>
                  <button 
                    className="primary-btn" 
                    onClick={() => setView('add')}
                    style={{ width: '100%' }}
                  >
                    Upload Dataset
                  </button>
                </div>
              </div>
            </div>
          )}
          {view === 'browse' && (
            <div className="browse-view">
              <div className="view-header">
                <h2>Browse Datasets</h2>
                <button className="back-btn" onClick={() => setView('menu')}>← Back to Home</button>
              </div>
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
                  <div className="database-grid">
                    {canisterDatabases.map((db, idx) => (
                      <div key={idx} className="database-card">
                        <div className="card-header">
                          <div>
                            <div className="card-title">{db.name}</div>
                          </div>
                          <div className="card-id">ID: {db.id}</div>
                        </div>
                        <div className="card-description">{db.description}</div>
                        <div className="card-footer">
                          <div className="card-price">{db.price} tokens</div>
                          <button 
                            className="download-btn"
                            onClick={() => downloadDatabase(db.id, db.name)}
                          >
                            <Download size={16} />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
          {view === 'add' && (
            <div className="add-view">
              <div className="view-header">
                <h2>Upload Dataset</h2>
                <button className="back-btn" onClick={() => { setView('menu'); setAddSuccess(false); setSelectedFile(null); }}>← Back to Home</button>
              </div>
              
              <div className="upload-form">
                <form onSubmit={async e => {
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
                  {addError && <div style={{ color: 'var(--error-color)', marginTop: 10 }}>{addError}</div>}
                  {addSuccess && <div style={{ color: 'var(--success-color)', marginTop: 10 }}>Database added!</div>}
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
