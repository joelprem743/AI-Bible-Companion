
import React from 'react';

interface NavigationPaneProps {
  books: string[];
  selectedBook: string;
  selectedChapter: number;
  chapterCount: number;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  englishVersion: string;
  onEnglishVersionChange: (version: string) => void;
  onNextChapter: () => void;
  onPreviousChapter: () => void;
  isFirstChapterOfBible: boolean;
  isLastChapterOfBible: boolean;
}

export const NavigationPane: React.FC<NavigationPaneProps> = React.memo(({
  books,
  selectedBook,
  selectedChapter,
  chapterCount,
  onBookChange,
  onChapterChange,
  englishVersion,
  onEnglishVersionChange,
  onNextChapter,
  onPreviousChapter,
  isFirstChapterOfBible,
  isLastChapterOfBible,
}) => {
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
  const englishVersions = ['ESV', 'KJV', 'NIV'];

  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
    {/* Desktop Layout */}
    <div className="hidden md:flex items-center px-4 py-2 gap-4">

      {/* LEFT ARROW */}
      <button
        onClick={onPreviousChapter}
        disabled={isFirstChapterOfBible}
        className="p-2.5 text-sm bg-gray-700 text-gray-300 rounded-lg border border-gray-600 
                   hover:bg-gray-600 hover:scale-[1.05] hover:shadow-lg
  disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i className="fas fa-chevron-left"></i>
      </button>

      {/* BOOK + CHAPTER SIDE BY SIDE */}
      <div className="flex items-center gap-4">
    
        {/* Book */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">Book</span>
          <select
            value={selectedBook}
            onChange={(e) => onBookChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5 transform transition-all duration-200 hover:bg-gray-600 hover:scale-[1.05] hover:shadow-lg
  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {books.map(book => <option key={book} value={book}>{book}</option>)}
          </select>
        </div>

        {/* Chapter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">Chapter</span>
          <select
            value={selectedChapter}
            onChange={(e) => onChapterChange(Number(e.target.value))}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5 transform transition-all duration-200 hover:bg-gray-600 hover:scale-[1.05] hover:shadow-lg
  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>

      </div>

      {/* VERSION DROPDOWN ON FAR RIGHT */}
      <div className="flex items-center gap-3 ml-auto">   
    <span className="text-sm text-gray-300">Version</span>
    <select
      value={englishVersion}
      onChange={(e) => onEnglishVersionChange(e.target.value)}
      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5 transform transition-all duration-200 hover:bg-gray-600 hover:scale-[1.05] hover:shadow-lg
  disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {['ESV','KJV','NIV'].map(v => <option key={v} value={v}>{v}</option>)}
    </select>
      </div>

      {/* RIGHT ARROW */}
      <button   
    onClick={onNextChapter}
    disabled={isLastChapterOfBible}
    className="p-2.5 text-sm bg-gray-700 text-gray-300 rounded-lg border border-gray-600 
               hover:bg-gray-600 hover:scale-[1.05] hover:shadow-lg
  disabled:opacity-50 disabled:cursor-not-allowed"
      >   
    <i className="fas fa-chevron-right"></i>
      </button>

    </div>

    

      {/* Mobile Layout */}
      <div className="md:hidden space-y-2">
        {/* Top Row: Navigation Arrows with Book */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Arrow */}
          <button
            onClick={onPreviousChapter}
            disabled={isFirstChapterOfBible}
            className="p-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg border border-gray-300
  dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600
  transform transition-all duration-200 ease-out
  hover:bg-gray-200 dark:hover:bg-gray-600
  hover:scale-[1.05] hover:shadow-md
  active:scale-[0.97]
  disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous Chapter"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          {/* Center: Book Selector with Label */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <label htmlFor="book-select-mobile" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Book</label>
            <select
              id="book-select-mobile"
              value={selectedBook}
              onChange={(e) => onBookChange(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transform transition-all duration-200 ease-out
hover:scale-[1.05] hover:shadow-md active:scale-[0.97]
"
              aria-label="Select a book"
            >
              {books.map(book => <option key={book} value={book}>{book}</option>)}
            </select>
          </div>

          {/* Right Arrow */}
          <button
            onClick={onNextChapter}
            disabled={isLastChapterOfBible}
            className="p-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg border border-gray-300
  dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600
  transform transition-all duration-200 ease-out
  hover:bg-gray-200 dark:hover:bg-gray-600
  hover:scale-[1.05] hover:shadow-md
  active:scale-[0.97]
  disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next Chapter"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {/* Bottom Row: Chapter and Version Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 flex-1">
            <label htmlFor="chapter-select-mobile" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Chapter</label>
            <select
              id="chapter-select-mobile"
              value={selectedChapter}
              onChange={(e) => onChapterChange(Number(e.target.value))}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transform transition-all duration-200 ease-out
hover:scale-[1.05] hover:shadow-md active:scale-[0.97]
"
              aria-label="Select a chapter"
            >
              {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1">
            <label htmlFor="version-select-mobile" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Version</label>
            <select
              id="version-select-mobile"
              value={englishVersion}
              onChange={(e) => onEnglishVersionChange(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transform transition-all duration-200 ease-out
hover:scale-[1.05] hover:shadow-md active:scale-[0.97]
"
              aria-label="Select English version"
            >
              {englishVersions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});