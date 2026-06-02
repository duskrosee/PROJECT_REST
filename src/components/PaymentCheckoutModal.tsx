import { useState } from 'react';

const CARDS = [
    { id: 'visa', label: 'VISA ****1234' },
    { id: 'mc',   label: 'Mastercard ****5678' },
    { id: 'blik', label: 'BLIK' },
];

export function PaymentModal({ open, onClose, draft, onPaid }: any) {
    const [coupon, setCoupon] = useState('');
    const [discount, setDiscount] = useState(0);
    const [card, setCard] = useState(CARDS[0].id);
    const [phase, setPhase] = useState<'form'|'processing'|'success'>('form');
    const [error, setError] = useState('');

    const applyCoupon = async () => {
        setError('');
        const r = await fetch('/api/coupons/validate', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ code: coupon }),
        });
        const data = await r.json();
        if (!r.ok) { setError(data.error); setDiscount(0); return; }
        setDiscount(data.discountPercent);
    };

    const pay = async () => {
        setPhase('processing');
        // 1. create checkout session
        const c = await fetch('/api/checkout/create', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ ...draft, couponCode: coupon || undefined }),
        });
        const { token, error: ce } = await c.json();
        if (ce) { setError(ce); setPhase('form'); return; }

        // 2. simulate bank delay
        await new Promise(r => setTimeout(r, 2500));

        // 3. confirm
        const f = await fetch(`/api/checkout/${token}/confirm`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ paymentMethod: CARDS.find(x=>x.id===card)!.label }),
        });
        const receipt = await f.json();
        if (!f.ok) { setError(receipt.error); setPhase('form'); return; }

        setPhase('success');
        onPaid(receipt);
    };

    if (!open) return null;
    const preview = draft.totalPreview * (1 - discount/100);

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70">
            <div className="glass-card bg-zinc-950 border-subtle p-6 w-[420px] rounded-xl">
                {phase === 'form' && (
                    <>
                        <h2 className="text-lg mb-4">Płatność</h2>
                        <div className="flex gap-2 mb-3">
                            <input className="flex-1 bg-zinc-900 border-subtle rounded px-3 py-2"
                                   placeholder="Kod kuponu" value={coupon}
                                   onChange={e=>setCoupon(e.target.value)} />
                            <button onClick={applyCoupon} className="px-3 py-2 bg-zinc-800 rounded">Zastosuj</button>
                        </div>
                        {discount > 0 && <p className="text-emerald-400 text-sm mb-2">Rabat: -{discount}%</p>}
                        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

                        <div className="space-y-2 mb-4">
                            {CARDS.map(c => (
                                <label key={c.id} className="flex items-center gap-2 p-2 border-subtle rounded cursor-pointer">
                                    <input type="radio" checked={card===c.id} onChange={()=>setCard(c.id)} />
                                    {c.label}
                                </label>
                            ))}
                        </div>

                        <p className="text-2xl mb-4">Do zapłaty: <b>{preview.toFixed(2)} zł</b></p>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="flex-1 py-2 bg-zinc-800 rounded">Anuluj</button>
                            <button onClick={pay} className="flex-1 py-2 bg-emerald-600 rounded">Zapłać</button>
                        </div>
                    </>
                )}
                {phase === 'processing' && <p className="py-12 text-center">Przetwarzanie płatności...</p>}
                {phase === 'success'    && (
                    <div className="py-8 text-center">
                        <p className="text-emerald-400 text-xl mb-4">Płatność zakończona sukcesem</p>
                        <button onClick={onClose} className="px-4 py-2 bg-zinc-800 rounded">Zamknij</button>
                    </div>
                )}
            </div>
        </div>
    );
}
