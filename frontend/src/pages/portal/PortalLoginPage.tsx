import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import logoUrl from '../../assets/logo-connecteed.svg';

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Email e password sono obbligatori.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user_type', 'client');
      navigate('/portal');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Credenziali non valide.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoUrl} alt="Connecteed" className="h-8 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Portale Cliente</h1>
          <p className="text-blue-200 text-sm mt-1">Area Riservata</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Accedi al tuo portale</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua-email@azienda.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:bg-blue-400 transition-colors mt-2"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Hai problemi di accesso? Contatta il tuo referente Connecteed.
          </p>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          Sei un utente interno?{' '}
          <a href="/login" className="text-white underline hover:no-underline">Accedi qui</a>
        </p>
      </div>
    </div>
  );
}
