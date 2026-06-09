import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('chat'); // 'chat' or 'breathing'
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello there! I'm your companion. How is your mind feeling today? 🌸", isBot: true, reaction: null }
  ]);
  const [input, setInput] = useState("");
  const [activeReactionId, setActiveReactionId] = useState(null);

  // Breathing Guide States
  const [breathPhase, setBreathPhase] = useState('Inhale'); // 'Inhale', 'Hold', 'Exhale'
  const [counter, setCounter] = useState(4);
  const [breathScale, setBreathScale] = useState(1);

  // Handle the magical door entrance animation upon entering the space
  useEffect(() => {
    const doorTimer = setTimeout(() => setDoorOpen(true), 600);
    const textTimer = setTimeout(() => setWelcomeComplete(true), 3200);
    return () => {
      clearTimeout(doorTimer);
      clearTimeout(textTimer);
    };
  }, []);

  // Handle the interactive pacing rhythm of the breathing exercise
  useEffect(() => {
    if (view !== 'breathing') return;

    const interval = setInterval(() => {
      setCounter((prev) => {
        if (prev > 1) return prev - 1;

        // Transition cycle configurations
        if (breathPhase === 'Inhale') {
          setBreathPhase('Hold');
          setBreathScale(1.3);
          return 4;
        } else if (breathPhase === 'Hold') {
          setBreathPhase('Exhale');
          setBreathScale(1.0);
          return 4;
        } else {
          setBreathPhase('Inhale');
          setBreathScale(1.15);
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view, breathPhase]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Simulate comforting responses from the companion pipeline
    setTimeout(() => {
      const botMsg = {
        id: Date.now() + 1,
        text: "That makes complete sense. Remember to treat yourself with grace right now. You are doing wonderfully. ✨",
        isBot: true,
        reaction: null
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1200);
  };

  const handleAddReaction = (msgId, emoji) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: emoji } : m));
    setActiveReactionId(null);
  };

  return (
    <div className="flex h-screen w-full bg-[#fdfaf2] overflow-hidden text-slate-700 font-sans">
      
      {/* SIDEBAR NAVIGATION: Sea-green balancing theme */}
      <div className="w-80 bg-[#e2efe9] border-r-3 border-[#4a5d55] flex flex-col justify-between p-6 z-10">
        <div className="space-y-8">
          
          {/* User Profile Canvas */}
          <div className="flex items-center gap-4 bg-[#fffaf5] p-3 rounded-2xl border-2 border-[#4a5d55] shadow-[2px_2px_0px_#4a5d55]">
            <div className="w-12 h-12 rounded-full bg-[#ffcaa9] border-2 border-[#4a5d55] flex items-center justify-center font-serif text-lg font-black text-[#563830]">
              {user.name[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-serif font-black text-sm text-[#4a5d55] truncate">Welcome, {user.name}!</h3>
              <p className="text-xs text-[#718a80] font-semibold">Mind Space Active</p>
            </div>
          </div>

          {/* Navigation Switches */}
          <div className="space-y-3">
            <button 
              onClick={() => setView('chat')}
              className={`w-full py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-3 ${
                view === 'chat' 
                  ? 'bg-[#ffcaa9] text-[#563830] border-[#4a5d55] shadow-[3px_3px_0px_#4a5d55] translate-y-[-2px]' 
                  : 'bg-white text-[#718a80] border-[#c2d6ce] hover:border-[#4a5d55]'
              }`}
            >
              <span>💬</span> Companion Chat
            </button>
            
            <button 
              onClick={() => { setView('breathing'); setBreathPhase('Inhale'); setCounter(4); }}
              className={`w-full py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-3 ${
                view === 'breathing' 
                  ? 'bg-[#ffcaa9] text-[#563830] border-[#4a5d55] shadow-[3px_3px_0px_#4a5d55] translate-y-[-2px]' 
                  : 'bg-white text-[#718a80] border-[#c2d6ce] hover:border-[#4a5d55]'
              }`}
            >
              <span>🌬️</span> Breathing Exercise
            </button>
          </div>

          {/* Previous Safe Chats Log */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#718a80] mb-3 px-1">Recent Journeys</h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              <div className="p-3 bg-white/60 border border-[#c2d6ce] rounded-xl text-xs font-medium cursor-pointer hover:bg-white transition-colors">
                🌙 Evening Reflection Log
              </div>
              <div className="p-3 bg-white/60 border border-[#c2d6ce] rounded-xl text-xs font-medium cursor-pointer hover:bg-white transition-colors">
                🍃 Grounding Session
              </div>
            </div>
          </div>
        </div>

        {/* Action Footers */}
        <button 
          onClick={onLogout}
          className="w-full py-3 bg-[#fceade] hover:bg-[#f7d5c0] border-2 border-[#563830] text-[#563830] font-black text-xs uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_#563830] transition-transform active:translate-y-[2px]"
        >
          Sign Out Space 🚪
        </button>
      </div>

      {/* MAIN DISPLAY CANVAS */}
      <div className="flex-1 relative flex flex-col bg-[#fffbf7]">
        
        {/* VIEW 1: THE ACTIVE COMPANION CHAT ROOM */}
        {view === 'chat' && (
          <div className="flex-1 flex flex-col h-full relative">
            
            {/* Entrance Welcome Screen overlay */}
            {!welcomeComplete && (
              <div className="absolute inset-0 bg-[#fffbf7] z-50 flex flex-col items-center justify-center p-6">
                <div className="max-w-xs text-center space-y-6">
                  <h2 className="text-2xl font-serif font-black text-[#563830]">Unlocking Workspace...</h2>
                  
                  {/* Interactive Welcome Door layout */}
                  <div className="w-40 h-48 mx-auto bg-[#e2efe9] border-4 border-[#4a5d55] rounded-t-full relative overflow-hidden shadow-md">
                    <div 
                      style={{ transform: doorOpen ? 'rotateY(-110deg)' : 'rotateY(0deg)' }}
                      className="absolute inset-0 bg-[#ffcaa9] border-r-4 border-[#4a5d55] origin-left transition-transform duration-[1800ms] cubic-bezier(0.4, 0, 0.2, 1) flex items-center justify-end p-2 z-20"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#4a5d55]" />
                    </div>
                    
                    {/* Waving Rabbit embedded inside the space */}
                    <div className="absolute inset-0 flex items-center justify-center pt-4 bg-[#e2efe9]">
                      <svg className="w-24 h-24 animate-bounce" viewBox="0 0 200 200" fill="none">
                        <ellipse cx="72" cy="40" rx="15" ry="38" fill="#fcd3c1" />
                        <ellipse cx="128" cy="40" rx="15" ry="38" fill="#fcd3c1" />
                        <circle cx="100" cy="110" r="44" fill="#fcd3c1" />
                        <circle cx="82" cy="105" r="5" fill="#4a332d" />
                        <circle cx="118" cy="105" r="5" fill="#4a332d" />
                        {/* Waving hand mechanism */}
                        <circle cx="145" cy="90" r="10" fill="#fcd3c1" className="origin-center animate-pulse" />
                        <path d="M 95 120 Q 100 124 105 120" stroke="#4a332d" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#718a80] animate-pulse">Your companion is stepping in!</p>
                </div>
              </div>
            )}

            {/* Chat Messages Frame */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} items-end gap-2`}>
                  
                  {msg.isBot && (
                    <div className="w-8 h-8 rounded-full bg-[#fcd3c1] border border-[#563830] flex-shrink-0 flex items-center justify-center text-xs">
                      🐰
                    </div>
                  )}

                  <div className="relative group max-w-[70%]">
                    {/* Comic-style Dialogue Box Framing */}
                    <div className={`p-4 rounded-2xl border-3 border-[#4a5d55] text-sm font-semibold tracking-wide relative ${
                      msg.isBot 
                        ? 'bg-white text-[#563830] shadow-[3px_3px_0px_#4a5d55] rounded-bl-none' 
                        : 'bg-[#ffcaa9] text-[#563830] shadow-[-3px_3px_0px_#4a5d55] rounded-br-none'
                    }`}>
                      {msg.text}

                      {/* Displayed active message reaction tags */}
                      {msg.reaction && (
                        <div className="absolute -bottom-3 -right-2 bg-white border-2 border-[#4a5d55] rounded-full px-1.5 py-0.5 text-xs shadow-xs z-10">
                          {msg.reaction}
                        </div>
                      )}
                    </div>

                    {/* Bot Message Reaction Overlay Trigger */}
                    {msg.isBot && (
                      <div className="absolute top-2 -right-12 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 border border-slate-300 rounded-full px-1.5 py-0.5 shadow-xs">
                        <button onClick={() => setActiveReactionId(activeReactionId === msg.id ? null : msg.id)} className="hover:scale-125 transition-transform text-xs">
                          ❤️
                        </button>
                      </div>
                    )}

                    {/* Pop-up Reaction Selector */}
                    {activeReactionId === msg.id && (
                      <div className="absolute top-8 -right-16 bg-white border-2 border-[#4a5d55] p-1.5 rounded-xl shadow-md z-30 flex gap-1.5 animate-fade-in">
                        {['❤️', '👍', '🌸', '✨'].map(emoji => (
                          <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="hover:scale-130 transition-all text-sm">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky Messaging Footer Input Box */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t-2 border-[#e2efe9] flex gap-3 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here safely..."
                className="flex-1 px-5 py-3.5 bg-[#fdfaf2] border-2 border-[#c2d6ce] focus:border-[#4a5d55] rounded-xl outline-none font-medium text-sm transition-colors"
              />
              <button type="submit" className="px-6 py-3.5 bg-[#4a5d55] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-[3px_3px_0px_#2c3a34] active:translate-y-[2px] transition-transform">
                Send 🚀
              </button>
            </form>
          </div>
        )}

        {/* VIEW 2: GUIDED BREATHING COMPANION EXPERIENCE */}
        {view === 'breathing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#fffbf7] to-[#eaf5f0]">
            
            <div className="max-w-md space-y-8">
              <div>
                <span className="px-4 py-1.5 bg-[#4a5d55] text-white text-xs font-black uppercase tracking-widest rounded-full">
                  Guided Grounding
                </span>
                <h2 className="text-3xl font-serif font-black text-[#563830] mt-3">Synchronized Breathing</h2>
                <p className="text-sm text-[#718a80] mt-1 font-medium">Follow the rabbit's rhythm to slow down your heart rate.</p>
              </div>

              {/* Central Dynamic Pacing Canvas Frame */}
              <div className="py-8 flex flex-col items-center justify-center relative">
                
                {/* Scalable Rabbit Body Avatar synced to current cycle phase */}
                <div 
                  style={{ transform: `scale(${breathScale})`, transition: 'transform 4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  className="w-48 h-48 bg-[#fffaf5] rounded-full border-4 border-[#4a5d55] shadow-lg flex items-center justify-center p-4 relative z-10"
                >
                  <svg className="w-36 h-36" viewBox="0 0 200 200" fill="none">
                    <ellipse cx="72" cy="40" rx="15" ry="38" fill="#fcd3c1" />
                    <ellipse cx="128" cy="40" rx="15" ry="38" fill="#fcd3c1" />
                    <circle cx="100" cy="110" r="44" fill="#fcd3c1" />
                    <circle cx="100" cy="116" r="24" fill="#fff9f6" />
                    <circle cx="82" cy="105" r="5" fill="#4a332d" />
                    <circle cx="118" cy="105" r="5" fill="#4a332d" />
                    
                    {/* Animated mouth configuration responding to cycles */}
                    {breathPhase === 'Inhale' && <circle cx="100" cy="116" r="4" fill="#4a332d" />}
                    {breathPhase === 'Hold' && <line x1="94" y1="116" x2="106" y2="116" stroke="#4a332d" strokeWidth="2.5" strokeLinecap="round" />}
                    {breathPhase === 'Exhale' && <path d="M 94 114 Q 100 122 106 114" stroke="#4a332d" strokeWidth="2.5" strokeLinecap="round" />}
                  </svg>
                </div>

                {/* Concentric Ambient Shock-wave Pulses around the sphere container */}
                <div 
                  style={{ transform: `scale(${breathScale * 1.35})`, opacity: breathPhase === 'Inhale' ? 0.4 : 0.15 }}
                  className="absolute w-56 h-56 rounded-full border-2 border-dashed border-[#4a5d55] transition-all duration-[4000ms]"
                />
              </div>

              {/* Realtime Action Prompters */}
              <div className="space-y-2">
                <h3 className="text-4xl font-serif font-black text-[#4a5d55] tracking-tight transition-all">
                  {breathPhase.toUpperCase()}
                </h3>
                <p className="text-xl font-bold text-[#563830] bg-[#ffcaa9] w-12 h-12 rounded-full flex items-center justify-center mx-auto border-2 border-[#563830]">
                  {counter}
                </p>
              </div>

              <button 
                onClick={() => setView('chat')}
                className="px-6 py-2.5 bg-white border-2 border-[#4a5d55] text-[#4a5d55] font-bold text-xs uppercase tracking-wide rounded-xl shadow-[2px_2px_0px_#4a5d55] hover:bg-[#fffaf5]"
              >
                Return to Chat Space
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}