import { useState, useCallback, useRef, useMemo, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit3, Trash2, GripVertical, X, Eye } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../../pages/public/Public.css';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'tel', label: 'Phone (Tel)' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown (Select)' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'date', label: 'Date Picker' },
  { value: 'file', label: 'File Upload' },
];

const buildEmptyField = (order) => ({
  fieldName: '',
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  helpText: '',
  defaultValue: '',
  options: [],
  validations: {
    minLength: '',
    maxLength: '',
    regex: '',
    min: '',
    max: '',
    step: '',
    minDate: '',
    maxDate: '',
    customError: '',
  },
  isDefault: false,
  order,
});

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\d+/, '')
    .replace(/^_+/, '')
    .replace(/_+/g, '_')
    .toLowerCase();

/* ─── Stable UID helper ─────────────────────────────────────────────────────── */

let _globalUidCounter = 0;
export const generateFieldUid = () => `cf_${++_globalUidCounter}_${Date.now().toString(36)}`;

export const ensureFieldUids = (fields) => {
  if (!Array.isArray(fields)) return [];
  let changed = false;
  const result = fields.map((f) => {
    if (f._uid) return f;
    changed = true;
    return { ...f, _uid: generateFieldUid() };
  });
  return changed ? result : fields;
};

/* ─── Body scroll lock ──────────────────────────────────────────────────────── */

function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isLocked]);
}

/* ─── Portal Modal wrapper ──────────────────────────────────────────────────── */

function PortalModal({ open, onClose, children, maxWidth = 600 }) {
  useBodyScrollLock(open);
  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ isolation: 'isolate' }}>
      <div
        className="modal"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ─── Memoised sortable field row ───────────────────────────────────────────── */

