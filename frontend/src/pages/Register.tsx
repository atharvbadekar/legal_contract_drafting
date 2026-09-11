import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, getApiBaseUrl } from '../services/api';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, Scale, Settings, Check } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [showConfig, setShowConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSaveApiUrl = () => {
    let clean = apiUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api') && !clean.includes('/api/')) {
      clean = `${clean}/api`;
    }
    localStorage.setItem('atharv_api_url', clean);
    setApiUrl(clean);
    setConfigSuccess(`✓ API URL saved: ${clean}`);
    setError('');
    setTimeout(() => setConfigSuccess(''), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.register(name, email, password, role);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        setShowConfig(true);
        setError(`Cannot connect to backend at "${getApiBaseUrl()}". If deploying to Vercel/Render, please enter your Render backend URL below.`);
      } else {
        setError(err.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-mira-border shadow-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mira-light text-mira-primary mb-3 shadow-inner">
            <Scale className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-mira-dark tracking-tight">Create Atharv Legal AI Account</h2>
          <p className="text-xs text-mira-muted mt-1">
            Join the Legal AI Document Generation & Validation Research Platform
          </p>
        </div>

        {/* Backend API Configuration Panel */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium flex items-center gap-1">
              <Settings className="w-3.5 h-3.5 text-gray-500" />
              API Server: <span className="font-mono text-[11px] text-gray-800 truncate max-w-[200px]">{apiUrl}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-mira-primary text-[11px] font-semibold hover:underline"
            >
              {showConfig ? 'Hide' : 'Configure'}
            </button>
          </div>

          {showConfig && (
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <p className="text-[11px] text-gray-500">
                If your frontend is on Vercel and backend is on Render, paste your Render API URL here:
              </p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://your-backend.onrender.com/api"
                  className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs focus:outline-hidden focus:border-mira-primary font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="px-3 py-1.5 bg-mira-primary hover:bg-mira-accent text-white rounded text-xs font-semibold shadow-2xs whitespace-nowrap"
                >
                  Save & Connect
                </button>
              </div>
              {configSuccess && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {configSuccess}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg space-y-1">
            <div className="font-semibold">{error}</div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-medium text-mira-dark mb-1">Full Legal Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-mira-muted absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adv. Priya Sharma"
                className="w-full pl-9 pr-3 py-2 bg-white border border-mira-border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-mira-primary/20 focus:border-mira-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mira-dark mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-mira-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@lawfirm.in"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-3 py-2 bg-white border border-mira-border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-mira-primary/20 focus:border-mira-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mira-dark mb-1">Platform Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('USER')}
                className={`py-2 px-3 text-xs rounded-lg border font-medium transition-colors ${
                  role === 'USER'
                    ? 'border-mira-primary bg-mira-light text-mira-primary'
                    : 'border-mira-border text-mira-muted hover:bg-gray-50'
                }`}
              >
                Researcher / Legal Drafter
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-2 px-3 text-xs rounded-lg border font-medium transition-colors ${
                  role === 'ADMIN'
                    ? 'border-mira-primary bg-mira-light text-mira-primary'
                    : 'border-mira-border text-mira-muted hover:bg-gray-50'
                }`}
              >
                Lead Counsel / Admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-mira-primary hover:bg-mira-accent text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register for Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-mira-muted pt-2 border-t border-mira-border">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-mira-primary hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};
