import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Mail, Eye, EyeOff, Shield, User, Store, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, setCurrentUser } = useStore();

  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('cashier');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') toast.error('No account found with this email');
      else if (code === 'auth/wrong-password') toast.error('Incorrect password');
      else if (code === 'auth/invalid-email') toast.error('Invalid email address');
      else if (code === 'auth/too-many-requests') toast.error('Too many attempts. Try again later');
      else if (code === 'auth/invalid-credential') toast.error('Invalid credentials');
      else toast.error(err?.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name, role);
      toast.success('Account created successfully');
      navigate('/dashboard');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') toast.error('Email already registered');
      else if (code === 'auth/invalid-email') toast.error('Invalid email address');
      else if (code === 'auth/weak-password') toast.error('Password is too weak');
      else toast.error(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    setCurrentUser({ id: 'e1', email: 'admin@lankapos.lk', name: 'Admin User', role: 'admin' });
    toast.success('Logged in as Admin Demo');
    navigate('/dashboard');
  };

  const handleDemoCashier = () => {
    setCurrentUser({ id: 'e2', email: 'nimali@lankapos.lk', name: 'Cashier Nimali', role: 'cashier' });
    toast.success('Logged in as Cashier Demo');
    navigate('/dashboard');
  };

  return (
    <div style={styles.container}>
      {/* Animated background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />

      {/* Glass card */}
      <div style={styles.card}>
        {/* Branding */}
        <div style={styles.brandSection}>
          <div style={styles.brandIcon}>
            <Store size={32} color="#fff" />
          </div>
          <h1 style={styles.brandTitle}>LankaPOS</h1>
          <p style={styles.brandSubtitle}>Point of Sale System</p>
        </div>

        {/* Tab toggle */}
        <div style={styles.tabContainer}>
          <button
            style={tab === 'signin' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            onClick={() => setTab('signin')}
          >
            Sign In
          </button>
          <button
            style={tab === 'register' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            onClick={() => setTab('register')}
          >
            Register
          </button>
        </div>

        {/* Sign In Form */}
        {tab === 'signin' && (
          <div style={styles.form}>
            <div style={styles.inputGroup}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
            <div style={styles.inputGroup}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              onClick={handleSignIn}
              disabled={loading}
              style={loading ? { ...styles.submitButton, ...styles.submitButtonDisabled } : styles.submitButton}
            >
              {loading ? <Loader2 size={20} style={styles.spinner} /> : <><Lock size={18} /> Sign In</>}
            </button>
          </div>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <div style={styles.form}>
            <div style={styles.inputGroup}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
            <div style={styles.inputGroup}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
            <div style={styles.inputGroup}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={styles.inputGroup}>
              <Shield size={18} style={styles.inputIcon} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={styles.select}
                disabled={loading}
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <button
              onClick={handleRegister}
              disabled={loading}
              style={loading ? { ...styles.submitButton, ...styles.submitButtonDisabled } : styles.submitButton}
            >
              {loading ? <Loader2 size={20} style={styles.spinner} /> : <><User size={18} /> Create Account</>}
            </button>
          </div>
        )}

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>Demo Access</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Demo buttons */}
        <div style={styles.demoButtons}>
          <button onClick={handleDemoAdmin} style={styles.demoButton} disabled={loading}>
            <Shield size={16} />
            <span>Admin Demo</span>
          </button>
          <button onClick={handleDemoCashier} style={styles.demoButton} disabled={loading}>
            <User size={16} />
            <span>Cashier Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    overflow: 'hidden',
    position: 'relative',
    padding: '20px',
  },
  orb1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, rgba(220,38,38,0) 70%)',
    top: '-150px',
    left: '-100px',
    animation: 'float1 8s ease-in-out infinite',
    pointerEvents: 'none' as const,
  },
  orb2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(185,28,28,0.25) 0%, rgba(185,28,28,0) 70%)',
    bottom: '-100px',
    right: '-80px',
    animation: 'float2 10s ease-in-out infinite',
    pointerEvents: 'none' as const,
  },
  orb3: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0) 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    animation: 'float3 12s ease-in-out infinite',
    pointerEvents: 'none' as const,
  },
  card: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(20, 20, 20, 0.7)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '40px 32px',
    boxShadow: '0 0 60px rgba(220, 38, 38, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)',
  },
  brandSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    marginBottom: '32px',
  },
  brandIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 30px rgba(220, 38, 38, 0.5), 0 0 60px rgba(220, 38, 38, 0.2)',
    marginBottom: '16px',
  },
  brandTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '1px',
    textShadow: '0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.2)',
    margin: 0,
  },
  brandSubtitle: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: '4px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
  },
  tabContainer: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '28px',
  },
  tab: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: '10px',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: '#ffffff',
    boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute' as const,
    left: '14px',
    color: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'none' as const,
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: '14px',
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
    marginTop: '4px',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '28px 0 20px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  demoButtons: {
    display: 'flex',
    gap: '12px',
  },
  demoButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    borderRadius: '12px',
    background: 'rgba(220, 38, 38, 0.08)',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
