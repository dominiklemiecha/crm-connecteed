import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Plus, Star, Trash2, Eye, Save, ChevronLeft, Tag, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../services/api';

type TemplateType = 'quote' | 'contract';

interface Template {
  id: string;
  type: TemplateType;
  name: string;
  htmlContent: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Variable {
  name: string;
  description: string;
}

const TYPE_LABELS: Record<TemplateType, string> = { quote: 'Preventivi', contract: 'Contratti' };

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote'],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link', 'image'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'align',
  'list', 'bullet', 'blockquote', 'indent',
  'link', 'image',
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<TemplateType>('quote');
  const [editing, setEditing] = useState<Template | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const quillRef = useRef<ReactQuill>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      await api.post('/templates/ensure-defaults');
      const { data } = await api.get('/templates', { params: { type: activeType } });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setTemplates(list.filter((t: Template) => t.type === activeType));
    } catch { setTemplates([]); }
    setLoading(false);
  }, [activeType]);

  const fetchVariables = useCallback(async () => {
    try {
      const { data } = await api.get(`/templates/variables/${activeType}`);
      setVariables(Array.isArray(data) ? data : []);
    } catch { setVariables([]); }
  }, [activeType]);

  useEffect(() => { fetchTemplates(); fetchVariables(); }, [fetchTemplates, fetchVariables]);

  const openEditor = (tpl?: Template) => {
    if (tpl) {
      setEditing(tpl);
      setEditorName(tpl.name);
      setEditorContent(tpl.htmlContent);
    } else {
      setEditing({ id: '', type: activeType, name: '', htmlContent: '', isDefault: false, createdAt: '', updatedAt: '' });
      setEditorName(activeType === 'quote' ? 'Nuovo Template Preventivo' : 'Nuovo Template Contratto');
      setEditorContent('');
    }
    setShowPreview(false);
    setError('');
  };

  const insertVariable = (varName: string) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const range = editor.getSelection(true);
      const tag = `{{${varName}}}`;
      editor.insertText(range.index, tag, { bold: true, color: '#1d4ed8', background: '#dbeafe' });
      editor.setSelection(range.index + tag.length, 0);
    }
  };

  const handleSave = async () => {
    if (!editorName.trim()) { setError('Il nome è obbligatorio.'); return; }
    setSaving(true); setError('');
    try {
      if (editing?.id) {
        await api.put(`/templates/${editing.id}`, { name: editorName, htmlContent: editorContent });
      } else {
        await api.post('/templates', { type: activeType, name: editorName, htmlContent: editorContent });
      }
      setEditing(null);
      fetchTemplates();
    } catch {
      setError('Errore durante il salvataggio.');
    }
    setSaving(false);
  };

  const handleSetDefault = async (id: string) => {
    await api.put(`/templates/${id}/set-default`);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo template?')) return;
    await api.delete(`/templates/${id}`);
    fetchTemplates();
  };

  const handlePreview = async () => {
    if (!editing) return;
    try {
      const { data } = await api.post('/templates/preview', {
        templateId: editing.id || undefined,
        htmlContent: editing.id ? undefined : editorContent,
        type: activeType,
      });
      setPreviewHtml(data.html ?? data);
      setShowPreview(true);
    } catch { setError('Errore durante l\'anteprima.'); }
  };

  // ─── EDITOR VIEW ───────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {editing.id ? 'Modifica Template' : 'Nuovo Template'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
              <Eye className="w-4 h-4" /> Anteprima
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
              <Save className="w-4 h-4" /> {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Name */}
        <input
          type="text"
          value={editorName}
          onChange={(e) => setEditorName(e.target.value)}
          placeholder="Nome del template..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />

        <div className="grid grid-cols-[1fr_250px] gap-4">
          {/* WYSIWYG Editor — il foglio */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm" style={{ minHeight: 600 }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={editorContent}
              onChange={setEditorContent}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Scrivi qui il contenuto del documento...&#10;&#10;Inserisci le variabili dal pannello a destra per i dati automatici del cliente."
              style={{ height: 550 }}
            />
          </div>

          {/* Variables panel */}
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Inserisci Dati Automatici
                </h3>
                <p className="text-xs text-blue-600 mt-0.5">Clicca per inserire nel documento</p>
              </div>
              <div className="p-2 space-y-0.5 max-h-[520px] overflow-y-auto sidebar-scroll">
                {variables.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => insertVariable(v.name)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium group-hover:bg-blue-200 transition-colors">
                      {v.name.replace(/_/g, ' ')}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-1 leading-tight">{v.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800">
                <strong>Suggerimento:</strong> Le variabili (in blu) verranno sostituite automaticamente con i dati reali del cliente quando generi il documento.
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                Anteprima Documento (con dati di esempio)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(`<html><head><title>Anteprima</title><style>body{font-family:Arial;max-width:800px;margin:40px auto;padding:20px;}@media print{button{display:none!important;}}</style></head><body>${previewHtml}<br/><button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Stampa / Salva PDF</button></body></html>`);
                      w.document.close();
                    }
                  }}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apri in nuova finestra
                </button>
                <button onClick={() => setShowPreview(false)} className="text-xs text-gray-500 hover:text-gray-700">Chiudi</button>
              </div>
            </div>
            <div className="p-8 bg-white max-h-[600px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Template Documenti
          </h1>
          <p className="text-sm text-gray-500 mt-1">Personalizza i modelli per preventivi e contratti</p>
        </div>
        <button onClick={() => openEditor()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuovo Template
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2">
        {(['quote', 'contract'] as TemplateType[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-5 py-2 text-sm rounded-lg font-medium transition-colors ${activeType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nessun template. Creane uno nuovo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => openEditor(tpl)}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{tpl.name}</h3>
                  {tpl.isDefault && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Default</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">Modificato: {format(new Date(tpl.updatedAt), 'dd MMM yyyy HH:mm', { locale: it })}</p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {!tpl.isDefault && (
                  <button onClick={() => handleSetDefault(tpl.id)} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Imposta come default">
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(tpl.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Elimina">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
