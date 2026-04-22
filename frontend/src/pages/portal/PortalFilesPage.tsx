import { useState, useEffect, useRef } from 'react';
import { FileText, Download, File, ImageIcon, FileCode, Upload, X } from 'lucide-react';
import api from '../../services/api';

interface PortalFile {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
  url?: string;
  category?: string;
  project?: { name: string };
}

const fmt = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const fmtSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function FileIcon({ mimeType }: { mimeType?: string }) {
  if (!mimeType) return <File className="w-5 h-5 text-gray-400" />;
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
  if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileCode className="w-5 h-5 text-emerald-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

export default function PortalFilesPage() {
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadName, setUploadName] = useState('');

  const loadFiles = () => {
    setLoading(true);
    api.get('/portal/files')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setFiles(list);
      })
      .catch(() => setError('Impossibile caricare i documenti.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setUploadError('Seleziona un file.'); return; }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (uploadName.trim()) formData.append('name', uploadName.trim());
      await api.post('/portal/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess('Documento caricato con successo.');
      setShowUpload(false);
      setUploadName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadFiles();
    } catch {
      setUploadError('Errore durante il caricamento.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: PortalFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
      return;
    }
    try {
      const response = await api.get(`/portal/files/${file.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Errore durante il download.');
    }
  };

  const filtered = files.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documenti</h1>
          <p className="text-sm text-gray-500 mt-1">Documenti condivisi con te da Connecteed</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowUpload(!showUpload); setUploadError(''); setUploadSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Carica Documento
          </button>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca documento..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-900">Carica un nuovo documento</h3>
            <button onClick={() => setShowUpload(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs text-blue-700 mb-1">Nome documento (opzionale)</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Es. Documento identita..."
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs text-blue-700 mb-1">File</label>
              <input
                ref={fileInputRef}
                type="file"
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {uploading ? 'Caricamento...' : 'Carica'}
            </button>
          </div>
          {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
        </div>
      )}

      {uploadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">{uploadSuccess}</div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {search ? 'Nessun documento trovato per la ricerca.' : 'Nessun documento disponibile.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Progetto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Dimensione</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => (
                <tr key={file.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileIcon mimeType={file.mimeType} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                        {file.mimeType && <p className="text-xs text-gray-400">{file.mimeType.split('/')[1]?.toUpperCase()}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{file.project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(file.createdAt)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmtSize(file.size)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors ml-auto"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Scarica
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
