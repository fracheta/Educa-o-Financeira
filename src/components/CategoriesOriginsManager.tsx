import { Building2, Plus, Tag, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Category, CategoryScope, Origin } from '../types/finance';
import {
  FALLBACK_CATEGORY_COLORS,
  formatBRL,
  validateCategoryInput,
  validateOriginName,
} from '../utils/finance';

interface CategoriesOriginsManagerProps {
  categories: Category[];
  origins: Origin[];
  originBalances: Record<string, number>;
  onAddCategory: (input: {
    name: string;
    type: CategoryScope;
    color: string;
  }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onAddOrigin: (name: string) => Promise<void>;
  onDeleteOrigin: (id: string) => Promise<void>;
}

export function CategoriesOriginsManager({
  categories,
  origins,
  originBalances,
  onAddCategory,
  onDeleteCategory,
  onAddOrigin,
  onDeleteOrigin,
}: CategoriesOriginsManagerProps) {
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<CategoryScope>('despesa');
  const [catColor, setCatColor] = useState(FALLBACK_CATEGORY_COLORS[1]);
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const [oriName, setOriName] = useState('');
  const [oriError, setOriError] = useState('');
  const [oriSaving, setOriSaving] = useState(false);

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (catSaving) return;

    const validation = validateCategoryInput(
      catName,
      catType,
      catColor,
      categories
    );
    if (!validation.valid || !validation.data) {
      setCatError(
        validation.errors.name ||
          validation.errors.color ||
          'Dados inválidos para categoria.'
      );
      return;
    }

    setCatSaving(true);
    setCatError('');
    try {
      await onAddCategory(validation.data);
      setCatName('');
    } catch (err) {
      setCatError(
        err instanceof Error ? err.message : 'Erro ao criar categoria.'
      );
    } finally {
      setCatSaving(false);
    }
  };

  const handleCreateOrigin = async (e: FormEvent) => {
    e.preventDefault();
    if (oriSaving) return;

    const validation = validateOriginName(oriName, origins);
    if (!validation.valid || !validation.data) {
      setOriError(validation.errors.name || 'Nome inválido.');
      return;
    }

    setOriSaving(true);
    setOriError('');
    try {
      await onAddOrigin(validation.data.name);
      setOriName('');
    } catch (err) {
      setOriError(err instanceof Error ? err.message : 'Erro ao criar banco.');
    } finally {
      setOriSaving(false);
    }
  };

  return (
    <section
      aria-label="Gestão de Categorias e Origens"
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {/* Categorias */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-slate-500" aria-hidden="true" />
          Categorias Financeiras
        </h2>

        <form onSubmit={handleCreateCategory} className="space-y-3 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="new-cat-name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Nova categoria
              </label>
              <input
                id="new-cat-name"
                type="text"
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  setCatError('');
                }}
                placeholder="Ex: Assinaturas, Viagens..."
                maxLength={60}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="new-cat-type"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Aplicação
              </label>
              <select
                id="new-cat-type"
                value={catType}
                onChange={(e) => setCatType(e.target.value as CategoryScope)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label
                htmlFor="new-cat-color"
                className="text-xs font-medium text-slate-700"
              >
                Cor no gráfico:
              </label>
              <input
                id="new-cat-color"
                type="color"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={catSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {catSaving ? 'Adicionando...' : 'Adicionar Categoria'}
            </button>
          </div>

          {catError && (
            <p role="alert" className="text-xs text-red-600">
              {catError}
            </p>
          )}
        </form>

        <div className="divide-y divide-slate-100 border-t border-slate-200">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {cat.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cat.type === 'receita'
                      ? 'Receita'
                      : cat.type === 'despesa'
                        ? 'Despesa'
                        : 'Receita e Despesa'}
                    {cat.isDefault ? ' · Padrão' : ' · Personalizada'}
                  </p>
                </div>
              </div>

              {!cat.isDefault && (
                <button
                  type="button"
                  onClick={() => onDeleteCategory(cat.id)}
                  aria-label={`Remover categoria '${cat.name}'`}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bancos e Origens */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-slate-500" aria-hidden="true" />
          Bancos e Origens
        </h2>

        <form onSubmit={handleCreateOrigin} className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="new-ori-name" className="sr-only">
                Nome do banco ou origem
              </label>
              <input
                id="new-ori-name"
                type="text"
                value={oriName}
                onChange={(e) => {
                  setOriName(e.target.value);
                  setOriError('');
                }}
                placeholder="Ex: Banco Inter, Santander, Carteira..."
                maxLength={60}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={oriSaving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {oriSaving ? 'Salvando...' : 'Adicionar Banco'}
            </button>
          </div>

          {oriError && (
            <p role="alert" className="text-xs text-red-600">
              {oriError}
            </p>
          )}
        </form>

        <div className="divide-y divide-slate-100 border-t border-slate-200">
          {origins.map((origin) => (
            <div
              key={origin.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {origin.name}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  Saldo atual: {formatBRL(originBalances[origin.name] ?? 0)}
                  {origin.isDefault ? ' · Padrão' : ''}
                </p>
              </div>

              {!origin.isDefault && (
                <button
                  type="button"
                  onClick={() => onDeleteOrigin(origin.id)}
                  aria-label={`Remover origem '${origin.name}'`}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
