import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { api } from '../../lib/api';

export default function StaffLoginPage() {
  const { venueSlug } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api<{ user: { id: string; name: string; role: string; venueId: string } }>(
        '/staff/login',
        { method: 'POST', body: JSON.stringify({ email, password, venueSlug }) }
      );
      sessionStorage.setItem('staffUser', JSON.stringify(result.user));
      sessionStorage.setItem('venueSlug', venueSlug!);
      navigate(`/staff/${venueSlug}/dashboard`);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-dark text-white flex items-center justify-center px-6">
      <form onSubmit={handleLogin} className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <LogIn className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">Staff Login</h1>
          <p className="text-gray-400 mt-1 capitalize">{venueSlug?.replace(/-/g, ' ')}</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-xs text-gray-600 text-center mt-6">
          Demo: manager@elbhar.tn / demo1234
        </p>
      </form>
    </div>
  );
}
