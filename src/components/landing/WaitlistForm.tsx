"use client";

import { useState } from 'react';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await fetch('/api/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, phone, honeypot: '' }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setMessage(data.message || 'You’re on the list! 🎉');
      setEmail('');
      setName('');
      setPhone('');
    } else {
      setMessage(data.message || 'Please try again.');
    }
    setPending(false);
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md space-y-3">
      <div className="flex flex-col gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-full border px-4 py-3 text-sm"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-full border px-4 py-3 text-sm"
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-full border px-4 py-3 text-sm"
        />
        {/* Honeypot */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          onChange={() => {}}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full h-12 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-70"
      >
        {pending ? 'Saving...' : 'Let me know when Thru is live'}
      </button>
      {message && <p className="text-sm text-gray-600 text-center">{message}</p>}
    </form>
  );
}

