import React, { useState, useEffect } from 'react';
import { getVerseAnalysis } from '../services/geminiService';
import type { Verse, VerseReference } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface VerseToolsProps {
  verseRef: VerseReference;
  verseData: Verse;
  englishVersion: string;
  onClose?: () => void;
}

type Tab = 'Interlinear' | 'Cross-references' | 'Historical Context' | 'Notes';

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
    </div>
);

export const VerseTools: React.FC<VerseToolsProps> = ({ verseRef, verseData, englishVersion, onClose }) => {

  const [activeTab, setActiveTab] = useState<Tab>('Interlinear');

  // Use NULL (not "") for reset logic
  const [analysis, setAnalysis] = useState<Record<Tab, string | null>>({
    Interlinear: null,
    'Cross-references': null,
    'Historical Context': null,
    Notes: null,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const verseId = `${verseRef.book}-${verseRef.chapter}-${verseRef.verse}`;
  const [userNotes, setUserNotes] = useLocalStorage<string>(`${verseId}-notes`, '');

  const englishText = verseData.text[englishVersion as keyof typeof verseData.text] || verseData.text.KJV;

  /** ----------------------------
   * RESET ON NEW VERSE
   ------------------------------ */
  useEffect(() => {
    setAnalysis({
      Interlinear: null,
      'Cross-references': null,
      'Historical Context': null,
      Notes: userNotes
    });

    setActiveTab('Interlinear');
    setErrorMsg('');
  }, [verseRef]);

  /** ----------------------------
   * LOAD A TAB (only if null)
   ------------------------------ */
  const loadTab = async (tab: Tab) => {
    if (tab === 'Notes') return;

    // Only fetch when content is NULL (never loaded)
    if (analysis[tab] !== null) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await getVerseAnalysis(verseRef, tab);
      setAnalysis(prev => ({ ...prev, [tab]: result }));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load content.');
    } finally {
      setLoading(false);
    }
  };

  /** ----------------------------
   * ENSURE INTERLINEAR AUTO-LOADS
   ------------------------------ */
  useEffect(() => {
    if (activeTab === 'Interlinear' && analysis.Interlinear === null) {
      loadTab('Interlinear');
    }
  }, [activeTab, analysis.Interlinear]);

  /** ----------------------------
   * LOAD ANY TAB WHEN CLICKED
   ------------------------------ */
  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  const tabs: Tab[] = ['Interlinear', 'Cross-references', 'Historical Context', 'Notes'];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col relative">
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 z-10 p-2"
          aria-label="Close verse tools"
        >
          <i className="fas fa-times text-2xl"></i>
        </button>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">{verseRef.book} {verseRef.chapter}:{verseRef.verse}</h2>
        <p className="mt-1 text-gray-700 dark:text-gray-300 italic">"{englishText}"</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-grow overflow-y-auto pr-2">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans">
            {activeTab === 'Notes' ? (
              <textarea 
                className="w-full h-64 p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your personal notes on this verse..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
              />
            ) : (
              <>
                {errorMsg ? (
                  <p className="text-red-500">{errorMsg}</p>
                ) : (
                  <p>{analysis[activeTab] ?? "No content yet."}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