const SortableField = memo(function SortableField({ field, index, onEdit, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field._uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const handleEdit = useCallback(() => onEdit(field, index), [onEdit, field, index]);
  const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);

  return (
    <div ref={setNodeRef} style={style} className="config-field-item">
      <div {...attributes} {...listeners} className="drag-handle">
        <GripVertical size={16} className="text-muted" />
      </div>
      <div className="config-field-info">
        <div className="config-field-name">
          {field.label}
          {field.required && <span className="required" style={{ marginLeft: 4 }}>*</span>}
          {field.isDefault && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Default</span>}
        </div>
        <div className="config-field-type">
          Type: {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type} | Key: {field.fieldName}
        </div>
      </div>
      <div className="config-field-actions">
        <button type="button" className="btn btn-icon btn-ghost" onClick={handleEdit}>
          <Edit3 size={14} />
        </button>
        <button type="button" className="btn btn-icon btn-ghost" onClick={handleRemove}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
});

/* ─── Field List (memoised to never re-render when modals open) ─────────────── */

const FieldList = memo(function FieldList({ fields, sortableIds, sensors, onDragEnd, onEdit, onRemove }) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="config-field-list" style={{ contain: 'layout style' }}>
          {fields.map((field, idx) => (
            <SortableField
              key={field._uid}
              field={field}
              index={idx}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});

/* ─── Preview Content (isolated from field list) ────────────────────────────── */

function PreviewContent({ fields }) {
  if (fields.length === 0) {
    return <p style={{ textAlign: 'center', color: '#94a3b8' }}>No fields to preview.</p>;
  }
  return (
    <div className="contact-preview-grid">
      {fields.map((field) => (
        <div
          key={field._uid || field.fieldName}
          style={{
            gridColumn: ['textarea', 'checkbox', 'radio'].includes(field.type) ? '1 / -1' : 'auto',
            textAlign: 'left',
          }}
        >
          <label className="form-label">
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          {field.type === 'textarea' && <textarea className="form-input" rows={4} placeholder={field.placeholder} disabled />}
          {['text', 'email', 'number', 'date', 'tel', 'url'].includes(field.type) && (
            <input type={['tel', 'url'].includes(field.type) ? 'text' : field.type} className="form-input" placeholder={field.placeholder} disabled />
          )}
          {field.type === 'select' && (
            <select className="form-select" disabled>
              <option value="">{field.placeholder || 'Select option'}</option>
              {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {field.type === 'radio' && (
            <div className="pub-choice-list grid-cols">
              {(field.options || []).map((o) => (
                <label key={o.value} className="pub-choice-item" style={{ cursor: 'default' }}>
                  <input type="radio" disabled />
                  <span className="pub-radio-box" />
                  <span className="pub-choice-label">{o.label}</span>
                </label>
              ))}
            </div>
          )}
          {field.type === 'checkbox' && (
            <div className="pub-choice-list grid-cols">
              {(field.options || []).map((o) => (
                <label key={o.value} className="pub-choice-item" style={{ cursor: 'default' }}>
                  <input type="checkbox" disabled />
                  <span className="pub-check-box" />
                  <span className="pub-choice-label">{o.label}</span>
                </label>
              ))}
            </div>
          )}
          {field.type === 'file' && (
            <div style={{ padding: 20, border: '2px dashed #e2e8f0', borderRadius: 8, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              File Upload Field
            </div>
          )}
          {field.helpText && <small className="text-muted" style={{ display: 'block', marginTop: 4 }}>{field.helpText}</small>}
        </div>
      ))}
    </div>
  );
}

/* ─── Edit / Add field modal content ────────────────────────────────────────── */

function FieldFormModal({ isEdit, fieldForm, setFieldForm, modalErrors, optionInput, setOptionInput, onSave, onClose, syncFieldName, addOption, removeOption }) {
  return (
    <>
      <div className="modal-header">
        <h3 className="modal-title">{isEdit ? 'Edit Field' : 'Add Field'}</h3>
        <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="modal-body">
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Label <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={fieldForm.label}
              onChange={(e) => {
                const val = e.target.value;
                setFieldForm((p) => ({ ...p, label: val }));
                syncFieldName(val);
              }}
            />
            {modalErrors.label && <small className="text-danger">{modalErrors.label}</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={fieldForm.type}
              onChange={(e) => {
                const nextType = e.target.value;
                setFieldForm((p) => ({
                  ...p,
                  type: nextType,
                  options: ['select', 'radio', 'checkbox'].includes(nextType) ? p.options : [],
                  defaultValue:
                    nextType === 'checkbox'
                      ? Array.isArray(p.defaultValue) ? p.defaultValue : []
                      : typeof p.defaultValue === 'string' ? p.defaultValue : '',
                }));
              }}
            >
              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Field Name (unique key)</label>
            <input
              type="text"
              className="form-input"
              placeholder="auto generated from label"
              value={fieldForm.fieldName}
              onChange={(e) => setFieldForm((p) => ({ ...p, fieldName: e.target.value }))}
            />
            {modalErrors.fieldName && <small className="text-danger">{modalErrors.fieldName}</small>}
          </div>
          {!['radio', 'checkbox'].includes(fieldForm.type) && (
            <div className="form-group">
              <label className="form-label">Default Value</label>
              {fieldForm.type === 'select' ? (
                <select className="form-select" value={fieldForm.defaultValue || ''} onChange={(e) => setFieldForm((p) => ({ ...p, defaultValue: e.target.value }))}>
                  <option value="">None</option>
                  {(fieldForm.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : fieldForm.type === 'date' ? (
                <input type="date" className="form-input" value={fieldForm.defaultValue || ''} onChange={(e) => setFieldForm((p) => ({ ...p, defaultValue: e.target.value }))} />
              ) : fieldForm.type === 'file' ? (
                <input type="text" className="form-input" value="" disabled placeholder="Not supported for file" />
              ) : (
                <input type="text" className="form-input" value={fieldForm.defaultValue || ''} onChange={(e) => setFieldForm((p) => ({ ...p, defaultValue: e.target.value }))} />
              )}
            </div>
          )}
        </div>
        {!['radio', 'checkbox'].includes(fieldForm.type) && (
          <div className="form-group">
            <label className="form-label">Placeholder</label>
            <input type="text" className="form-input" value={fieldForm.placeholder || ''} onChange={(e) => setFieldForm((p) => ({ ...p, placeholder: e.target.value }))} />
          </div>
        )}
        {!['radio', 'checkbox'].includes(fieldForm.type) && (
          <div className="form-group">
            <label className="form-label">Help text / Description</label>
            <input type="text" className="form-input" value={fieldForm.helpText || ''} onChange={(e) => setFieldForm((p) => ({ ...p, helpText: e.target.value }))} />
          </div>
        )}
        <div className="toggle-wrapper">
          <span className="toggle-label">Required field</span>
          <label className="toggle">
            <input type="checkbox" checked={fieldForm.required} onChange={(e) => setFieldForm((p) => ({ ...p, required: e.target.checked }))} />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Options for select/radio/checkbox */}
        {['select', 'radio', 'checkbox'].includes(fieldForm.type) && (
          <div className="form-group mt-md">
            <label className="form-label">Options</label>
            <div className="option-input-row">
              <input type="text" className="form-input" placeholder="Option label" value={optionInput.label} onChange={(e) => setOptionInput((p) => ({ ...p, label: e.target.value }))} />
              <input type="text" className="form-input" placeholder="Option value (optional)" value={optionInput.value}
                onChange={(e) => setOptionInput((p) => ({ ...p, value: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
              />
              <button type="button" className="btn btn-secondary" onClick={addOption}>Add</button>
            </div>
            {modalErrors.options && <small className="text-danger">{modalErrors.options}</small>}
            <div className="flex gap-sm flex-wrap mt-sm">
              {(fieldForm.options || []).map((opt) => (
                <span key={opt.value} className="tag">
                  {opt.label} ({opt.value})
                  <span className="tag-remove" onClick={() => removeOption(opt.value)}>&times;</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Text / textarea validations */}
        {(fieldForm.type === 'text' || fieldForm.type === 'textarea' || fieldForm.type === 'tel') && (
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Min length</label>
              <input type="number" className="form-input" value={fieldForm.validations.minLength} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, minLength: e.target.value } }))} />
              {modalErrors.minLength && <small className="text-danger">{modalErrors.minLength}</small>}
            </div>
            <div className="form-group">
              <label className="form-label">Max length</label>
              <input type="number" className="form-input" value={fieldForm.validations.maxLength} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, maxLength: e.target.value } }))} />
            </div>
          </div>
        )}

        {(fieldForm.type === 'text' || fieldForm.type === 'textarea' || fieldForm.type === 'tel') && (
          <div className="form-group">
            <label className="form-label">Regex validation (optional)</label>
            <input type="text" className="form-input" value={fieldForm.validations.regex} placeholder="e.g. ^[A-Za-z ]+$"
              onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, regex: e.target.value } }))}
            />
            {modalErrors.regex && <small className="text-danger">{modalErrors.regex}</small>}
          </div>
        )}

        {/* Number validations */}
        {fieldForm.type === 'number' && (
          <div className="contact-num-grid">
            <div className="form-group">
              <label className="form-label">Min value</label>
              <input type="number" className="form-input" value={fieldForm.validations.min} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, min: e.target.value } }))} />
              {modalErrors.min && <small className="text-danger">{modalErrors.min}</small>}
            </div>
            <div className="form-group">
              <label className="form-label">Max value</label>
              <input type="number" className="form-input" value={fieldForm.validations.max} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, max: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Step</label>
              <input type="number" className="form-input" value={fieldForm.validations.step} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, step: e.target.value } }))} />
            </div>
          </div>
        )}

        {/* Date validations */}
        {fieldForm.type === 'date' && (
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Min date</label>
              <input type="date" className="form-input" value={fieldForm.validations.minDate} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, minDate: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Max date</label>
              <input type="date" className="form-input" value={fieldForm.validations.maxDate} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, maxDate: e.target.value } }))} />
            </div>
          </div>
        )}

        <div className="form-group mt-md">
          <label className="form-label">Custom Error Message (optional)</label>
          <input type="text" className="form-input" placeholder="Leave empty for default message" value={fieldForm.validations.customError || ''}
            onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, customError: e.target.value } }))}
          />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave}>Save Field</button>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Main ContactFieldEditor
 * ─────────────────────────────────────────────────────────────────────────────
 * All modals render via React Portal (document.body) so they NEVER cause
 * re-renders or layout shifts in the field list DOM hierarchy.
 * SortableField and FieldList are React.memo'd so the list is only re-rendered
 * when the fields array itself actually changes.
 * ═══════════════════════════════════════════════════════════════════════════════ */

