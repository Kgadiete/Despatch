import { useEffect, useState } from 'react';
import { useTripStore, sessionTotal } from '../../../lib/tripStore';
import type { Trip } from '../../../lib/types/index';
import TripDetailSheet from '../components/TripDetailSheet';

const TripCount = () => {
  const {
    session,
    currentDate,
    loading,
    loadSession,
    loadHistory,
    setCurrentDate,
    addTrip,
    setSessionNotes,
    history,
  } = useTripStore();

  const [countInput, setCountInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [detailTrip, setDetailTrip] = useState<{ trip: Trip; index: number } | null>(null);

  const isToday = currentDate === new Date().toISOString().split('T')[0];
  const total = sessionTotal(session);
  const tripCount = session?.trips.length ?? 0;

  useEffect(() => {
    void loadSession(currentDate);
  }, [currentDate, loadSession]);

  useEffect(() => {
    if (showHistory) void loadHistory();
  }, [showHistory, loadHistory]);

  const shiftDate = (delta: number) => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const logTrip = async () => {
    const n = parseInt(countInput, 10);
    if (!Number.isFinite(n) || n < 1) {
      alert('Enter how many tyres you counted (1 or more).');
      return;
    }
    await addTrip(n);
    setCountInput('');
  };

  const adjustInput = (delta: number) => {
    const current = parseInt(countInput, 10) || 0;
    const next = Math.max(0, current + delta);
    setCountInput(next > 0 ? String(next) : '');
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 pb-28">
      <div className="flex items-center justify-between mb-4 gap-2">
        <button type="button" onClick={() => shiftDate(-1)} className="btn-secondary text-sm shrink-0">
          ←
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-amber-400">Tyre counting</h1>
          <p className="text-xs text-gray-500">
            {new Date(currentDate + 'T12:00:00').toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
            {!isToday && ' · history'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => shiftDate(1)}
          className="btn-secondary text-sm shrink-0"
          disabled={currentDate >= new Date().toISOString().split('T')[0]}
        >
          →
        </button>
      </div>

      <section className="card mb-4 text-center border-amber-400/30">
        <p className="text-sm text-gray-400 uppercase tracking-wide">Running total</p>
        <p className="text-5xl font-bold text-amber-400 tabular-nums my-1">{total}</p>
        <p className="text-gray-500 text-sm">
          {tripCount} trip{tripCount !== 1 ? 's' : ''} · accepted tyres only
        </p>
      </section>

      <section className="card mb-4">
          <p className="text-sm text-gray-400 mb-3">
            {isToday ? 'Log this forklift trip' : 'Add trip for this day'}
          </p>
          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => adjustInput(-1)}
              className="w-12 h-12 rounded-xl bg-slate-700 text-2xl font-bold"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void logTrip()}
              className="input-base w-24 text-center text-3xl font-bold tabular-nums"
              autoFocus
            />
            <button
              type="button"
              onClick={() => adjustInput(1)}
              className="w-12 h-12 rounded-xl bg-slate-700 text-2xl font-bold"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3 justify-center">
            {[10, 12, 8, 7, 15, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCountInput(String(n))}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold tabular-nums"
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void logTrip()}
            className="btn-primary w-full text-lg py-3"
          >
            Log trip
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Rejected tyres are not included — count accepted only.
          </p>
        </section>

      <section className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-gray-200">Trips</h2>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-amber-400"
          >
            {showHistory ? 'Hide history' : 'All days'}
          </button>
        </div>

        {loading && <p className="text-gray-400">Loading…</p>}

        {!loading && session && session.trips.length === 0 && (
          <p className="text-gray-500 text-sm">No trips logged for this day yet.</p>
        )}

        <ul className="space-y-2">
          {session?.trips.map((trip, index) => (
            <li key={trip.id}>
              <button
                type="button"
                onClick={() => setDetailTrip({ trip, index })}
                className="card w-full text-left hover:bg-slate-700 flex items-center justify-between"
              >
                <span>
                  <span className="font-bold text-amber-400 tabular-nums text-xl">
                    +{trip.count}
                  </span>
                  <span className="text-gray-400 ml-2 text-sm">Trip {index + 1}</span>
                  {trip.notes && (
                    <span className="block text-gray-500 text-xs mt-1 truncate">{trip.notes}</span>
                  )}
                </span>
                <span className="text-gray-500 text-sm shrink-0 ml-2">
                  {new Date(trip.createdAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {trip.media.length > 0 && ' · 📎'}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {session && session.trips.length > 0 && (
          <p className="text-right text-sm text-gray-400 mt-2 tabular-nums">
            Breakdown:{' '}
            {session.trips.map((t) => t.count).join(' + ')} = {total}
          </p>
        )}
      </section>

      <section className="card mb-4">
        <label className="text-sm text-gray-400 block mb-2">Session notes</label>
        <textarea
          key={`${session?.id ?? 'none'}:${session?.notes ?? ''}`}
          defaultValue={session?.notes ?? ''}
          onBlur={(e) => {
            void setSessionNotes(e.target.value);
          }}
          placeholder="Shift notes, batch refs…"
          className="input-base w-full h-20"
        />
      </section>

      {showHistory && (
        <section className="card">
          <h2 className="font-bold text-gray-200 mb-3">Past counting days</h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No history yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDate(s.date);
                      setShowHistory(false);
                    }}
                    className="w-full text-left py-2 border-b border-slate-700 last:border-0 hover:text-amber-400"
                  >
                    <span className="font-semibold">
                      {new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-gray-400 ml-2 tabular-nums">
                      {sessionTotal(s)} tyres · {s.trips.length} trips
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {detailTrip && (
        <TripDetailSheet
          trip={detailTrip.trip}
          tripIndex={detailTrip.index}
          onClose={() => setDetailTrip(null)}
        />
      )}
    </main>
  );
};

export default TripCount;
