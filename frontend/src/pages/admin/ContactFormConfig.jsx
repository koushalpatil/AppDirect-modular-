import { useState, useEffect, useCallback } from 'react';
import { configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ContactFieldEditor from '../../components/admin/ContactFieldEditor';

export default function ContactFormConfig() {
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
        <ContactFieldEditor fields={fields} setFields={setFields} />
      </div>
    </div>
  );
}
