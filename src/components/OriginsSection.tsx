import { Building2, Plus, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Origin } from '../types/finance';
import { formatBRL, validateOriginName } from '../utils/finance';

interface OriginsSectionProps {
  origins: Origin[];
  originBalances: Record<string, number>;
  onAddOrigin: (name: string) => Promise<void>;
}

export function OriginsSection({
  origins,
  originBalances,
  onAddOrigin,
}: OriginsSectionProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateOriginName(name, origins);
    if (!validation.valid || !validation.data) {
      setError(validation.errors.name || 'Nome inválido.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onAddOrigin(validation.data.name);
      setName('');
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar banco.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-label="Saldos por Origem" className="mb-8">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-500" aria-hidden="true" />
          Saldos por Origem
        </h2>
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setError('');
          }}
          className="text-sm font-medium bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Adicionar Banco
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {origins.map((origin) => {
          const balance = originBalances[origin.name] ?? 0;
          return (
            <div
              key={origin.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
            >
              <h4
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 truncate"
                title={origin.name}
              >
                {origin.name}
              </h4>
              <div
                className={`text-lg font-medium tabular-nums ${
                  balance < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatBRL(balance)}
              </div>
            </div>
          );
        })}

        {adding && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-300 rounded-lg p-3 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Nome do banco"
                aria-label="Nome do banco"
                autoFocus
                maxLength={60}
                className="w-full min-w-0 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setName('');
                  setError('');
                }}
                aria-label="Cancelar novo banco"
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white text-xs font-medium py-1.5 px-3 rounded hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
