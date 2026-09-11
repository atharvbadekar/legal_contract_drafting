import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { Shield, Lock, Mail, ArrowRight, UserCheck, Scale } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        setError('Cannot connect to backend API server. If deployed on Render free tier, please wait 30-45 seconds for the server to wake up from sleep.');
      } else {
        setError(err.response?.data?.error || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setLoading(true);
    try {
      const data = await authService.login(demoEmail, demoPass);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        setError('Cannot connect to backend API server. If deployed on Render free tier, please wait 30-45 seconds for the server to wake up from sleep.');
      } else {
        setError(err.response?.data?.error || 'Failed demo login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-mira-border shadow-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mira-light text-mira-primary mb-3 shadow-inner">
            <Scale className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-mira-dark tracking-tight">Atharv Legal AI</h2>
          <p className="text-xs text-mira-muted mt-1">
            Research Prototype — Controlled Legal Document Generation & Validation
          </p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="bg-mira-light/70 p-3.5 rounded-xl border border-purple-100 space-y-2">
          <p className="text-[11px] font-semibold text-mira-primary uppercase tracking-wider text-center">
            Quick Research Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('user@atharv.legal', 'user123')}
              className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium text-mira-dark hover:border-mira-primary hover:text-mira-primary transition-colors flex items-center justify-center gap-1 shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-mira-primary" />
              User (Researcher)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@atharv.legal', 'admin123')}
              className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium text-mira-dark hover:border-mira-primary hover:text-mira-primary transition-colors flex items-center justify-center gap-1 shadow-2xs"
            >
              <Shield className="w-3.5 h-3.5 text-mira-primary" />
              Admin (Legal Lead)
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-medium text-mira-dark mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-mira-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@mira.legal"
                className="w-full pl-9 pr-3 py-2 bg-white border border-mira-border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-mira-primary/20 focus:border-mira-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mira-dark mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-mira-muted absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-white border border-mira-border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-mira-primary/20 focus:border-mira-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-mira-primary hover:bg-mira-accent text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In to Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-mira-muted pt-2 border-t border-mira-border">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-mira-primary hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
