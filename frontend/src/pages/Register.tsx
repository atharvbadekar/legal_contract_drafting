import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, Scale } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.register(name, email, password, role);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
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

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
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
