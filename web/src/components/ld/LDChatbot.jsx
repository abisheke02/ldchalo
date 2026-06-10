import React, { useState, useRef, useEffect } from 'react';
import useAuthStore from '../../store/authStore';

// ─── Quick reply suggestions ────────────────────────────────────────────
const QUICK_REPLIES = [
  '📊 My progress',
  '🎯 Weak areas',
  '🏆 Level status',
  '👨‍🏫 Contact teacher',
  '📋 Screening result',
  '💡 What to practice',
];

// ─── Bot logic: responds based on student data ──────────────────────────
function getBotResponse(message, studentData, user) {
  const msg = message.toLowerCase().trim();
  const d = studentData || {};
  const name = user?.name?.split(' ')[0] || 'Student';

  // Progress / status
  if (msg.includes('progress') || msg.includes('status') || msg.includes('how am i doing')) {
    return `Here's your progress summary, ${name}:\n\n` +
      `📋 Level: ${d.level || 3}\n` +
      `🔥 Streak: ${d.streak || 0} days\n` +
      `💎 Overall Mastery: ${d.mastery || 0}%\n` +
      `🕐 Practice Time: ${Math.floor((d.totalPracticeMinutes || 0) / 60)}h ${(d.totalPracticeMinutes || 0) % 60}m\n\n` +
      `Keep going! You're doing great! 🌟`;
  }

  // Weak areas
  if (msg.includes('weak') || msg.includes('improve') || msg.includes('struggle')) {
    const categories = d.categoryMastery || [];
    const weak = categories.filter(c => (c.mastery || 0) < 50).sort((a, b) => a.mastery - b.mastery);
    if (weak.length === 0) return `Great news! All your categories are above 50%. Keep practicing to push them higher! 💪`;
    const list = weak.slice(0, 3).map(c => `• ${c.category?.replace(/_/g, ' ')} — ${Math.round(c.mastery)}%`).join('\n');
    return `Here are your areas that need attention:\n\n${list}\n\nI'd suggest focusing on these during your next practice session. 🎯`;
  }

  // Level
  if (msg.includes('level') || msg.includes('test ready') || msg.includes('next level')) {
    const ready = d.testReady ?? true;
    if (ready) return `🏆 You're currently at Level ${d.level || 3} and ready to take the Level ${(d.level || 3) + 1} test!\n\nGo to Tests to attempt it when you're confident.`;
    return `You're at Level ${d.level || 3}. Keep practicing to unlock the next level test. You need consistent scores above 75% in your categories.`;
  }

  // Screening result
  if (msg.includes('screening') || msg.includes('ld type') || msg.includes('diagnosis')) {
    return `📋 Your last screening result:\n\n` +
      `• LD Type: ${(d.ldType || 'dyslexia').replace('_', ' ')}\n` +
      `• Risk Score: ${d.riskScore ?? 45}/100\n` +
      `• Date: ${d.lastScreeningDate || 'Recent'}\n\n` +
      `This helps us personalize your learning path. Your exercises are tailored to your specific needs.`;
  }

  // What to practice
  if (msg.includes('practice') || msg.includes('what should') || msg.includes('recommend') || msg.includes('suggest')) {
    const categories = d.categoryMastery || [];
    const weak = categories.filter(c => (c.mastery || 0) < 60).sort((a, b) => a.mastery - b.mastery);
    if (weak.length > 0) {
      return `💡 I recommend practicing:\n\n` +
        weak.slice(0, 2).map(c => `• ${c.category?.replace(/_/g, ' ')} (currently ${Math.round(c.mastery)}%)`).join('\n') +
        `\n\nThe adaptive system will pick the right difficulty for you. Click "Practice" in the sidebar to start!`;
    }
    return `You're doing well across all areas! Try taking a level test or revisiting older topics for reinforcement. 🌟`;
  }

  // Contact teacher
  if (msg.includes('teacher') || msg.includes('contact') || msg.includes('help') || msg.includes('team') || msg.includes('connect')) {
    return `👨‍🏫 Your support team:\n\n` +
      `• **Class Teacher** — Available Mon–Fri, 9am–3pm\n` +
      `• **LD Specialist** — For screening & assessment queries\n` +
      `• **Parent/Guardian** — Gets weekly progress reports\n\n` +
      `Would you like me to send a message to your teacher? Just tell me what you need help with!`;
  }

  // Streak
  if (msg.includes('streak') || msg.includes('daily')) {
    const streak = d.streak || 0;
    const goal = d.weeklyGoal?.completed ?? 0;
    return `🔥 Your streak: ${streak} days in a row!\n📅 This week: ${goal}/5 days practiced\n\nKeep it up! Consistency is key to learning. 💪`;
  }

  // Score / average
  if (msg.includes('score') || msg.includes('average') || msg.includes('accuracy')) {
    return `📊 Your scores:\n\n` +
      `• Average Score: ${d.avgScore || d.mastery || 72}%\n` +
      `• Total Practices: ${d.totalPractices || 23}\n` +
      `• Tests Completed: ${d.totalTests || 4}\n\n` +
      `${(d.avgScore || 72) >= 70 ? "You're performing well above average! 🎉" : "You're improving steadily. Keep practicing! 📈"}`;
  }

  // Greeting
  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || msg === 'yo') {
    return `Hi ${name}! 👋 I'm your LD learning assistant.\n\nI can help you with:\n• Your progress & scores\n• Weak areas to focus on\n• Level test readiness\n• Connecting with your teacher\n\nWhat would you like to know?`;
  }

  // Default
  return `I can help you with:\n\n` +
    `📊 Your progress & mastery\n` +
    `🎯 Areas to improve\n` +
    `🏆 Level test status\n` +
    `👨‍🏫 Connect with your teacher\n` +
    `📋 Screening results\n` +
    `💡 Practice recommendations\n\n` +
    `Try asking one of these, or tap a quick reply below! 👇`;
}

