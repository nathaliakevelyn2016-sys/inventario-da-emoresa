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
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans">
      <div className="max-w-sm w-full bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-xl space-y-8 relative overflow-hidden group">
        {/* Animated Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl group-hover:bg-brand-primary/10 transition-colors" />
        
        <div className="space-y-4 relative text-center">
          <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package2 className="w-10 h-10 text-brand-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none uppercase">
              Inventory<span className="text-brand-primary">Control</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              Gerenciamento Corporativo
            </p>
          </div>
        </div>

        <div className="space-y-4 relative">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso Restrito</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Utilize sua conta corporativa Google para acessar o painel de inventário.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover transition-all uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Entrar com Google
              </>
            )}
          </motion.button>
        </div>

        <p className="text-[10px] text-slate-300 text-center font-bold uppercase tracking-widest pt-4 border-t border-slate-50">
           Sincronizado via Cloud Edge
        </p>
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
