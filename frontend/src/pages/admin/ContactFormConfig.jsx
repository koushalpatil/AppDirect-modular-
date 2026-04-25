import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ContactFieldEditor from '../../components/admin/ContactFieldEditor';

const FIELD_TYPE_LABELS = {
  text: 'Text',
  textarea: 'Textarea',
  email: 'Email',
  tel: 'Phone (Tel)',
  number: 'Number',
  select: 'Dropdown (Select)',
  radio: 'Radio Buttons',
  checkbox: 'Checkboxes',
  date: 'Date Picker',
};

const getFieldTypeLabel = (type) => FIELD_TYPE_LABELS[type] || type || '—';

export default function ContactFormConfig() {
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await configAPI.getContact();
      const contactFields = (res.data.config?.contactFields || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setFields(contactFields);
    } catch {
      toast.error('Failed to load contact form config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configAPI.updateContact({ contactFields: fields });
      toast.success('Contact form configuration saved.');
    } catch {
      toast.error('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Contact Us Form</h1>
          <p>Configure the default global contact form used for lead capture.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div className="card card-body">
        <h3 style={{ marginBottom: 12 }}>Configured Fields (Table View)</h3>
        {fields.length === 0 ? (
          <p className="text-muted" style={{ marginBottom: 0 }}>
            No fields configured yet.
          </p>
        ) : (
          <div className="table-wrapper" style={{ marginBottom: 20 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Field Label</th>
                  <th>Field Key</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Placeholder</th>
                  <th>Options</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field._uid || field.fieldName || `${field.label}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{field.label || '—'}</td>
                    <td>{field.fieldName || '—'}</td>
                    <td>{getFieldTypeLabel(field.type)}</td>
                    <td>{field.required ? 'Yes' : 'No'}</td>
                    <td>{field.placeholder || '—'}</td>
                    <td>
                      {Array.isArray(field.options) && field.options.length
                        ? field.options.join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={{ marginBottom: 12 }}>Edit Form Fields</h3>
        <ContactFieldEditor fields={fields} setFields={setFields} />
      </div>
    </div>
  );
}