// ─── Main Chatbot Component ─────────────────────────────────────────────
export default function LDChatbot({ studentData }) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your LD assistant. Ask me about your progress, scores, or connect with your team!` }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getBotResponse(userMsg, studentData, user);
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
      setTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ─── Floating Button ─── */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg) scale(0.9)' : 'scale(1)',
        }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* ─── Chat Window ─── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 999,
          width: 360, height: 500, borderRadius: 20,
          background: '#fff', border: '1px solid #e2e8f0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'slideUp 0.3s ease',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            padding: '16px 20px', color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>LD Assistant</p>
                <p style={{ fontSize: 11, color: '#e0e7ff', margin: 0 }}>Always here to help • Online</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                  fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  background: msg.role === 'user' ? '#6366f1' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#334155',
                  border: msg.role === 'bot' ? '1px solid #e2e8f0' : 'none',
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                  borderBottomLeftRadius: msg.role === 'bot' ? 4 : 14,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: 14, fontSize: 13, color: '#94a3b8' }}>
                  <span style={{ animation: 'blink 1.4s infinite' }}>●</span>
                  <span style={{ animation: 'blink 1.4s infinite 0.2s' }}> ●</span>
                  <span style={{ animation: 'blink 1.4s infinite 0.4s' }}> ●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fff' }}>
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  fontSize: 11, padding: '5px 10px', borderRadius: 20,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  color: '#4f46e5', cursor: 'pointer', fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.background = '#eef2ff'; e.target.style.borderColor = '#6366f1'; }}
                onMouseLeave={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, background: '#fff' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              style={{
                flex: 1, border: '1px solid #e2e8f0', borderRadius: 12,
                padding: '10px 14px', fontSize: 13, outline: 'none',
                transition: 'border 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: input.trim() ? '#6366f1' : '#e2e8f0',
                color: '#fff', border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'background 0.2s',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 60% { opacity: 1; }
          30% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
