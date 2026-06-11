import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────
// DIAGNOSTIC FUNCTION — runs on page load
// Check browser console (F12) for results
// ─────────────────────────────────────────────
const runDiagnostics = async () => {
  console.group("🔍 Supabase Diagnostics");

  try {
    if (!supabase) throw new Error("Supabase client is undefined");
    console.log("✅ Step 1: Supabase client initialized");
  } catch (err) {
    console.error("❌ Step 1 FAILED: Supabase client not initialized →", err.message);
    console.groupEnd();
    return;
  }

  try {
    const { error } = await supabase
      .from('registration_table')
      .select('count', { count: 'exact', head: true });

    if (error && (error.message?.includes("fetch") || error.message?.includes("network"))) {
      throw new Error("Network/fetch error — Supabase URL may be wrong: " + error.message);
    }
    console.log("✅ Step 2: Supabase is reachable");
  } catch (err) {
    console.error("❌ Step 2 FAILED: Cannot reach Supabase →", err.message);
    console.groupEnd();
    return;
  }

  try {
    const { data, error } = await supabase
      .from('registration_table')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        throw new Error("Table does not exist. Check the table name in Supabase.");
      } else if (error.message?.includes("permission denied")) {
        throw new Error("Table exists but RLS is blocking SELECT. Disable RLS or add a SELECT policy for anon role.");
      } else {
        throw new Error(`Unexpected error: ${error.code} — ${error.message}`);
      }
    }
    console.log("✅ Step 3: registration_table found and SELECT works. Rows returned:", data.length);
  } catch (err) {
    console.error("❌ Step 3 FAILED:", err.message);
    console.groupEnd();
    return;
  }

  try {
    const testPayload = {
      name: '__diag_test__',
      email: '__diag@test.com',
      phone: '0000000000',
      age: 25,
      password: 'test',
      profession: 'test',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('registration_table')
      .insert([testPayload])
      .select()
      .single();

    if (insertError) {
      if (insertError.message?.includes("permission denied")) {
        throw new Error("INSERT is blocked by RLS. Add an INSERT policy for the anon role, or disable RLS.");
      } else if (insertError.code === '23502') {
        throw new Error(`A NOT NULL column is missing from the test payload. Details: ${insertError.message}`);
      } else if (insertError.code === '23505') {
        console.log("✅ Step 4: INSERT works (duplicate key hit — test row already exists)");
      } else {
        throw new Error(`INSERT failed: ${insertError.code} — ${insertError.message}`);
      }
    } else {
      console.log("✅ Step 4: INSERT works. Test row inserted:", inserted);
      const { error: deleteError } = await supabase
        .from('registration_table')
        .delete()
        .eq('email', '__diag@test.com');
      if (deleteError) {
        console.warn("⚠️ Step 4 cleanup: Could not delete test row →", deleteError.message);
      } else {
        console.log("✅ Step 4 cleanup: Test row deleted");
      }
    }
  } catch (err) {
    console.error("❌ Step 4 FAILED:", err.message);
    console.groupEnd();
    return;
  }

  console.log("🎉 All diagnostics passed! Database is fully working.");
  console.groupEnd();
};

// ─────────────────────────────────────────────
// IRIDESCENT BUBBLE
// ─────────────────────────────────────────────
const IridescentBubble = ({ index }) => {
  const sizes = [150, 80, 170, 115, 95, 130];
  const size = sizes[index % sizes.length];

  const positions = [
    { top: '8%', left: '6%' },
    { top: '14%', right: '10%' },
    { bottom: '38%', left: '-4%' },
    { bottom: '18%', right: '16%' },
    { bottom: '-2%', left: '22%' },
    { top: '45%', right: '5%' },
  ];
  const pos = positions[index % positions.length];

  const bubbleGradients = [
    'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 182, 193, 0.4) 30%, rgba(135, 206, 250, 0.4) 70%, rgba(221, 160, 221, 0.6) 100%)',
    'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 239, 213, 0.5) 40%, rgba(255, 192, 203, 0.4) 70%, rgba(179, 157, 219, 0.5) 100%)',
    'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(176, 224, 230, 0.5) 30%, rgba(255, 240, 245, 0.4) 60%, rgba(255, 218, 185, 0.6) 100%)',
    'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(224, 242, 241, 0.5) 30%, rgba(244, 143, 177, 0.3) 70%, rgba(144, 202, 249, 0.5) 100%)',
  ];

  const currentGradient = bubbleGradients[index % bubbleGradients.length];
  const animationClass = index % 2 === 0 ? 'animate-bubble-1' : 'animate-bubble-2';

  return (
    <div
      className={`absolute rounded-full pointer-events-none backdrop-blur-[0.5px] border border-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.04)] ${animationClass}`}
      style={{ width: size, height: size, ...pos, background: currentGradient }}
    />
  );
};

