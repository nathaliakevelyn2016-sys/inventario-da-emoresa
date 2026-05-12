/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import InventoryDashboard from './components/InventoryDashboard';
import { LogIn, Database, ShieldCheck, Package2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

function LoginScreen() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro ao processar a solicitação.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-xl space-y-8 relative overflow-hidden group">
        {/* Animated Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl group-hover:bg-brand-primary/10 transition-colors" />
        
        <div className="space-y-4 relative text-center">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package2 className="w-8 h-8 text-brand-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none uppercase">
              Inventory<span className="text-brand-primary">Control</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
              Acesso ao Sistema
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">E-mail</label>
            <input 
              type="email"
              required
              placeholder="seu@email.com"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">Senha</label>
            <input 
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover transition-all uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Entrar')}
          </motion.button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-300 tracking-widest bg-white px-4">Ou</div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={loginWithGoogle}
          className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]"
        >
          <LogIn className="w-4 h-4 text-brand-primary" />
          Continuar com Google
        </motion.button>

        <div className="text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[10px] font-bold uppercase text-brand-primary tracking-widest hover:underline"
          >
            {isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem conta? Registre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MainContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm uppercase italic opacity-40">
        Inicializando Sistema...
      </div>
    );
  }

  return user ? <InventoryDashboard /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
