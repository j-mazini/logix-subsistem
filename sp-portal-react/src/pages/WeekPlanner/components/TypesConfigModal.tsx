import React, { useRef, useState } from 'react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

type FieldType = 'text' | 'number' | 'checkbox' | 'textarea';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  /** Custom table-cell display; defaults to the raw value (or an em-dash when empty). */
  format?: (value: string | number | boolean) => React.ReactNode;
}

interface TypeItem {
  id: number;
  [key: string]: string | number | boolean;
}

interface TypeTabConfig {
  key: string;
  label: string;
  icon: string;
  itemLabel: string; // singular noun used in "Create <itemLabel>" / delete confirm
  fields: FieldConfig[];
  initialItems: TypeItem[];
  /** When provided, items live in the parent (e.g. shared with the Add Ad-Hoc Service modal) instead of local-only state. */
  controlled?: { items: TypeItem[]; onChange: (items: TypeItem[]) => void };
}

function emptyFormFor(fields: FieldConfig[]): Record<string, string | boolean> {
  return Object.fromEntries(fields.map((f) => [f.key, f.type === 'checkbox' ? false : '']));
}

/** Generic CRUD table (list + inline create/edit form) for a single "type" entity, entirely in-memory (or parent-controlled). */
function TypeTab({ label, icon, itemLabel, fields, initialItems, controlled }: TypeTabConfig) {
  const [localItems, setLocalItems] = useState<TypeItem[]>(initialItems);
  const items = controlled ? controlled.items : localItems;
  const updateItems = (updater: (prev: TypeItem[]) => TypeItem[]) => {
    if (controlled) controlled.onChange(updater(controlled.items));
    else setLocalItems(updater);
  };
  const nextIdRef = useRef(Math.max(0, ...initialItems.map((i) => i.id)) + 1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>(() => emptyFormFor(fields));

  function openCreate() {
    setEditingId(null);
    setFormData(emptyFormFor(fields));
    setShowForm(true);
  }

  function openEdit(item: TypeItem) {
    setEditingId(item.id);
    const fd: Record<string, string | boolean> = {};
    fields.forEach((f) => {
      const v = item[f.key];
      fd[f.key] = f.type === 'checkbox' ? Boolean(v) : v == null ? '' : String(v);
    });
    setFormData(fd);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: number) {
    if (!window.confirm(`Delete this ${itemLabel.toLowerCase()}?`)) return;
    updateItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const record: TypeItem = { id: editingId ?? nextIdRef.current };
    fields.forEach((f) => {
      const raw = formData[f.key];
      record[f.key] = f.type === 'number' ? (raw === '' ? 0 : Number(raw)) : f.type === 'checkbox' ? Boolean(raw) : String(raw ?? '');
    });
    if (editingId != null) {
      updateItems((prev) => prev.map((i) => (i.id === editingId ? record : i)));
    } else {
      nextIdRef.current += 1;
      updateItems((prev) => [...prev, record]);
    }
    closeForm();
  }

  return (
    <div className="wp-types-tab">
      <div className="wp-types-tab-header">
        <h3>
          <i className={`bi ${icon}`} /> {label}
        </h3>
        <button type="button" className="styled-button styled-button--primary" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> Create {itemLabel}
        </button>
      </div>

      {showForm && (
        <form className="wp-types-form" onSubmit={handleSubmit}>
          <div className="dom-form-grid">
            {fields.map((f) => (
              <div className={`dom-form-field${f.type === 'textarea' ? ' span-2' : ''}`} key={f.key}>
                {f.type === 'checkbox' ? (
                  <label className="wp-types-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(formData[f.key])}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                    />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <label className="dom-form-label" htmlFor={`typeField-${f.key}`}>
                      {f.label}
                      {f.required ? ' *' : ''}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        id={`typeField-${f.key}`}
                        rows={3}
                        placeholder={f.placeholder}
                        value={String(formData[f.key] ?? '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        id={`typeField-${f.key}`}
                        type={f.type === 'number' ? 'number' : 'text'}
                        step={f.type === 'number' ? '0.01' : undefined}
                        required={f.required}
                        placeholder={f.placeholder}
                        value={String(formData[f.key] ?? '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="dom-form-actions">
            <button type="button" className="styled-button styled-button--outline" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="styled-button styled-button--primary">
              {editingId != null ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="wp-types-table-wrap">
        <table className="wp-types-table">
          <thead>
            <tr>
              <th>ID</th>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th className="wp-types-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={fields.length + 2} className="wp-types-empty">
                  No {label.toLowerCase()} found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  {fields.map((f) => {
                    const value = item[f.key];
                    const display = f.format ? f.format(value) : value === '' || value == null ? <span className="wp-types-dash">—</span> : String(value);
                    return <td key={f.key}>{display}</td>;
                  })}
                  <td className="wp-types-actions-col">
                    <button type="button" className="wp-types-icon-btn" title="Edit" onClick={() => openEdit(item)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button type="button" className="wp-types-icon-btn wp-types-icon-btn--danger" title="Delete" onClick={() => handleDelete(item.id)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const yesNoFormat = (v: string | number | boolean) => (
  <span className={`wp-types-badge${v ? ' wp-types-badge--yes' : ''}`}>{v ? 'Yes' : 'No'}</span>
);
const currencyFormat = (v: string | number | boolean) =>
  v === '' || v == null ? <span className="wp-types-dash">—</span> : `£${Number(v).toFixed(2)}`;

const ADHOC_SERVICE_FIELDS: FieldConfig[] = [
  { key: 'adhocName', label: 'Name', type: 'text', required: true },
  { key: 'adhocReceivedPayment', label: 'Received Payment', type: 'number', format: currencyFormat },
  { key: 'adhocVendorPayment', label: 'Vendor Payment', type: 'number', format: currencyFormat },
];

const STATIC_TAB_CONFIGS: TypeTabConfig[] = [
  {
    key: 'driver-types',
    label: 'Driver Types',
    icon: 'bi-person-badge',
    itemLabel: 'Driver Type',
    fields: [{ key: 'typeName', label: 'Type Name', type: 'text', required: true }],
    initialItems: [
      { id: 1, typeName: 'Standard Driver' },
      { id: 2, typeName: 'Owner Driver' },
      { id: 3, typeName: 'Agency Driver' },
    ],
  },
  {
    key: 'vendor-types',
    label: 'Vendor Types',
    icon: 'bi-truck',
    itemLabel: 'Vendor Type',
    fields: [{ key: 'typeName', label: 'Type Name', type: 'text', required: true }],
    initialItems: [
      { id: 1, typeName: 'Core Vendor' },
      { id: 2, typeName: 'Flex Vendor' },
      { id: 7, typeName: 'Spare Vendor' },
    ],
  },
  {
    key: 'user-types',
    label: 'User Types',
    icon: 'bi-person',
    itemLabel: 'User Type',
    fields: [{ key: 'typeName', label: 'Type Name', type: 'text', required: true }],
    initialItems: [
      { id: 1, typeName: 'Administrator' },
      { id: 2, typeName: 'Supervisor' },
      { id: 3, typeName: 'Standard User' },
    ],
  },
  {
    key: 'vehicle-types',
    label: 'Vehicle Types',
    icon: 'bi-car-front',
    itemLabel: 'Vehicle Type',
    fields: [{ key: 'typeName', label: 'Type Name', type: 'text', required: true }],
    initialItems: [
      { id: 1, typeName: '3.5T Luton' },
      { id: 2, typeName: '7.5T Box Truck' },
      { id: 3, typeName: 'Transit Van' },
      { id: 4, typeName: 'Sprinter Van' },
      { id: 5, typeName: '18T Rigid' },
      { id: 6, typeName: 'Flatbed Truck' },
    ],
  },
  {
    key: 'cost-models',
    label: 'Cost Models',
    icon: 'bi-cash-stack',
    itemLabel: 'Cost Model',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'isAdhocCategory', label: 'Is Adhoc Category', type: 'checkbox', format: yesNoFormat },
      { key: 'customerId', label: 'Customer ID', type: 'number' },
    ],
    initialItems: [
      { id: 1, name: 'Standard Route', description: 'Default per-route day rate', isAdhocCategory: false, customerId: '' },
      { id: 2, name: 'Ad-Hoc Casual', description: 'Pay-per-job ad-hoc work', isAdhocCategory: true, customerId: '' },
      { id: 3, name: 'Contracted', description: 'Fixed weekly contract rate', isAdhocCategory: false, customerId: 101 },
    ],
  },
];

export interface TypesConfigAdhocService extends TypeItem {
  adhocName: string;
  adhocReceivedPayment: number;
  adhocVendorPayment: number;
}

export interface TypesConfigManagementFunction extends TypeItem {
  title: string;
}

const MANAGEMENT_FUNCTION_FIELDS: FieldConfig[] = [{ key: 'title', label: 'Function Title', type: 'text', required: true }];

interface TypesConfigModalProps {
  onClose: () => void;
  /** Adhoc Services tab is controlled by the parent — this catalog is also read by the Add Ad-Hoc Service modal. */
  adhocServices: TypesConfigAdhocService[];
  onAdhocServicesChange: (items: TypesConfigAdhocService[]) => void;
  /** Management Functions tab is controlled by the parent — this catalog is also read by the Add Management & Support modal. */
  managementFunctions: TypesConfigManagementFunction[];
  onManagementFunctionsChange: (items: TypesConfigManagementFunction[]) => void;
}

/** Types Configuration — ported from Next.js week-planner's components/TypesConfig/ (mock/in-memory, no backend). */
export default function TypesConfigModal({
  onClose,
  adhocServices,
  onAdhocServicesChange,
  managementFunctions,
  onManagementFunctionsChange,
}: TypesConfigModalProps) {
  const tabConfigs: TypeTabConfig[] = [
    ...STATIC_TAB_CONFIGS,
    {
      key: 'adhoc-services',
      label: 'Adhoc Services',
      icon: 'bi-puzzle',
      itemLabel: 'Adhoc Service',
      fields: ADHOC_SERVICE_FIELDS,
      initialItems: adhocServices,
      controlled: { items: adhocServices, onChange: (items) => onAdhocServicesChange(items as TypesConfigAdhocService[]) },
    },
    {
      key: 'management-functions',
      label: 'Management Functions',
      icon: 'bi-person-badge',
      itemLabel: 'Function',
      fields: MANAGEMENT_FUNCTION_FIELDS,
      initialItems: managementFunctions,
      controlled: { items: managementFunctions, onChange: (items) => onManagementFunctionsChange(items as TypesConfigManagementFunction[]) },
    },
  ];
  const [activeTab, setActiveTab] = useState(tabConfigs[0].key);
  useModalBehavior(onClose);

  return (
    <div className="wp-modal wp-modal--wide sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="typesConfigTitle">
      <div className="wp-modal-header">
        <h2 className="wp-modal-title" id="typesConfigTitle">
          <i className="bi bi-sliders me-2" />
          Types Configuration
        </h2>
        <button type="button" className="dom-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="wp-modal-body">
        <div className="wp-types-tabs" role="tablist">
          {tabConfigs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`wp-types-tab-btn${activeTab === tab.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tab.icon}`} /> {tab.label}
            </button>
          ))}
        </div>

        {tabConfigs.map((tab) => (
          <div key={tab.key} hidden={tab.key !== activeTab}>
            <TypeTab {...tab} />
          </div>
        ))}
      </div>
    </div>
  );
}
