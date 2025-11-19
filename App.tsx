
import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { NavigationPane } from './components/NavigationPane';
import { ScriptureDisplay } from './components/ScriptureDisplay';
import { VerseTools } from './components/VerseTools';
import { Chatbot } from './components/Chatbot';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SearchResultDisplay } from './components/SearchResultDisplay';
import { useLocalStorage } from './hooks/useLocalStorage';
import { fetchChapter, BIBLE_META, findBookMetadata, fetchVersesByReferences } from './services/bibleService';
import { searchBibleByKeyword } from './services/geminiService';
import type { Verse, VerseReference, FullVerse, ParsedReference } from './types';

const App: React.FC = () => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState(true);
  const [verseError, setVerseError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useLocalStorage<string>('selectedBook', 'Genesis');
  const [selectedChapter, setSelectedChapter] = useLocalStorage<number>('selectedChapter', 1);
  const [selectedVerseRef, setSelectedVerseRef] = useState<VerseReference | null>(null);

  const [englishVersion, setEnglishVersion] = useLocalStorage<string>('englishVersion', 'ESV');
  const [showWelcome, setShowWelcome] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);

  // State for the new multi-verse search view
  const [isSearchView, setIsSearchView] = useState(false);
  const [searchResults, setSearchResults] = useState<FullVerse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!sessionStorage.getItem('welcomeShown')) {
      setShowWelcome(true);
    }
  }, []);
  
  // Effect to sync state TO the URL hash for browser history
  useEffect(() => {
    // Only update hash for standard navigation view, not search view
    if (isSearchView) return;

    let desiredHash = `#/${encodeURIComponent(selectedBook)}/${selectedChapter}`;
    if (selectedVerseRef && selectedVerseRef.book === selectedBook && selectedVerseRef.chapter === selectedChapter) {
        desiredHash += `/${selectedVerseRef.verse}`;
    }
    // Only update if the hash is different to prevent pushing duplicate history entries
    if (window.location.hash !== desiredHash) {
        window.location.hash = desiredHash;
    }
  }, [selectedBook, selectedChapter, selectedVerseRef, isSearchView]);

  // Effect to sync state FROM the URL hash on initial load and back/forward navigation
  useEffect(() => {
    const parseHashAndSetState = (hash: string) => {
        // When navigating via hash, we should exit search view.
        setIsSearchView(false);

        const parts = hash.replace(/^#\/?/, '').split('/');
        if (parts.length < 2 || !parts[0]) return;

        const bookName = decodeURIComponent(parts[0].replace(/\+/g, ' '));
        const chapterNum = parseInt(parts[1], 10);
        const verseNum = parts[2] ? parseInt(parts[2], 10) : null;
        
        const bookMeta = findBookMetadata(bookName);
        if (!bookMeta || isNaN(chapterNum) || chapterNum < 1 || chapterNum > bookMeta.chapters) {
            console.warn("Invalid reference in URL hash:", hash);
            return;
        }

        setSelectedBook(bookMeta.name);
        setSelectedChapter(chapterNum);
        
        if (verseNum) {
            const newVerseRef = { book: bookMeta.name, chapter: chapterNum, verse: verseNum };
            setSelectedVerseRef(newVerseRef);
            if (window.innerWidth < 768) {
                setIsToolsModalOpen(true);
            }
        } else {
            setSelectedVerseRef(null);
            setIsToolsModalOpen(false);
        }
    };
    
    const handleHashChange = () => {
        parseHashAndSetState(window.location.hash);
    };
    
    // On initial load, prioritize URL over localStorage
    if (window.location.hash) {
        parseHashAndSetState(window.location.hash);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => {
        window.removeEventListener('hashchange', handleHashChange);
    };
  }, [setSelectedBook, setSelectedChapter]);

  useEffect(() => {
    // Don't load chapter if we are in search view
    if (isSearchView) return;

    const loadVerses = async () => {
      setIsLoadingVerses(true);
      setVerseError(null);
      try {
        const fetchedVerses = await fetchChapter(selectedBook, selectedChapter);
        setVerses(fetchedVerses);
      } catch (error) {
        setVerseError('Failed to load chapter. Please check your connection and try again.');
        console.error(error);
        setVerses([]);
      } finally {
        setIsLoadingVerses(false);
      }
    };
    loadVerses();
  }, [selectedBook, selectedChapter, isSearchView]);

  const handleBookChange = useCallback((book: string) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerseRef(null);
    setIsToolsModalOpen(false);
  }, [setSelectedBook, setSelectedChapter]);

  const handleChapterChange = useCallback((chapter: number) => {
    setSelectedChapter(chapter);
    setSelectedVerseRef(null);
    setIsToolsModalOpen(false);
  }, [setSelectedChapter]);

  const handleVerseSelect = useCallback((verseNum: number) => {
    setSelectedVerseRef({ book: selectedBook, chapter: selectedChapter, verse: verseNum });
    if (window.innerWidth < 768) {
        setIsToolsModalOpen(true);
    }
  }, [selectedBook, selectedChapter]);

  const handleWelcomeDismiss = () => {
    setShowWelcome(false);
    sessionStorage.setItem('welcomeShown', 'true');
  };

  const handleNextChapter = useCallback(() => {
    const bookMeta = BIBLE_META.find(b => b.name === selectedBook);
    if (!bookMeta) return;

    if (selectedChapter < bookMeta.chapters) {
      handleChapterChange(selectedChapter + 1);
    } else {
      const currentBookIndex = BIBLE_META.findIndex(b => b.name === selectedBook);
      if (currentBookIndex < BIBLE_META.length - 1) {
        const nextBook = BIBLE_META[currentBookIndex + 1];
        handleBookChange(nextBook.name);
      }
    }
  }, [selectedBook, selectedChapter, handleBookChange, handleChapterChange]);

  const handlePreviousChapter = useCallback(() => {
    if (selectedChapter > 1) {
      handleChapterChange(selectedChapter - 1);
    } else {
      const currentBookIndex = BIBLE_META.findIndex(b => b.name === selectedBook);
      if (currentBookIndex > 0) {
        const prevBook = BIBLE_META[currentBookIndex - 1];
        setSelectedBook(prevBook.name);
        setSelectedChapter(prevBook.chapters);
        setSelectedVerseRef(null);
        setIsToolsModalOpen(false);
      }
    }
  }, [selectedBook, selectedChapter, handleChapterChange, setSelectedBook]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
            return;
        }
        
        // Disable arrow key navigation when in search view
        if (isSearchView) return;

        if (event.key === 'ArrowRight') {
            handleNextChapter();
        } else if (event.key === 'ArrowLeft') {
            handlePreviousChapter();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNextChapter, handlePreviousChapter, isSearchView]);
  
  const parseReferencesFromString = (refString: string): ParsedReference[] => {
    const referenceRegex = /((\d\s*)?[a-zA-Z\s]+)\s+(\d+):(\d+)(?:-(\d+))?/i;
    const parts = refString.split(/[,;]/g);
    const parsedReferences: ParsedReference[] = [];

    for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        const match = trimmedPart.match(referenceRegex);
        if (!match) continue; 

        const bookQuery = match[1].trim();
        const bookMeta = findBookMetadata(bookQuery); 
        if (!bookMeta) continue; 

        parsedReferences.push({
            book: bookMeta.name,
            chapter: parseInt(match[3], 10),
            startVerse: parseInt(match[4], 10),
            endVerse: match[5] ? parseInt(match[5], 10) : undefined,
        });
    }
    return parsedReferences;
  };
  
  const handleSearch = async (event: FormEvent) => {
      event.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      setSearchError(null);

    // Extract references from input (supports single or multiple)
      const parsedReferences = parseReferencesFromString(query);

    // ----------------------------------------------------------
    // CASE A — MULTIPLE REFERENCES (display results only)
    // ----------------------------------------------------------
      if (parsedReferences.length > 1) {
          setIsSearching(true);
          try {
              const results = await fetchVersesByReferences(parsedReferences);
              setSearchResults(results);
              setIsSearchView(true);       // show results screen
          } catch (err) {
              console.error(err);
              setSearchError("Failed to fetch results.");
          } finally {
              setIsSearching(false);
              setSearchQuery('');
          }
          return;
      }

    // ----------------------------------------------------------
    // CASE B — SINGLE REFERENCE (navigate only)
    // ----------------------------------------------------------

      if (parsedReferences.length === 1) {
          const ref = parsedReferences[0];

          // Validate chapter
          const bookMeta = BIBLE_META.find(b => b.name === ref.book);
          if (!bookMeta || ref.chapter < 1 || ref.chapter > bookMeta.chapters) {
              setSearchError(`Invalid chapter for ${ref.book}.`);
              return;
          }

          // 1: Navigate to Book + Chapter
          setIsSearchView(false);
          setSelectedBook(ref.book);
          setSelectedChapter(ref.chapter);

          // 2: Navigate to verse if present
          if (ref.startVerse) {
              setSelectedVerseRef({
                  book: ref.book,
                  chapter: ref.chapter,
                  verse: ref.startVerse
              });
          } else {
              setSelectedVerseRef(null);
          }

          setSearchQuery('');
          return;
      }

    // ----------------------------------------------------------
    // CASE C — No valid references → keyword search
    // ----------------------------------------------------------

      setIsSearching(true);

      try {
          const referenceString = await searchBibleByKeyword(query);
          if (!referenceString || !referenceString.trim()) {
              setSearchError(`No verses found for "${query}".`);
              setSearchResults([]);
              setIsSearchView(true);
              return;
          }

          const keywordRefs = parseReferencesFromString(referenceString);
          if (keywordRefs.length === 0) {
              setSearchError(`Could not parse results for "${query}".`);
              setSearchResults([]);
              setIsSearchView(true);
              return;
          }

          const results = await fetchVersesByReferences(keywordRefs);
          setSearchResults(results);
          setIsSearchView(true);

      } catch (error) {
          console.error(error);
          setSearchError("An error occurred during keyword search.");
      } finally {
          setIsSearching(false);
          setSearchQuery('');
      }
  };

  
  const handleClearSearch = () => {
    setIsSearchView(false);
    setSearchResults([]);
    setSearchError(null);
  };

  const selectedBookMeta = BIBLE_META.find(b => b.name === selectedBook);
  const chapterCount = selectedBookMeta ? selectedBookMeta.chapters : 0;
  
  const selectedVerseData = selectedVerseRef ? verses.find(v => v.verse === selectedVerseRef.verse) : null;

  const isFirstChapterOfBible = selectedBook === 'Genesis' && selectedChapter === 1;
  const isLastChapterOfBible = selectedBook === 'Revelation' && selectedChapter === 22;


  return (
    <div className="flex flex-col h-screen font-sans">
      {showWelcome && <WelcomeScreen onDismiss={handleWelcomeDismiss} />}
      <header
        className="
          bg-white dark:bg-gray-800 p-3 shadow-md z-10 border-b border-gray-200 dark:border-gray-700
          flex flex-col md:flex-row md:items-center md:justify-between gap-3
        "
      >
        {/* TITLE BLOCK (Always left) */}
        <div
          className="
            flex items-center gap-4 ml-4 py-2 px-4
            bg-white dark:bg-gray-800 shadow-md rounded-xl
            transform transition-all duration-200 hover:shadow-lg hover:scale-[1.02]
          "
        >
          <div
            className="
              w-10 h-10 rounded-full
              bg-blue-600 dark:bg-blue-500
              flex items-center justify-center
              text-white shadow
            "
          >
            <i className="fas fa-book-open text-lg"></i>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              AI Bible Study Companion
            </h1>
            <span className="text-xs text-gray-600 dark:text-gray-400">by Joel Prem</span>
          </div>
        </div>





        {/* SEARCH BAR (Full width on mobile, right-aligned on mobile + desktop) */}
        <form
          onSubmit={handleSearch}
          className="
            w-full md:w-1/3 max-w-md
            flex justify-end
            px-4 md:px-0
          "
        >
          <div className="flex w-full md:w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (e.g., John 3:16 or 'faith')"
              className="
                bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-l-lg 
  focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white
  transform transition-all duration-200 hover:scale-[1.03]
              "
            />
            <button
              type="submit"
              className="
                p-2.5 text-sm font-medium text-white bg-blue-600 rounded-r-lg 
  border border-blue-600 hover:bg-blue-700 
  focus:ring-4 focus:outline-none focus:ring-blue-300 
  dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800
  transform transition-all duration-200 hover:scale-[1.03]
              "
            >
              <i className="fas fa-search"></i>
              <span className="sr-only">Search</span>
            </button>
          </div>
        </form>
      </header>


      <main className="flex-grow flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {isSearchView ? (
            <SearchResultDisplay
                results={searchResults}
                isLoading={isSearching}
                error={searchError}
                onClear={handleClearSearch}
                englishVersion={englishVersion}
            />
        ) : (
          <>
            <div className="w-full md:w-2/3 flex flex-col md:h-full">
              <NavigationPane
                books={BIBLE_META.map(b => b.name)}
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                chapterCount={chapterCount}
                onBookChange={handleBookChange}
                onChapterChange={handleChapterChange}
                englishVersion={englishVersion}
                onEnglishVersionChange={setEnglishVersion}
                onNextChapter={handleNextChapter}
                onPreviousChapter={handlePreviousChapter}
                isFirstChapterOfBible={isFirstChapterOfBible}
                isLastChapterOfBible={isLastChapterOfBible}
              />
              <ScriptureDisplay
                bookName={selectedBook}
                chapterNum={selectedChapter}
                verses={verses}
                isLoading={isLoadingVerses}
                error={verseError}
                englishVersion={englishVersion}
                onVerseSelect={handleVerseSelect}
                selectedVerseRef={selectedVerseRef}
                onNextChapter={handleNextChapter}
                onPreviousChapter={handlePreviousChapter}
              />
            </div>
            {/* Desktop Verse Tools */}
            <div className="w-full md:w-1/3 hidden md:block overflow-y-auto bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
              {selectedVerseRef && selectedVerseData ? (
                 <VerseTools verseRef={selectedVerseRef} verseData={selectedVerseData} englishVersion={englishVersion} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
                  <p>Select a verse to see detailed tools like interlinear text, cross-references, and study notes.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      
      {/* Mobile Verse Tools Modal */}
      {isToolsModalOpen && selectedVerseRef && selectedVerseData && (
        <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-60 z-30" 
            onClick={() => setIsToolsModalOpen(false)}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="fixed bottom-0 left-0 right-0 h-[85vh] bg-white dark:bg-gray-800 rounded-t-2xl shadow-lg overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                 <VerseTools 
                    verseRef={selectedVerseRef} 
                    verseData={selectedVerseData} 
                    englishVersion={englishVersion}
                    onClose={() => setIsToolsModalOpen(false)}
                 />
            </div>
        </div>
      )}

      <footer className="bg-gray-200 dark:bg-gray-800 text-center p-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700">
        Contact: joelpremtej@gmail.com
      </footer>
      <Chatbot
        selectedBook={selectedBook}
        selectedChapter={selectedChapter}
        selectedVerseRef={selectedVerseRef}
        verses={verses}
        englishVersion={englishVersion}
      />
    </div>
  );
};

export default App;