// ─────────────────────────────────────────────
// MAIN AUTH PAGE
// ─────────────────────────────────────────────
export default function AuthPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login');
  const [loginMethod, setLoginMethod] = useState('email');
  const [profession, setProfession] = useState('');
  const [otherProfession, setOtherProfession] = useState('');
  const [loginData, setLoginData] = useState({ email: '', phone: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', phone: '', age: '', password: '' });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const validateEmailFormat = (emailStr) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailStr);
  };

  const handlePhoneInputChange = (val, targetForm) => {
    const cleanDigitsOnly = val.replace(/\D/g, '');
    if (cleanDigitsOnly.length <= 10) {
      if (targetForm === 'login') {
        setLoginData(prev => ({ ...prev, phone: cleanDigitsOnly }));
      } else {
        setSignupData(prev => ({ ...prev, phone: cleanDigitsOnly }));
      }
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const identifier = loginMethod === 'email' ? loginData.email : loginData.phone;

    if (!identifier || !loginData.password) {
      alert("❌ Please fill in all fields.");
      return;
    }
    if (loginMethod === 'email' && !validateEmailFormat(identifier)) {
      alert("❌ Please enter a valid email.");
      return;
    }
    if (loginMethod === 'phone' && identifier.length !== 10) {
      alert("❌ Phone number must be exactly 10 digits.");
      return;
    }

    try {
      // 1. Find user
      const column = loginMethod === 'email' ? 'email' : 'phone';
      const { data: user, error } = await supabase
        .from('registration_table')
        .select('*')
        .eq(column, identifier)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setSignupData(prev => ({
            ...prev,
            email: loginMethod === 'email' ? loginData.email : '',
            phone: loginMethod === 'phone' ? loginData.phone : '',
          }));
          alert("No account found. Redirecting to Sign Up.");
          setActiveTab('signup');
        } else {
          alert(`🔴 Login failed. ${error.message}`);
        }
        return;
      }

      if (user.password !== loginData.password) {
        alert("❌ Wrong password. Please try again.");
        return;
      }

      // 2. Fetch IP
      let ipAddress = 'unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch {
        console.warn("Could not fetch IP");
      }

      // 3. Fetch location
      let lat = null;
      let long = null;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        lat = position.coords.latitude;
        long = position.coords.longitude;
      } catch {
        console.warn("Location permission denied or unavailable");
      }

      // 4. Insert into login_log
      const { error: logError } = await supabase
        .from('login_log')
        .insert({
          user_id: user.id,
          ip: ipAddress,
          lat,
          long,
        });

      if (logError) {
        console.warn("Login log insert failed:", logError.message);
      }

      // 5. Success
      alert(`✅ Logged in successfully! Welcome back, ${user.name} 👋`);
      onLoginSuccess({ name: user.name, email: user.email });

    } catch (err) {
      alert(`🔴 Unexpected error: ${err.message}`);
      console.error("Login error:", err);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    const parsedAge = parseInt(signupData.age, 10);
    if (isNaN(parsedAge) || parsedAge < 8 || parsedAge > 100) {
      alert("❌ Invalid age. Must be between 8 and 100.");
      return;
    }
    if (!validateEmailFormat(signupData.email)) {
      alert("❌ Invalid email format.");
      return;
    }
    if (signupData.phone.length !== 10) {
      alert("❌ Phone must be exactly 10 digits.");
      return;
    }
    if (!signupData.name || !signupData.password) {
      alert("❌ Name and password are required.");
      return;
    }

    // Duplicate checks before inserting
    const { data: existingEmail } = await supabase
      .from('registration_table')
      .select('id')
      .eq('email', signupData.email)
      .single();

    if (existingEmail) {
      alert("❌ This email is already registered. Please log in.");
      setActiveTab('login');
      return;
    }

    const { data: existingPhone } = await supabase
      .from('registration_table')
      .select('id')
      .eq('phone', signupData.phone)
      .single();

    if (existingPhone) {
      alert("❌ This phone number is already registered. Please log in.");
      setActiveTab('login');
      return;
    }

    const finalProfession = profession === 'Other' ? otherProfession : profession;

    const payload = {
      name: signupData.name,
      email: signupData.email,
      phone: signupData.phone,
      age: parsedAge,
      password: signupData.password,
      profession: finalProfession,
    };

    console.log("📦 Payload being sent to Supabase:", payload);

    try {
      const { data, error } = await supabase
        .from('registration_table')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.message?.includes("permission denied")) {
          alert("🔴 [RLS Error] INSERT is blocked.\nGo to Supabase → Authentication → Policies → registration_table and add an INSERT policy for the anon role with 'true' as the condition.");
        } else if (error.code === '23505') {
          alert("❌ Account already exists. Please log in.");
          setActiveTab('login');
        } else if (error.code === '23502') {
          alert(`❌ Missing required field. Details: ${error.message}`);
        } else {
          alert(`🔴 Signup failed. ${error.message}`);
        }
        return;
      }

      alert(`✅ Account created successfully! Welcome, ${data.name} 👋`);
      onLoginSuccess({ name: data.name, email: data.email });

    } catch (err) {
      alert(`🔴 Unexpected error: ${err.message}`);
      console.error("Signup error:", err);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#fffcfb] overflow-hidden font-sans">

      {/* LEFT SIDE PANEL */}
      <div
        className="relative hidden md:flex w-1/2 flex-col items-center justify-between p-12 overflow-hidden select-none"
        style={{ background: 'linear-gradient(135deg, #ffe5ec 0%, #ffebec 15%, #f0e6ff 40%, #e8f0fe 70%, #fff0db 100%)' }}
      >
        {[...Array(6)].map((_, i) => (
          <IridescentBubble key={i} index={i} />
        ))}

        <div className="relative z-20 mt-4 flex justify-center w-full">
          <div className="absolute w-48 h-48 bg-white/20 rounded-full blur-2xl top-4 animate-pulse" />
          <svg className="w-48 h-48 drop-shadow-md relative z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="72" cy="40" rx="15" ry="38" fill="#fcd3c1" />
            <ellipse cx="72" cy="44" rx="8" ry="24" fill="#ffb499" />
            <ellipse cx="128" cy="40" rx="15" ry="38" fill="#fcd3c1" />
            <ellipse cx="128" cy="44" rx="8" ry="24" fill="#ffb499" />
            <circle cx="100" cy="135" r="50" fill="#fcd3c1" />
            <circle cx="100" cy="142" r="30" fill="#fff9f6" />
            <circle cx="100" cy="98" r="44" fill="#fcd3c1" />
            <circle cx="73" cy="108" r="8" fill="#ffa280" opacity="0.6" />
            <circle cx="127" cy="108" r="8" fill="#ffa280" opacity="0.6" />
            <circle cx="82" cy="96" r="5" fill="#4a332d" />
            <circle cx="118" cy="96" r="5" fill="#4a332d" />
            <path d="M 96 103 Q 100 100 104 103 Q 100 106 96 103 Z" fill="#ffa280" />
            <path d="M 95 110 Q 100 114 105 110" stroke="#4a332d" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="78" cy="144" r="7" fill="#fff9f6" />
            <circle cx="122" cy="144" r="7" fill="#fff9f6" />
          </svg>
        </div>

        <div className="text-center z-20 max-w-md my-4">
          <h1 className="text-4xl font-serif font-black text-[#563830] tracking-tight mb-2">myBuddy</h1>
          <p className="text-[#96746b] font-medium text-base">A gentle space, just for you.</p>
        </div>

        <div className="w-full max-w-sm space-y-3.5 z-20">
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-4 border border-white/50 shadow-xs flex items-center gap-4">
            <span className="text-xl p-2 bg-amber-100/50 rounded-xl">🔒</span>
            <div>
              <h4 className="text-sm font-bold text-[#563830]">Private & Secure</h4>
              <p className="text-xs text-[#96746b] mt-0.5">Your conversations are yours alone. End-to-end encrypted.</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-4 border border-white/50 shadow-xs flex items-center gap-4">
            <span className="text-xl p-2 bg-emerald-100/50 rounded-xl">🌿</span>
            <div>
              <h4 className="text-sm font-bold text-[#563830]">Mental Health First</h4>
              <p className="text-xs text-[#96746b] mt-0.5">Everything here is designed around your wellbeing.</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-4 border border-white/50 shadow-xs flex items-center gap-4">
            <span className="text-xl p-2 bg-purple-100/50 rounded-xl">💛</span>
            <div>
              <h4 className="text-sm font-bold text-[#563830]">Always Listening</h4>
              <p className="text-xs text-[#96746b] mt-0.5">No judgment. No pressure. Speak freely, always.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL */}
      <div className="flex flex-1 items-center justify-center p-6 bg-[#fffcfb]">
        <div className="w-full max-w-[400px] flex flex-col p-2">
          <div className="w-full">
            {activeTab === 'login' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-serif font-black text-[#563830] tracking-tight">Welcome back ✨</h2>
                  <p className="text-[#96746b] text-sm mt-1">Pick up where you left off.</p>
                </div>

                <div className="flex bg-[#fff2ec] p-1 rounded-xl max-w-[200px] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white text-[#563830] shadow-2xs' : 'text-[#96746b]'}`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white text-[#563830] shadow-2xs' : 'text-[#96746b]'}`}
                  >
                    Phone
                  </button>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {loginMethod === 'email' ? (
                    <input
                      type="text"
                      placeholder="Email Address"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="w-full px-5 py-3.5 border border-[#ffdfc4] rounded-2xl text-base bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                    />
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="10-Digit Phone Number"
                      value={loginData.phone}
                      onChange={(e) => handlePhoneInputChange(e.target.value, 'login')}
                      className="w-full px-5 py-3.5 border border-[#ffdfc4] rounded-2xl text-base bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                    />
                  )}
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-5 py-3.5 border border-[#ffdfc4] rounded-2xl text-base bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                  />
                  <button type="submit" className="w-full py-4 bg-[#ffc3b1] hover:bg-[#ffb49e] text-[#563830] font-bold rounded-2xl shadow-sm transition-colors text-base">
                    Begin Session
                  </button>
                </form>

                <div className="text-center pt-2">
                  <p className="text-sm font-medium text-[#96746b]">
                    New here?{' '}
                    <button type="button" onClick={() => setActiveTab('signup')} className="text-[#ffa47d] font-bold underline hover:text-[#ff8f61] transition-colors ml-1">
                      Sign Up
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-serif font-black text-[#563830] tracking-tight">Join the Collective 🌱</h2>
                  <p className="text-[#96746b] text-sm mt-0.5">Create your private workspace.</p>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-[#ffdfc4] rounded-2xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                  />
                  <div className="flex gap-2.5">
                    <input
                      type="number"
                      min="8"
                      max="100"
                      placeholder="Age"
                      value={signupData.age}
                      onChange={(e) => setSignupData({ ...signupData, age: e.target.value })}
                      className="w-1/3 px-4 py-3 border border-[#ffdfc4] rounded-2xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                    />
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-2/3 px-3 py-3 border border-[#ffdfc4] rounded-2xl text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                    >
                      <option value="" disabled>Select Profession</option>
                      <option value="Student">Student</option>
                      <option value="Working Professional">Working Professional</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {profession === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify profession"
                      value={otherProfession}
                      onChange={(e) => setOtherProfession(e.target.value)}
                      className="w-full px-4 py-3 border border-[#ffdfc4] rounded-2xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                    />
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Phone Number (10 Digits)"
                    value={signupData.phone}
                    onChange={(e) => handlePhoneInputChange(e.target.value, 'signup')}
                    className="w-full px-4 py-3 border border-[#ffdfc4] rounded-2xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                  />
                  <input
                    type="text"
                    placeholder="Email Address (name@domain.com)"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-[#ffdfc4] rounded-2xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-[#ffdfc4] rounded-2xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffa47d]"
                  />
                  <button type="submit" className="w-full py-3.5 bg-[#ffa47d] hover:bg-[#ff8f61] text-white font-bold rounded-2xl shadow-xs transition-colors text-sm uppercase tracking-wide">
                    Create Account
                  </button>
                </form>

                <div className="text-center pt-1">
                  <p className="text-sm font-medium text-[#96746b]">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setActiveTab('login')} className="text-[#ffa47d] font-bold underline hover:text-[#ff8f61] transition-colors ml-1">
                      Login
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}