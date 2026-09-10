import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  BarChart3, 
  Shield, 
  FolderLock, 
  BookOpen, 
  PlusCircle, 
  LogOut, 
  User as UserIcon, 
  ChevronDown,
  Layers
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-mira-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-mira-primary to-mira-secondary flex items-center justify-center text-white font-bold text-lg shadow-sm">
                A
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-mira-dark tracking-tight">Atharv Legal AI</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-mira-light text-mira-primary px-1.5 py-0.5 rounded">
                    Enterprise
                  </span>
                </div>
                <span className="text-[10px] text-mira-muted -mt-0.5 hidden sm:block">
                  Document Generation & Validation
                </span>
              </div>
            </Link>

            {/* Main Nav Links */}
            {user && (
              <div className="hidden md:flex items-center space-x-1">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/dashboard')
                      ? 'bg-mira-light text-mira-primary font-semibold'
                      : 'text-mira-dark hover:bg-gray-50'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Dashboard
                </Link>

                <Link
                  to="/create"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/create')
                      ? 'bg-mira-light text-mira-primary font-semibold'
                      : 'text-mira-dark hover:bg-gray-50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-mira-primary" />
                  Create Document
                </Link>

                <Link
                  to="/documents"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/documents')
                      ? 'bg-mira-light text-mira-primary font-semibold'
                      : 'text-mira-dark hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  My Documents
                </Link>

                <Link
                  to="/research"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/research')
                      ? 'bg-mira-light text-mira-primary font-semibold'
                      : 'text-mira-dark hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  Research Benchmark
                </Link>

                {/* Admin Dropdown */}
                {isAdmin && (
                  <div className="relative">
                    <button
                      onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                      className="px-3 py-2 rounded-md text-sm font-medium text-mira-dark hover:bg-gray-50 flex items-center gap-1"
                    >
                      <Shield className="w-4 h-4 text-mira-primary" />
                      Admin
                      <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-mira-muted" />
                    </button>

                    {adminMenuOpen && (
                      <div 
                        className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-mira-border py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
                        onMouseLeave={() => setAdminMenuOpen(false)}
                      >
                        <Link
                          to="/admin/templates"
                          onClick={() => setAdminMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-mira-dark hover:bg-mira-light hover:text-mira-primary"
                        >
                          <FileText className="w-4 h-4" />
                          Manage Templates
                        </Link>
                        <Link
                          to="/admin/clauses"
                          onClick={() => setAdminMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-mira-dark hover:bg-mira-light hover:text-mira-primary"
                        >
                          <FolderLock className="w-4 h-4" />
                          Approved Clauses
                        </Link>
                        <Link
                          to="/admin/knowledge"
                          onClick={() => setAdminMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-mira-dark hover:bg-mira-light hover:text-mira-primary"
                        >
                          <BookOpen className="w-4 h-4" />
                          Knowledge RAG
                        </Link>
                        <Link
                          to="/admin/audit"
                          onClick={() => setAdminMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-mira-dark hover:bg-mira-light hover:text-mira-primary"
                        >
                          <Shield className="w-4 h-4" />
                          System Audit Trail
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile / Logout */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-mira-dark leading-tight">{user.name}</span>
                  <span className="text-[11px] text-mira-muted flex items-center justify-end gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'ADMIN' ? 'bg-mira-primary' : 'bg-emerald-500'}`} />
                    {user.role}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 border border-mira-border flex items-center justify-center text-mira-dark">
                  <UserIcon className="w-4 h-4" />
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 text-mira-muted hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-mira-dark hover:text-mira-primary px-3 py-1.5 rounded-md"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-mira-primary hover:bg-mira-accent text-white px-3.5 py-1.5 rounded-md shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
