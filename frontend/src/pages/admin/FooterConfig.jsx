import { useState, useEffect, useCallback, useRef } from 'react';
import { configAPI } from '../../services/api';
import {
  Plus, Trash2, Save, GripVertical, FileText,
  Share2, PanelBottom, Link2, Globe, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Admin.css';
import './FooterConfig.css';

const PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook', Icon: (props) => <FacebookIcon {...props} /> },
  { value: 'x', label: 'X (Twitter)', Icon: (props) => <XIcon {...props} /> },
  { value: 'instagram', label: 'Instagram', Icon: (props) => <InstagramIcon {...props} /> },
  { value: 'linkedin', label: 'LinkedIn', Icon: (props) => <LinkedinIcon {...props} /> },
  { value: 'youtube', label: 'YouTube', Icon: (props) => <YoutubeIcon {...props} /> },
];

const FacebookIcon = ({ size = 20, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const XIcon = ({ size = 18, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...props}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);

const InstagramIcon = ({ size = 20, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
);

const LinkedinIcon = ({ size = 20, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
);

const YoutubeIcon = ({ size = 20, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.4 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.46-5.58z"/><polyline points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
);

const CopyrightIcon = ({ size = 16, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M14.83 14.83a4 4 0 1 1 0-5.66"/></svg>
);

const ColumnsIcon = ({ size = 16, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
);



const TABS = [
  { id: 'sections', label: 'Sections & Links', Icon: ColumnsIcon },
  { id: 'content', label: 'Content', Icon: FileText },
  { id: 'social', label: 'Social Media', Icon: Share2 },
  { id: 'bottom', label: 'Bottom Bar', Icon: PanelBottom },
];

const LIMITS = {
  sectionTitle: 100,
  linkTitle: 100,
  linkUrl: 500,
  contentTitle: 200,
  contentDescription: 1000,
  socialUrl: 500,
  copyright: 200,
  bottomLinkTitle: 100,
  bottomLinkUrl: 500,
};

const isValidUrl = (str) => {
  if (!str) return true; // Optional fields can be empty
  const s = str.trim();
  if (s.startsWith('/')) return true; // support relative paths
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// Character counter helper
function CharCount({ value, max, warn = 0.85 }) {
  const len = (value || '').length;
  const ratio = len / max;
  const color = ratio >= 1 ? '#ef4444' : ratio >= warn ? '#f59e0b' : '#9ca3af';
  if (max === Infinity) return null;
  return (
    <span style={{ fontSize: 10, color, float: 'right', marginTop: 2 }}>
      {len}/{max}
    </span>
  );
}

// Inline validation message
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#ef4444', fontSize: 11 }}>
      <span style={{ fontSize: 14 }}>&bull;</span> {msg}
    </div>
  );
}

const emptyLink = () => ({ title: '', url: '' });
const emptySection = () => ({ title: '', links: [emptyLink()] });
const emptySocial = () => ({ platform: 'facebook', url: '' });
const emptyBottomLink = () => ({ title: '', url: '' });

export default function FooterConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('sections');
  const [dirty, setDirty] = useState(false);

  const [sections, setSections] = useState([]);
  const [content, setContent] = useState({ title: '', description: '' });
  const [socialMedia, setSocialMedia] = useState([]);
  const [bottomLinks, setBottomLinks] = useState([]);
  const [copyright, setCopyright] = useState('');

  // Collapse state for section cards
  const [collapsed, setCollapsed] = useState({});

  const initialRef = useRef(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await configAPI.getFooter();
      const c = res.data.config;
      setSections(c.footerSections?.length ? c.footerSections : []);
      setContent(c.footerContent || { title: '', description: '' });
      setSocialMedia(c.socialMedia?.length ? c.socialMedia : []);
      setBottomLinks(c.bottomFooterLinks?.length ? c.bottomFooterLinks : []);
      setCopyright(c.bottomFooterCopyright || '');
      initialRef.current = JSON.stringify({
        footerSections: c.footerSections || [],
        footerContent: c.footerContent || { title: '', description: '' },
        socialMedia: c.socialMedia || [],
        bottomFooterLinks: c.bottomFooterLinks || [],
        bottomFooterCopyright: c.bottomFooterCopyright || '',
      });
      setDirty(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load footer config');
    } finally {
      setLoading(false);
    }
  };

  // Track dirty state
  useEffect(() => {
    if (!initialRef.current) return;
    const current = JSON.stringify({
      footerSections: sections,
      footerContent: content,
      socialMedia,
      bottomFooterLinks: bottomLinks,
      bottomFooterCopyright: copyright,
    });
    setDirty(current !== initialRef.current);
  }, [sections, content, socialMedia, bottomLinks, copyright]);

  const handleSave = async () => {
    const errors = [];
    
    // Validate Sections
    sections.forEach((s, si) => {
      if (!s.title?.trim()) errors.push(`Section #${si + 1} title is required`);
      else if (s.title.length > LIMITS.sectionTitle) errors.push(`Section #${si + 1} title too long`);
      
      s.links.forEach((l, li) => {
        if (!l.title?.trim()) errors.push(`Section #${si + 1}, Link #${li + 1} title is required`);
        else if (l.title.length > LIMITS.linkTitle) errors.push(`Section #${si + 1}, Link #${li + 1} title too long`);
        
        if (!l.url?.trim()) errors.push(`Section #${si + 1}, Link #${li + 1} URL is required`);
        else if (l.url.length > LIMITS.linkUrl) errors.push(`Section #${si + 1}, Link #${li + 1} URL too long`);
        else if (!isValidUrl(l.url)) errors.push(`Section #${si + 1}, Link #${li + 1} has an invalid URL`);
      });
    });

    // Validate Content
    if (content.title?.length > LIMITS.contentTitle) errors.push('Disclaimer title too long');
    if (content.description?.length > LIMITS.contentDescription) errors.push('Disclaimer description too long');

    // Validate Social
    socialMedia.forEach((sm, i) => {
      if (!sm.url?.trim()) errors.push(`Social #${i + 1} URL is required`);
      else if (sm.url.length > LIMITS.socialUrl) errors.push(`Social #${i + 1} URL too long`);
      else if (!isValidUrl(sm.url)) errors.push(`Social #${i + 1} has an invalid URL`);
    });

    // Validate Bottom
    if (copyright?.length > LIMITS.copyright) errors.push('Copyright text too long');
    bottomLinks.forEach((l, i) => {
      if (!l.title?.trim()) errors.push(`Bottom Link #${i + 1} title is required`);
      else if (l.title.length > LIMITS.bottomLinkTitle) errors.push(`Bottom Link #${i + 1} title too long`);
      
      if (!l.url?.trim()) errors.push(`Bottom Link #${i + 1} URL is required`);
      else if (l.url.length > LIMITS.bottomLinkUrl) errors.push(`Bottom Link #${i + 1} URL too long`);
      else if (!isValidUrl(l.url)) errors.push(`Bottom Link #${i + 1} has an invalid URL`);
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
    try {
      await configAPI.updateFooter({
        footerSections: sections,
        footerContent: content,
        socialMedia,
        bottomFooterLinks: bottomLinks,
        bottomFooterCopyright: copyright,
      });
      toast.success('Footer configuration saved!');
      initialRef.current = JSON.stringify({
        footerSections: sections,
        footerContent: content,
        socialMedia,
        bottomFooterLinks: bottomLinks,
        bottomFooterCopyright: copyright,
      });
      setDirty(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save';
      const backendErrors = err.response?.data?.errors;
      toast.error(backendErrors ? backendErrors.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Section helpers ────────────────────────
  const addSection = () => {
    if (sections.length >= 2) return toast.error('Maximum 2 sections allowed');
    setSections([...sections, emptySection()]);
  };
  const removeSection = (i) => setSections(sections.filter((_, idx) => idx !== i));
  const updateSection = (i, key, val) => {
    const updated = [...sections];
    updated[i] = { ...updated[i], [key]: val };
    setSections(updated);
  };
  const addLink = (si) => {
    if (sections[si].links.length >= 7) return toast.error('Maximum 7 links per section');
    const updated = [...sections];
    updated[si] = { ...updated[si], links: [...updated[si].links, emptyLink()] };
    setSections(updated);
  };
  const removeLink = (si, li) => {
    const updated = [...sections];
    updated[si] = { ...updated[si], links: updated[si].links.filter((_, idx) => idx !== li) };
    setSections(updated);
  };
  const updateLink = (si, li, key, val) => {
    const updated = [...sections];
    const links = [...updated[si].links];
    links[li] = { ...links[li], [key]: val };
    updated[si] = { ...updated[si], links };
    setSections(updated);
  };

  // ─── Social helpers ─────────────────────────
  const addSocial = () => setSocialMedia([...socialMedia, emptySocial()]);
  const removeSocial = (i) => setSocialMedia(socialMedia.filter((_, idx) => idx !== i));
  const updateSocial = (i, key, val) => {
    const updated = [...socialMedia];
    updated[i] = { ...updated[i], [key]: val };
    setSocialMedia(updated);
  };

  // ─── Bottom link helpers ────────────────────
  const addBottomLink = () => setBottomLinks([...bottomLinks, emptyBottomLink()]);
  const removeBottomLink = (i) => setBottomLinks(bottomLinks.filter((_, idx) => idx !== i));
  const updateBottomLink = (i, key, val) => {
    const updated = [...bottomLinks];
    updated[i] = { ...updated[i], [key]: val };
    setBottomLinks(updated);
  };

  const toggleCollapse = (i) => setCollapsed(prev => ({ ...prev, [i]: !prev[i] }));

  const getPlatformIcon = useCallback((platform) => {
    const found = PLATFORM_OPTIONS.find(p => p.value === platform);
    if (!found) return null;
    const { Icon } = found;
    return <Icon size={16} />;
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;



  return (
    <div className="admin-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Footer Configuration</h1>
          <p className="page-subtitle">
            Design and manage the site footer — sections, links, social media and copyright
          </p>
        </div>
        <div className="fc-save-bar">
          {dirty && <span className="fc-unsaved-text">Unsaved changes</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Changes'}
            {dirty && <span className="fc-unsaved-dot" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="fc-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`fc-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.Icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor panel */}
      <div className="fc-panel" key={activeTab}>
          {/* ─── Tab: Sections & Links ─────────────── */}
          {activeTab === 'sections' && (
            <>
              {sections.map((section, si) => (
                <div key={si} className="fc-section-card">
                  <div className="fc-section-header" onClick={() => toggleCollapse(si)}>
                    <div className="fc-section-header-left">
                      <span className="fc-section-number">{si + 1}</span>
                      <span className="fc-section-label">
                        {section.title || `Section ${si + 1}`}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {section.links?.length || 0} link{(section.links?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="fc-link-delete"
                        onClick={(e) => { e.stopPropagation(); removeSection(si); }}
                        title="Remove section"
                      >
                        <Trash2 size={14} />
                      </button>
                      {collapsed[si] ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronUp size={16} color="var(--text-muted)" />}
                    </div>
                  </div>
                  {!collapsed[si] && (
                    <div className="fc-section-body">
                      <div className="form-group">
                        <label className="form-label">
                          Section Title
                          <CharCount value={section.title} max={LIMITS.sectionTitle} />
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. Quick Links, Resources"
                          value={section.title}
                          maxLength={LIMITS.sectionTitle}
                          onChange={e => updateSection(si, 'title', e.target.value)}
                        />
                      </div>

                      <div className="fc-input-label">
                        <Link2 size={12} />
                        Links (max 7)
                      </div>
                      {section.links.map((link, li) => (
                        <div key={li} className="fc-link-row">
                          <GripVertical size={14} className="fc-link-grip" />
                          <input
                            className="form-input"
                            placeholder="Link title"
                            value={link.title}
                            maxLength={LIMITS.linkTitle}
                            onChange={e => updateLink(si, li, 'title', e.target.value)}
                          />
                          <input
                            className="form-input"
                            placeholder="https://example.com"
                            value={link.url}
                            maxLength={LIMITS.linkUrl}
                            onChange={e => updateLink(si, li, 'url', e.target.value)}
                          />
                          <button className="fc-link-delete" onClick={() => removeLink(si, li)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {section.links.length < 7 && (
                        <button className="fc-add-inline" onClick={() => addLink(si)}>
                          <Plus size={14} /> Add Link
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {sections.length === 0 && (
                <div className="fc-empty">
                  <div className="fc-empty-icon"><ColumnsIcon size={22} /></div>
                  <h4>No footer sections yet</h4>
                  <p>Add up to 2 sections with navigation links that appear in the footer</p>
                </div>
              )}

              <button
                className="fc-add-section-btn"
                onClick={addSection}
                disabled={sections.length >= 2}
              >
                <Plus size={16} />
                {sections.length >= 2 ? 'Maximum 2 sections reached' : 'Add Footer Section'}
              </button>
            </>
          )}

          {/* ─── Tab: Content / Disclaimer ─────────── */}
          {activeTab === 'content' && (
            <div className="fc-content-card">
              <div className="fc-content-card-header">
                <FileText size={16} color="var(--color-primary)" />
                <h3>Disclaimer / About Content</h3>
              </div>
              <div className="fc-content-card-body">
                <div className="form-group">
                  <label className="form-label">
                    Title
                    <CharCount value={content.title} max={LIMITS.contentTitle} />
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. Disclaimer, About Us"
                    value={content.title}
                    maxLength={LIMITS.contentTitle}
                    onChange={e => setContent({ ...content, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    placeholder="Enter description or disclaimer text that will appear in the footer…"
                    value={content.description}
                    onChange={e => setContent({ ...content, description: e.target.value })}
                    maxLength={LIMITS.contentDescription}
                  />
                  <div className="fc-char-counter">
                    {content.description?.length || 0}/{LIMITS.contentDescription}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: Social Media ─────────────────── */}
          {activeTab === 'social' && (
            <div className="fc-content-card">
              <div className="fc-content-card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Share2 size={16} color="var(--color-primary)" />
                  <h3>Follow Us — Social Media</h3>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={addSocial}>
                  <Plus size={14} /> Add Platform
                </button>
              </div>
              <div className="fc-content-card-body">
                {socialMedia.length === 0 && (
                  <div className="fc-empty">
                    <div className="fc-empty-icon"><Globe size={22} /></div>
                    <h4>No social media links</h4>
                    <p>Add your social media profiles to display in the footer</p>
                  </div>
                )}
                {socialMedia.map((sm, i) => (
                  <div key={i} className="fc-social-row">
                    <div className="fc-social-icon-preview">
                      {getPlatformIcon(sm.platform)}
                    </div>
                    <select
                      className="form-input fc-social-select"
                      value={sm.platform}
                      onChange={e => updateSocial(i, 'platform', e.target.value)}
                    >
                      {PLATFORM_OPTIONS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      placeholder="https://..."
                      value={sm.url}
                      maxLength={LIMITS.socialUrl}
                      onChange={e => updateSocial(i, 'url', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="fc-link-delete" onClick={() => removeSocial(i)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Tab: Bottom Bar ───────────────────── */}
          {activeTab === 'bottom' && (
            <>
              <div className="fc-content-card">
                <div className="fc-content-card-header">
                  <CopyrightIcon size={16} color="var(--color-primary)" />
                  <h3>Copyright Text</h3>
                </div>
                <div className="fc-content-card-body">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Text
                      <CharCount value={copyright} max={LIMITS.copyright} />
                    </label>
                    <input
                      className="form-input"
                      placeholder="Copyright © 2026 Company Name. All Rights Reserved."
                      value={copyright}
                      maxLength={LIMITS.copyright}
                      onChange={e => setCopyright(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="fc-bottom-card">
                <div className="fc-bottom-header">
                  <h3>
                    <Link2 size={14} />
                    Bottom Footer Links
                  </h3>
                  <button className="btn btn-sm btn-secondary" onClick={addBottomLink}>
                    <Plus size={14} /> Add Link
                  </button>
                </div>
                <div className="fc-bottom-body">
                  {bottomLinks.length === 0 && (
                    <div className="fc-empty">
                      <div className="fc-empty-icon"><Link2 size={22} /></div>
                      <h4>No bottom links</h4>
                      <p>Add links like Privacy Policy, Terms of Service, Contact Us</p>
                    </div>
                  )}
                  {bottomLinks.map((link, i) => (
                    <div key={i} className="fc-link-row">
                      <input
                        className="form-input"
                        placeholder="Link title (e.g. Privacy Policy)"
                        value={link.title}
                        maxLength={LIMITS.bottomLinkTitle}
                        onChange={e => updateBottomLink(i, 'title', e.target.value)}
                      />
                      <input
                        className="form-input"
                        placeholder="https://..."
                        value={link.url}
                        maxLength={LIMITS.bottomLinkUrl}
                        onChange={e => updateBottomLink(i, 'url', e.target.value)}
                      />
                      <button className="fc-link-delete" onClick={() => removeBottomLink(i)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
