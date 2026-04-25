import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Film } from 'lucide-react';
import { validateVideoUrlForProduct, VIDEO_MAX_PER_SECTION } from '../../utils/productValidation';

export default function VideoUrlsEditor({ urls, onChange, disabled }) {
  const list = Array.isArray(urls) ? urls : [];
  const [draft, setDraft] = useState('');

  const add = () => {
    if (disabled) return;
    const u = draft.trim();
    const err = validateVideoUrlForProduct(u);
    if (err) {
      toast.error(err);
      return;
    }
    if (list.length >= VIDEO_MAX_PER_SECTION) {
      toast.error(`Maximum ${VIDEO_MAX_PER_SECTION} video links per block.`);
      return;
    }
    if (list.some((x) => String(x).trim() === u)) {
      toast.error('This URL is already in the list.');
      return;
    }
    onChange([...list, u]);
    setDraft('');
  };

  const remove = (i) => {
    if (disabled) return;
    onChange(list.filter((_, idx) => idx !== i));
  };

  return (
    <div className="form-group">
      <label className="form-label">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Film size={14} aria-hidden />
          Video links
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af', float: 'right' }}>
          {list.length}/{VIDEO_MAX_PER_SECTION} · YouTube, Vimeo, or direct .mp4/.webm
        </span>
      </label>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
        Optional · Shown in the same carousel as screenshots on the product page
      </div>
      <div className="option-input-row" style={{ marginBottom: 8 }}>
        <input
          type="url"
          className="form-input"
          placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
          value={draft}
          disabled={disabled || list.length >= VIDEO_MAX_PER_SECTION}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button type="button" className="btn btn-secondary" onClick={add} disabled={disabled || list.length >= VIDEO_MAX_PER_SECTION}>
          <Plus size={14} /> Add
        </button>
      </div>
      {list.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((u, i) => (
            <li
              key={`${i}-${u}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
                wordBreak: 'break-all',
              }}
            >
              <span style={{ flex: 1, color: '#334155' }}>{u}</span>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => remove(i)}
                disabled={disabled}
                title="Remove"
                style={{ color: '#ef4444', flexShrink: 0 }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
