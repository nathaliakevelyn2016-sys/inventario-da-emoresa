import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Product, OperationType } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { Plus, Search, Trash2, Edit2, Save, X, Loader2, Package2, DollarSign, Minus, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ProductRowProps {
  key?: string | number;
  product?: Product;
  isNew?: boolean;
  isEditing?: boolean;
  onCancel?: () => void;
  onSave?: () => void;
  setEditingId?: (id: string | null) => void;
}

function ProductRow({ product, isNew, isEditing, onCancel, onSave, setEditingId }: ProductRowProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Product>>(
    product || { name: '', sku: '', stock: 0, price: 0, supplier: '', category: '', imageUrl: '' }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${user.uid}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.name) return;

    setSaving(true);
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        ownerId: user.uid
      };

      if (isNew) {
        await addDoc(collection(db, 'products'), data);
        onSave?.();
      } else if (product?.id) {
        await updateDoc(doc(db, 'products', product.id), data);
        setEditingId?.(null);
      }
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, 'products');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id || !confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await deleteDoc(doc(db, 'products', product.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${product.id}`);
    }
  };

  const handleQuickStock = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!product?.id || !user) return;
    
    const newStock = Math.max(0, (product.stock || 0) + delta);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        stock: newStock,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  if (!isEditing && !isNew && product) {
    return (
      <motion.tr
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setEditingId?.(product.id!)}
        className="hover:bg-slate-50 group transition-colors cursor-pointer"
      >
        <td className="px-6 py-5">
          <div className="flex items-center gap-4">
            {product.imageUrl ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col gap-1.5 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="font-bold text-lg text-slate-900 leading-tight truncate">{product.name}</div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded tracking-tighter uppercase whitespace-nowrap">
                  #{product.sku || 'N/A'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-primary/5 text-brand-primary rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  {product.category || 'GERAL'}
                </span>
                <span className="border-l border-slate-200 h-3" />
                <span className="text-slate-400 truncate max-w-[120px]">{product.supplier || 'FORNECEDOR N/I'}</span>
                <span className="border-l border-slate-200 h-3" />
                <span className="text-slate-900 font-bold">{formatCurrency(product.price)}</span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-5 text-right whitespace-nowrap">
          <div className="inline-flex items-center gap-4 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={(e) => handleQuickStock(e, -1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-slate-400 hover:text-red-500 hover:shadow-sm border border-slate-200 hover:border-red-100 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="flex flex-col items-center min-w-[50px]">
              <span className={cn(
                "font-mono font-bold text-xl leading-none",
                product.stock < 10 ? "text-amber-500" : "text-slate-900"
              )}>
                {product.stock.toString().padStart(2, '0')}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Estoque</span>
            </div>
            <button 
              onClick={(e) => handleQuickStock(e, 1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-slate-400 hover:text-emerald-50 hover:shadow-sm border border-slate-200 hover:border-emerald-100 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td className="px-6 py-5 text-right w-12">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 text-slate-300 group-hover:text-slate-400 group-hover:bg-slate-100 transition-all">
            <Edit2 className="w-3.5 h-3.5" />
          </div>
        </td>
      </motion.tr>
    );
  }

  return (
    <motion.tr 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-100/50 shadow-inner"
    >
      <td className="px-6 py-6" colSpan={2}>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr] gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Imagem do Produto</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group",
                formData.imageUrl ? "border-brand-primary/20 bg-brand-primary/5" : "border-slate-200 hover:border-brand-primary/40 hover:bg-slate-50"
              )}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tighter">Enviando...</span>
                </div>
              ) : formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <UploadCloud className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-100 rounded-xl text-slate-400 group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-all">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Clique para upload</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
            {formData.imageUrl && (
              <button 
                onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                className="w-full text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-500 py-1 transition-colors"
              >
                Remover Imagem
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome do Produto</label>
              <input 
                autoFocus
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none font-semibold transition-all"
                placeholder="Ex: Teclado Mecânico RGB"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">SKU</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-brand-primary/20 outline-none uppercase font-bold text-slate-500 transition-all"
                  placeholder="ID ÚNICO"
                  value={formData.sku}
                  onChange={e => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-brand-primary/20 outline-none uppercase font-bold text-slate-500 transition-all"
                  placeholder="EX: PERIFÉRICOS"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estoque</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none font-bold transition-all"
                  placeholder="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none font-bold transition-all"
                  placeholder="0,00"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fornecedor</label>
              <input 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                placeholder="Nome do fornecedor"
                value={formData.supplier}
                onChange={e => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button 
                disabled={saving}
                onClick={handleSave} 
                className="flex-1 bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary-hover disabled:opacity-50 transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Salvar Alterações</>}
              </button>
              {!isNew && (
                <button 
                  onClick={handleDelete}
                  className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100"
                  title="Excluir Produto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={isNew ? onCancel : () => setEditingId?.(null)} 
                className="px-4 py-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition-all border border-slate-100"
                title="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </td>
      <td className="w-0"></td>
    </motion.tr>
  );
}

export default function InventoryDashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');

  // Derive unique categories
  const categories = ['TODOS', ...Array.from(new Set(products.map(p => p.category || 'GERAL').map(c => c.toUpperCase())))].sort();

  // Real-time listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'products'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, [user]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const productCat = (p.category || 'GERAL').toUpperCase();
    const matchesCategory = selectedCategory === 'TODOS' || productCat === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalItems: products.length,
    totalValue: products.reduce((acc, p) => acc + (p.price * p.stock), 0),
    lowStock: products.filter(p => p.stock < 10).length,
    totalStock: products.reduce((acc, p) => acc + p.stock, 0)
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Inventário</h1>
          <p className="text-slate-500 text-sm">Bem-vindo, {user?.email?.split('@')[0]}. Painel central de produtos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Sair
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-5 py-2.5 bg-brand-primary rounded-xl text-sm font-semibold text-white shadow-md hover:bg-brand-primary-hover transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </header>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Valor Total em Estoque</p>
            <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalValue)}</h3>
          </div>
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-7 h-7 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Itens Baixo Estoque</p>
          <h3 className={cn("text-3xl font-bold transition-colors", stats.lowStock > 0 ? "text-amber-500" : "text-slate-900")}>
            {stats.lowStock}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">Requer atenção imediata</p>
        </div>

        <div className="bg-brand-primary rounded-2xl p-6 shadow-lg text-white group hover:-translate-y-1 transition-transform">
          <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Total de Itens</p>
          <h3 className="text-3xl font-bold italic">{stats.totalStock}</h3>
          <p className="text-[10px] opacity-70 mt-1 uppercase font-medium">Volume físico total</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Category Filter Row */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 whitespace-nowrap">Filtrar por:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border",
                selectedCategory === cat 
                  ? "bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20 scale-105" 
                  : "bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Table Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, SKU ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white"
            />
          </div>
          <div className="text-xs font-medium text-slate-400">
            Exibindo {filteredProducts.length} de {products.length} itens
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Detalhes do Produto</th>
                <th className="px-6 py-4 text-right">Controle de Estoque</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {isAdding && (
                  <ProductRow 
                    isNew 
                    onCancel={() => setIsAdding(false)} 
                    onSave={() => setIsAdding(false)}
                  />
                )}
                {filteredProducts.map((product) => (
                  <ProductRow 
                    key={product.id!} 
                    product={product} 
                    isEditing={editingId === product.id}
                    setEditingId={setEditingId}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {!loading && filteredProducts.length === 0 && !isAdding && (
          <div className="px-6 py-20 text-center flex flex-col items-center gap-3">
            <Package2 className="w-12 h-12 text-slate-200" />
            <p className="text-slate-400 font-medium">Nenhum produto encontrado na base de dados.</p>
          </div>
        )}
        
        {loading && (
          <div className="px-6 py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-primary opacity-40" />
          </div>
        )}
      </div>
    </div>
  );
}