export default function ContactFieldEditor({ fields, setFields }) {
  // ── Modal state (isolated – changes here don't touch the field list) ──
  const [activeModal, setActiveModal] = useState(null); // null | 'add' | 'edit' | 'preview'
  const [editIndex, setEditIndex] = useState(null);
  const [optionInput, setOptionInput] = useState({ label: '', value: '' });
  const [modalErrors, setModalErrors] = useState({});
  const [fieldForm, setFieldForm] = useState(buildEmptyField(0));

  // Fresh fields ref (avoids stale closures)
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Assign stable UIDs on mount / when fields change ──
  const stableFields = useMemo(() => {
    const result = ensureFieldUids(fields);
    if (result !== fields) {
      queueMicrotask(() => setFields(result));
    }
    return result;
  }, [fields, setFields]);

  const sortableIds = useMemo(() => stableFields.map((f) => f._uid), [stableFields]);

  // ── Callbacks (stable references – never change) ──

  const openAddField = useCallback(() => {
    setFieldForm({ ...buildEmptyField(fieldsRef.current.length), _uid: generateFieldUid() });
    setOptionInput({ label: '', value: '' });
    setModalErrors({});
    setEditIndex(null);
    setActiveModal('add');
  }, []);

  const openEditField = useCallback((field, idx) => {
    setFieldForm({
      ...buildEmptyField(idx),
      ...field,
      options: Array.isArray(field.options) ? field.options : [],
      validations: { ...buildEmptyField(idx).validations, ...(field.validations || {}) },
      defaultValue: field.defaultValue ?? (field.type === 'checkbox' ? [] : ''),
    });
    setOptionInput({ label: '', value: '' });
    setModalErrors({});
    setEditIndex(idx);
    setActiveModal('edit');
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setEditIndex(null);
  }, []);

  const removeField = useCallback((idx) => {
    const current = fieldsRef.current;
    if (current[idx]?.isDefault && !window.confirm('This is a default field. Remove it?')) return;
    setFields(current.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i })));
  }, [setFields]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((items) => {
      const oldIndex = items.findIndex((i) => i._uid === active.id);
      const newIndex = items.findIndex((i) => i._uid === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex).map((f, i) => ({ ...f, order: i }));
    });
  }, [setFields]);

  // ── Option helpers ──

  const addOption = useCallback(() => {
    setOptionInput((prev) => {
      const label = prev.label.trim();
      const value = (prev.value || prev.label).trim();
      if (!label || !value) return prev;
      setFieldForm((p) => {
        if ((p.options || []).some((o) => o.value === value)) return p;
        return { ...p, options: [...(p.options || []), { label, value }] };
      });
      return { label: '', value: '' };
    });
  }, []);

  const removeOption = useCallback((optionValue) => {
    setFieldForm((prev) => {
      const options = (prev.options || []).filter((o) => o.value !== optionValue);
      let defaultValue = prev.defaultValue;
      if (prev.type === 'checkbox' && Array.isArray(defaultValue)) {
        defaultValue = defaultValue.filter((v) => v !== optionValue);
      }
      if ((prev.type === 'select' || prev.type === 'radio') && defaultValue === optionValue) {
        defaultValue = '';
      }
      return { ...prev, options, defaultValue };
    });
  }, []);

  const syncFieldName = useCallback((label) => {
    setEditIndex((idx) => {
      if (idx !== null) return idx; // editing — don't sync
      setFieldForm((p) => ({ ...p, fieldName: normalizeKey(label) }));
      return idx;
    });
  }, []);

  // ── Validation & save ──

  const handleSaveField = useCallback(() => {
    const form = fieldForm;
    const errs = {};
    const label = form.label.trim();
    const fieldName = normalizeKey(form.fieldName || label);
    const options = form.options || [];
    const validations = form.validations || {};

    if (!label) errs.label = 'Label is required';
    if (!fieldName) errs.fieldName = 'Field name is required';

    const currentFields = fieldsRef.current;
    const duplicate = currentFields.some((f, idx) => idx !== editIndex && normalizeKey(f.fieldName) === fieldName);
    if (duplicate) errs.fieldName = 'Field name must be unique';

    if (['select', 'radio', 'checkbox'].includes(form.type) && options.length === 0) {
      errs.options = 'Add at least one option';
    }

    const minLength = validations.minLength === '' ? undefined : Number(validations.minLength);
    const maxLength = validations.maxLength === '' ? undefined : Number(validations.maxLength);
    if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) errs.minLength = 'Min length cannot be greater than max length';

    const min = validations.min === '' ? undefined : Number(validations.min);
    const max = validations.max === '' ? undefined : Number(validations.max);
    if (min !== undefined && max !== undefined && min > max) errs.min = 'Min value cannot be greater than max value';

    if (validations.regex) {
      try { new RegExp(validations.regex); } catch { errs.regex = 'Invalid regex pattern'; }
    }

    if (Object.keys(errs).length > 0) {
      setModalErrors(errs);
      return;
    }

    const data = {
      ...form,
      fieldName,
      _uid: form._uid || generateFieldUid(),
      placeholder: form.placeholder?.trim() || '',
      helpText: form.helpText?.trim() || '',
      options: options.map((o) => ({ label: o.label.trim(), value: o.value.trim() })),
      validations: {
        minLength: validations.minLength === '' ? undefined : Number(validations.minLength),
        maxLength: validations.maxLength === '' ? undefined : Number(validations.maxLength),
        regex: validations.regex?.trim() || undefined,
        min: validations.min === '' ? undefined : Number(validations.min),
        max: validations.max === '' ? undefined : Number(validations.max),
        step: validations.step === '' ? undefined : Number(validations.step),
        minDate: validations.minDate || undefined,
        maxDate: validations.maxDate || undefined,
      },
      order: editIndex !== null ? currentFields[editIndex].order : currentFields.length,
    };

    const updated = [...currentFields];
    if (editIndex !== null) {
      updated[editIndex] = data;
    } else {
      updated.push(data);
    }
    setFields(updated.map((f, i) => ({ ...f, order: i })));
    setActiveModal(null);
    setEditIndex(null);
  }, [fieldForm, editIndex, setFields]);

  // ── Render ──

  const isFormModal = activeModal === 'add' || activeModal === 'edit';

  return (
    <div>
      {/* Toolbar — always stable */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => setActiveModal('preview')} type="button">
          <Eye size={16} /> Preview
        </button>
        <button className="btn btn-secondary" onClick={openAddField} type="button">
          <Plus size={16} /> Add Field
        </button>
      </div>

      {/* Field list — isolated, memo'd, never re-renders for modal state */}
      {stableFields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          <p>No fields configured yet.</p>
          <button className="btn btn-secondary" onClick={openAddField} type="button" style={{ marginTop: 12 }}>
            <Plus size={16} /> Add Your First Field
          </button>
        </div>
      ) : (
        <FieldList
          fields={stableFields}
          sortableIds={sortableIds}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onEdit={openEditField}
          onRemove={removeField}
        />
      )}

      {/* ── Add / Edit modal — rendered via PORTAL (outside this DOM) ── */}
      <PortalModal open={isFormModal} onClose={closeModal}>
        <FieldFormModal
          isEdit={activeModal === 'edit'}
          fieldForm={fieldForm}
          setFieldForm={setFieldForm}
          modalErrors={modalErrors}
          optionInput={optionInput}
          setOptionInput={setOptionInput}
          onSave={handleSaveField}
          onClose={closeModal}
          syncFieldName={syncFieldName}
          addOption={addOption}
          removeOption={removeOption}
        />
      </PortalModal>

      {/* ── Preview modal — rendered via PORTAL (outside this DOM) ── */}
      <PortalModal open={activeModal === 'preview'} onClose={closeModal} maxWidth={900}>
        <div className="modal-header">
          <h3 className="modal-title">Form Preview</h3>
          <button className="btn btn-icon btn-ghost" onClick={closeModal}><X size={18} /></button>
        </div>
        <div className="modal-body contact-preview-modal-body">
          <div className="contact-preview-card">
            <PreviewContent fields={stableFields} />
            <div style={{ marginTop: 32 }}>
              <button className="btn btn-primary" disabled>Submit Form</button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeModal}>Close Preview</button>
        </div>
      </PortalModal>

      <style>{`
        .drag-handle {
          cursor: grab;
          padding: 8px;
          margin-left: -8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .drag-handle:active { cursor: grabbing; }

        /* ── Form preview grid ── */
        .contact-preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .contact-num-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }
        .contact-preview-modal-body {
          background: #f8fafc;
          padding: 32px;
        }
        .contact-preview-card {
          background: white;
          padding: 28px;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          max-width: 800px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .contact-preview-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .contact-num-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .contact-preview-modal-body {
            padding: 16px;
          }
          .contact-preview-card {
            padding: 16px;
          }
        }

        @media (max-width: 480px) {
          .contact-preview-modal-body {
            padding: 10px;
          }
          .contact-preview-card {
            padding: 12px;
            border-radius: 8px;
          }
          .contact-preview-grid {
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
