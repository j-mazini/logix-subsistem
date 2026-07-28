import { DocumentType } from '../types/compliance';

/**
 * Rótulos legíveis para os tipos de documento.
 *
 * O tipo cru era impresso directamente na UI com `text-transform: capitalize`
 * por cima, o que dava "Id", "Proof-Of-Address" e — depois de os tipos serem
 * corrigidos — daria "Dbs" e "Dvla". Siglas precisam de rótulo próprio.
 */
export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  dbs: 'DBS',
  dvla: 'DVLA',
  passport: 'Passport',
  id: 'Identity',
  license: 'Licence',
  'proof-of-address': 'Proof of address',
  contract: 'Contract',
  insurance: 'Insurance',
};

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABEL[type] ?? type;
}
