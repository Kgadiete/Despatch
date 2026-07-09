import { useState } from 'react';
import { PRESET_TAGS } from '../../../lib/constants';
import type { Entry } from '../../../lib/types/index';
import { useDiaryStore } from '../../../lib/store';
import EntryCard from '../components/EntryCard';

interface SearchProps {
  onBack: () => void;
}

function groupByDate(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = new Date(e.createdAt).toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return map;
}

const Search = ({ onBack }: SearchProps) => {
  const { searchEntries } = useDiaryStore();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [results, setResults] = useState<Entry[]>([]);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    const found = await searchEntries(query, selectedTags);
    setResults(found);
    setSearched(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const grouped = groupByDate(results);

  return (
    <div className="flex flex-col h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} className="btn-secondary text-sm">
          ← Home
        </button>
        <h2 className="text-xl font-bold text-amber-400">Search</h2>
      </div>

      <input
        type="search"
        placeholder="Truck reg, notes, tags…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
        className="input-base w-full mb-3"
      />

      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded text-sm ${
              selectedTags.includes(tag)
                ? 'bg-amber-400 text-slate-900'
                : 'bg-slate-700 text-gray-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <button type="button" onClick={() => void runSearch()} className="btn-primary mb-6">
        Search
      </button>

      {searched && results.length === 0 && (
        <p className="text-gray-400">No entries found.</p>
      )}

      {[...grouped.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, entries]) => (
          <div key={date} className="mb-6">
            <h3 className="text-sm text-gray-400 mb-2">
              {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <div className="space-y-3">
              {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};

export default Search;
