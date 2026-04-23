import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import './Auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/;
const PW_UPPER = /[A-Z]/;
const PW_LOWER = /[a-z]/;
const PW_DIGIT = /\d/;

export default function Signup() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'user' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { signup } = useAuth();
  const navigate = useNavigate();

  const update = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const em = form.email.trim();
    const pw = form.password;

    if (!fn) e.firstName = 'First name is required.';
    else if (fn.length < 2) e.firstName = 'First name must be at least 2 characters.';
    else if (fn.length > 50) e.firstName = 'First name must be under 50 characters.';
    else if (!NAME_RE.test(fn)) e.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes.';

    if (!ln) e.lastName = 'Last name is required.';
    else if (ln.length < 2) e.lastName = 'Last name must be at least 2 characters.';
    else if (ln.length > 50) e.lastName = 'Last name must be under 50 characters.';
    else if (!NAME_RE.test(ln)) e.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes.';

    if (!em) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(em)) e.email = 'Please enter a valid email address.';

    if (!pw) e.password = 'Password is required.';
    else if (pw.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (!PW_UPPER.test(pw)) e.password = 'Password must include an uppercase letter.';
    else if (!PW_LOWER.test(pw)) e.password = 'Password must include a lowercase letter.';
    else if (!PW_DIGIT.test(pw)) e.password = 'Password must include a number.';

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return toast.error(Object.values(v)[0]);
    setLoading(true);
    try {
      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      };
      const user = await signup(payload);
      toast.success(`Welcome, ${user.firstName}!`);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effect" />
      <div className="auth-card slide-up">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="brand-icon">A</div>
            <span className="brand-name">AppDirect</span>
          </div>
          <h1>Create account</h1>
          <p>Join AppDirect marketplace today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name <span className="required">*</span></label>
              <input type="text" className={`form-input ${errors.firstName ? 'form-input-error' : ''}`} placeholder="John" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} maxLength={50} autoComplete="given-name" />
              {errors.firstName && <span className="form-error">{errors.firstName}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="required">*</span></label>
              <input type="text" className={`form-input ${errors.lastName ? 'form-input-error' : ''}`} placeholder="Doe" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} maxLength={50} autoComplete="family-name" />
              {errors.lastName && <span className="form-error">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input type="email" className={`form-input ${errors.email ? 'form-input-error' : ''}`} placeholder="you@company.com" value={form.email} onChange={(e) => update('email', e.target.value)} maxLength={254} autoComplete="email" />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password <span className="required">*</span></label>
            <div className="input-with-icon">
              <input type={showPw ? 'text' : 'password'} className={`form-input ${errors.password ? 'form-input-error' : ''}`} placeholder="Min 8 chars, upper, lower, digit" value={form.password} onChange={(e) => update('password', e.target.value)} maxLength={128} autoComplete="new-password" />
              <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <Button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            loading={loading}
            loadingText="Creating account..."
          >
            Create Account
          </Button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
