interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  // Lead statuses
  new: { label: 'Nuovo', classes: 'bg-blue-100 text-blue-700' },
  qualifying: { label: 'In qualifica', classes: 'bg-yellow-100 text-yellow-700' },
  qualified: { label: 'Qualificato', classes: 'bg-green-100 text-green-700' },
  unqualified: { label: 'Non qualificato', classes: 'bg-gray-100 text-gray-600' },

  // Opportunity statuses
  scoping: { label: 'Scoping', classes: 'bg-sky-100 text-sky-700' },
  presales: { label: 'Pre-vendita', classes: 'bg-indigo-100 text-indigo-700' },
  quote_preparing: { label: 'Preventivo', classes: 'bg-violet-100 text-violet-700' },
  awaiting_ceo: { label: 'Attesa CEO', classes: 'bg-amber-100 text-amber-700' },
  sent_to_client: { label: 'Inviato', classes: 'bg-cyan-100 text-cyan-700' },
  negotiation: { label: 'Negoziazione', classes: 'bg-orange-100 text-orange-700' },
  accepted: { label: 'Accettato', classes: 'bg-emerald-100 text-emerald-700' },
  contract_signing: { label: 'Firma contratto', classes: 'bg-teal-100 text-teal-700' },
  awaiting_payment: { label: 'Attesa pagamento', classes: 'bg-lime-100 text-lime-700' },
  won: { label: 'Vinto', classes: 'bg-green-100 text-green-700' },
  lost: { label: 'Perso', classes: 'bg-red-100 text-red-600' },

  // Ticket statuses
  open: { label: 'Aperto', classes: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In lavorazione', classes: 'bg-yellow-100 text-yellow-700' },
  waiting: { label: 'In attesa', classes: 'bg-gray-100 text-gray-600' },
  closed: { label: 'Chiuso', classes: 'bg-green-100 text-green-700' },

  // Ticket priorities
  low: { label: 'Bassa', classes: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Media', classes: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', classes: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', classes: 'bg-red-100 text-red-700' },

  // Quote/Contract/Invoice statuses
  draft: { label: 'Bozza', classes: 'bg-gray-100 text-gray-600' },
  pending_approval: { label: 'In approvazione', classes: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approvato', classes: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rifiutato', classes: 'bg-red-100 text-red-600' },
  sent: { label: 'Inviato', classes: 'bg-cyan-100 text-cyan-700' },
  signed: { label: 'Firmato', classes: 'bg-emerald-100 text-emerald-700' },
  active: { label: 'Attivo', classes: 'bg-green-100 text-green-700' },
  expired: { label: 'Scaduto', classes: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Annullato', classes: 'bg-gray-100 text-gray-500' },

  // Invoice payment status
  unpaid: { label: 'Non pagata', classes: 'bg-red-100 text-red-600' },
  partial: { label: 'Parziale', classes: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pagata', classes: 'bg-green-100 text-green-700' },
  overdue: { label: 'Scaduta', classes: 'bg-red-100 text-red-700' },

  // Project statuses
  planning: { label: 'Pianificazione', classes: 'bg-blue-100 text-blue-700' },
  in_execution: { label: 'In esecuzione', classes: 'bg-indigo-100 text-indigo-700' },
  on_hold: { label: 'In pausa', classes: 'bg-gray-100 text-gray-500' },
  completed: { label: 'Completato', classes: 'bg-green-100 text-green-700' },
  archived: { label: 'Archiviato', classes: 'bg-gray-100 text-gray-400' },

  // Invoice extra statuses
  partially_paid: { label: 'Parzialmente pagata', classes: 'bg-yellow-100 text-yellow-700' },
  issued: { label: 'Emessa', classes: 'bg-blue-100 text-blue-700' },

  // Invoice types
  proforma: { label: 'Proforma', classes: 'bg-purple-100 text-purple-700' },
  invoice: { label: 'Fattura', classes: 'bg-blue-100 text-blue-700' },
  credit_note: { label: 'Nota di credito', classes: 'bg-orange-100 text-orange-700' },

  // Contract extra statuses
  ready_to_sign: { label: 'Pronto per firma', classes: 'bg-cyan-100 text-cyan-700' },
  signing: { label: 'In firma', classes: 'bg-indigo-100 text-indigo-700' },
  void: { label: 'Annullato', classes: 'bg-gray-100 text-gray-400' },

  // Project extra statuses
  pending_payment: { label: 'In attesa pagamento', classes: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Pronto', classes: 'bg-cyan-100 text-cyan-700' },
  blocked: { label: 'Bloccato', classes: 'bg-red-100 text-red-700' },
  delivered: { label: 'Consegnato', classes: 'bg-emerald-100 text-emerald-700' },

  // File statuses
  review: { label: 'In revisione', classes: 'bg-yellow-100 text-yellow-700' },
  obsolete: { label: 'Obsoleto', classes: 'bg-gray-100 text-gray-400' },

  // Approval statuses
  pending: { label: 'In attesa', classes: 'bg-amber-100 text-amber-700' },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
}
