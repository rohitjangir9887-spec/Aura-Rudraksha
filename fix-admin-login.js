import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/AdminLogin.jsx', 'utf8');

if (!code.includes('handleEmailSignup')) {
  // Add handleEmailSignup
  code = code.replace(
    '  const handleEmailLogin = async (e) => {',
    `  const handleEmailSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await authClient.signUpWithEmail(email, password);
      await verifyAdminAndRedirect();
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err) || "Failed to create account");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {`
  );

  // Replace buttons
  code = code.replace(
    `            <button type="submit" disabled={loading} className="admin-btn">
              <LogIn size={18} /> Sign In
            </button>`,
    `            <div style={{display: 'flex', gap: '10px'}}>
              <button type="submit" disabled={loading} className="admin-btn" style={{flex: 1}}>
                <LogIn size={18} /> Sign In
              </button>
              <button type="button" disabled={loading} onClick={handleEmailSignup} className="admin-btn" style={{flex: 1, background: '#fdf0e8', color: '#a54d2b', border: '1px solid #fdf0e8'}}>
                <UserPlus size={18} /> Sign Up
              </button>
            </div>`
  );
  
  // Use formatAuthError everywhere
  code = code.replace(/setError\(err.message \|\|/g, 'setError(authClient.formatAuthError(err) ||');
  
  // Import UserPlus
  code = code.replace('LogIn, Chrome', 'LogIn, Chrome, UserPlus'); // assuming it imports LogIn, Chrome
  
  fs.writeFileSync('src/pages/admin/AdminLogin.jsx', code);
}
