import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, File, Grid, List, RefreshCw, Search, HardDrive } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/services/api';
import StatusBadge from '@/components/StatusBadge';

interface FileRecord { id: string; name: string; originalName: string; mimeType: string; sizeBytes: number; status: string; isClientVisible: boolean; currentVersion: number; createdAt: string; description?: string; expiryDate?: string; }
interface StorageInfo { usedBytes: number; limitBytes: number | null; }

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiles = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search?.trim()) params.search = search.trim();
      const { data } = await api.get('/files', { params });
      setFiles(data.data || data);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  const fetchStorage = useCallback(async () => {
    try {
      const { data } = await api.get('/files/storage');
      setStorage(data);
    } catch { /* empty */ }
  }, []);

  useEffect(() => { fetchFiles(); fetchStorage(); }, [fetchFiles, fetchStorage]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchFiles(value);
    }, 400);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    try {
      await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchFiles(searchTerm);
      fetchStorage();
    } catch { /* empty */ }
  };

  const formatSize = (bytes: number) => {
    const b = Number(bytes);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const storagePercent = storage?.limitBytes
    ? Math.min(100, Math.round((Number(storage.usedBytes) / Number(storage.limitBytes)) * 100))
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documenti</h1>
          <p className="text-sm text-gray-500">Gestione file con versioning</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
          <button onClick={() => fetchFiles(searchTerm)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><RefreshCw className="w-4 h-4" /></button>
          <input type="file" ref={fileInput} onChange={handleUpload} className="hidden" />
          <button onClick={() => fileInput.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Upload className="w-4 h-4" /> Carica File
          </button>
        </div>
      </div>

      {/* Storage usage indicator */}
      {storage && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Spazio di archiviazione</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storagePercent !== null && storagePercent > 90
                    ? 'bg-red-500'
                    : storagePercent !== null && storagePercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: storagePercent !== null ? `${storagePercent}%` : '0%' }}
              />
            </div>
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {formatSize(Number(storage.usedBytes))}
              {storage.limitBytes
                ? ` / ${formatSize(Number(storage.limitBytes))} (${storagePercent}%)`
                : ' utilizzati (nessun limite)'}
            </span>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca per nome, descrizione o tag..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Caricamento...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <File className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{searchTerm ? 'Nessun file trovato' : 'Nessun file caricato'}</p>
          {!searchTerm && (
            <button onClick={() => fileInput.current?.click()} className="mt-3 text-sm text-blue-600 hover:underline">Carica il primo file</button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Stato</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Versione</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Dimensione</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Data</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Scadenza</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Visibile</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 font-medium flex items-center gap-2"><File className="w-4 h-4 text-gray-400" />{f.name || f.originalName}</td>
                  <td className="py-3 px-4"><StatusBadge status={f.status} /></td>
                  <td className="py-3 px-4 text-gray-500">v{f.currentVersion || 1}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{formatSize(f.sizeBytes || 0)}</td>
                  <td className="py-3 px-4 text-gray-500">{format(new Date(f.createdAt), 'dd/MM/yyyy')}</td>
                  <td className="py-3 px-4 text-gray-500">
                    {f.expiryDate ? (
                      <span className={new Date(f.expiryDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(f.expiryDate), 'dd/MM/yyyy')}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">{f.isClientVisible ? <span className="text-green-600">Si</span> : <span className="text-gray-400">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
