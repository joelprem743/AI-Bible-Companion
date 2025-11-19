import type { Verse, ParsedReference, FullVerse, BookMetadata } from '../types';
import { BIBLE_META_WITH_VERSE_COUNTS } from '../data/bibleMetaWithVerseCounts';
// FIX: Import Telugu bible data from a TypeScript module to ensure browser compatibility.
import { teluguBibleData } from '../data/telugubible.ts';

const levenshtein = (s1: string, s2: string): number => {
    if (s1.length < s2.length) { return levenshtein(s2, s1); }
    if (s2.length === 0) { return s1.length; }
    let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
        let currentRow = [i + 1];
        for (let j = 0; j < s2.length; j++) {
            let insertions = previousRow[j + 1] + 1;
            let deletions = currentRow[j] + 1;
            let substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
            currentRow.push(Math.min(insertions, deletions, substitutions));
        }
        previousRow = currentRow;
    }
    return previousRow[s2.length];
};

// --- BIBLE ABBREVIATIONS (used for search) ---

const bookNameToAbbreviation: { [key: string]: string } = {
    'Genesis': 'Gen', 'Exodus': 'Exod', 'Leviticus': 'Lev', 'Numbers': 'Num', 'Deuteronomy': 'Deut', 'Joshua': 'Josh', 'Judges': 'Judg', 'Ruth': 'Ruth', '1 Samuel': '1 Sam', '2 Samuel': '2 Sam', '1 Kings': '1 Kgs', '2 Kings': '2 Kgs', '1 Chronicles': '1 Chr', '2 Chronicles': '2 Chr', 'Ezra': 'Ezra', 'Nehemiah': 'Neh', 'Esther': 'Esth', 'Job': 'Job', 'Psalms': 'Ps', 'Proverbs': 'Prov', 'Ecclesiastes': 'Eccl', 'Song of Solomon': 'Song', 'Isaiah': 'Isa', 'Jeremiah': 'Jer', 'Lamentations': 'Lam', 'Ezekiel': 'Ezek', 'Daniel': 'Dan', 'Hosea': 'Hos', 'Joel': 'Joel', 'Amos': 'Amos', 'Obadiah': 'Obad', 'Jonah': 'Jonah', 'Micah': 'Mic', 'Nahum': 'Nah', 'Habakkuk': 'Hab', 'Zephaniah': 'Zeph', 'Haggai': 'Hag', 'Zechariah': 'Zech', 'Malachi': 'Mal', 'Matthew': 'Matt', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John', 'Acts': 'Acts', 'Romans': 'Rom', '1 Corinthians': '1 Cor', '2 Corinthians': '2 Cor', 'Galatians': 'Gal', 'Ephesians': 'Eph', 'Philippians': 'Phil', 'Colossians': 'Col', '1 Thessalonians': '1 Thess', '2 Thessalonians': '2 Thess', '1 Timothy': '1 Tim', '2 Timothy': '2 Tim', 'Titus': 'Titus', 'Philemon': 'Phlm', 'Hebrews': 'Heb', 'James': 'Jas', '1 Peter': '1 Pet', '2 Peter': '2 Pet', '1 John': '1 John', '2 John': '2 John', '3 John': '3 John', 'Jude': 'Jude', 'Revelation': 'Rev'
};


// --- LOCAL TELUGU BIBLE DATA INTEGRATION ---

// FIX: Define types for the new nested JSON structure and process it accordingly.
interface TeluguVerse {
    Verseid: string;
    Verse: string;
}

interface TeluguChapter {
    Verse: TeluguVerse[];
}

interface TeluguBook {
    Chapter: TeluguChapter[];
}

interface TeluguBible {
    Book: TeluguBook[];
}

const typedTeluguBibleData = teluguBibleData as unknown as TeluguBible;

// Create a map of book names to their index for quick lookup, assuming the order in BIBLE_META and the JSON file is the same.
const bookNameToIndexMap = new Map<string, number>();
BIBLE_META_WITH_VERSE_COUNTS.forEach((book, index) => {
    bookNameToIndexMap.set(book.name, index);
});


/**
 * Retrieves a Telugu verse from the local data using book, chapter, and verse number.
 * @returns The Telugu verse text or undefined if not found.
 */
function getTeluguVerse(book: string, chapter: number, verse: number): string | undefined {
    // FIX: Use a pre-built map for efficient book index lookup.
    const bookIndex = bookNameToIndexMap.get(book);

    if (bookIndex === undefined) {
        return undefined;
    }

    const chapterIndex = chapter - 1;
    const verseIndex = verse - 1;
    
    // FIX: Access the deeply nested verse data with optional chaining and a try-catch for safety.
    try {
        const verseData = typedTeluguBibleData.Book[bookIndex]?.Chapter[chapterIndex]?.Verse[verseIndex];
        return verseData?.Verse;
    } catch (e) {
        console.error(`Error accessing Telugu verse: ${book} ${chapter}:${verse}`, e);
        return undefined;
    }
}


// --- BIBLE-API.COM INTEGRATION (for English) ---

interface BibleApiResponseVerse {
    book_id: string; book_name: string; chapter: number; verse: number; text: string;
}

interface BibleApiResponse {
    reference: string; verses: BibleApiResponseVerse[]; text: string; translation_id: string; translation_name: string; translation_note: string;
}

const API_BASE_URL = 'https://bible-api.com/';

export const fetchChapter = async (book: string, chapter: number): Promise<Verse[]> => {
    const fetchTranslation = (version: string): Promise<BibleApiResponse> =>
        fetch(`${API_BASE_URL}${book} ${chapter}?translation=${version}`).then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for ${version}`);
            return res.json() as Promise<BibleApiResponse>;
        });

    try {
        const [webData, kjvData] = await Promise.all([
             fetchTranslation('web'), // Used for ESV and NIV as a fallback
             fetchTranslation('kjv'),
        ]);

        if (!kjvData.verses || kjvData.verses.length === 0) {
             throw new Error(`No KJV verses found for ${book} ${chapter}`);
        }

        const mergedVerses: Verse[] = kjvData.verses.map(kjvVerse => {
            const webVerse = webData.verses.find(v => v.verse === kjvVerse.verse);
            // FIX: This function is now updated to handle the new JSON structure.
            const teluguVerse = getTeluguVerse(book, chapter, kjvVerse.verse);
            
            const kjvText = kjvVerse.text.replace(/\n/g, ' ').trim();
            const webText = webVerse ? webVerse.text.replace(/\n/g, ' ').trim() : kjvText;

            return {
                verse: kjvVerse.verse,
                text: {
                    KJV: kjvText,
                    ESV: webText,
                    NIV: webText,
                    ...(teluguVerse && { BSI_TELUGU: teluguVerse }),
                },
            };
        });

        return mergedVerses;

    } catch (error) {
        console.error("Failed to fetch chapter:", error);
        throw error;
    }
};

export const fetchVersesByReferences = async (references: ParsedReference[]): Promise<FullVerse[]> => {
    const fetchPromises = references.map(async (ref) => {
        const referenceString = ref.endVerse
            ? `${ref.book} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`
            : `${ref.book} ${ref.chapter}:${ref.startVerse}`;
        
        const fetchEnglish = (version: string): Promise<BibleApiResponse> =>
            fetch(`${API_BASE_URL}${referenceString}?translation=${version}`).then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for ${version} at ${referenceString}`);
                return res.json();
            });

        const [webData, kjvData] = await Promise.all([
            fetchEnglish('web'),
            fetchEnglish('kjv'),
        ]);

        if (!kjvData.verses || kjvData.verses.length === 0) {
            console.warn(`No KJV verses found for ${referenceString}`);
            return [];
        }

        const mergedVerses: FullVerse[] = kjvData.verses.map(kjvVerse => {
            // FIX: This function is now updated to handle the new JSON structure.
            const teluguVerse = getTeluguVerse(ref.book, ref.chapter, kjvVerse.verse);
            
            // FIX: Define webVerse by finding the corresponding verse in the webData response.
            const webVerse = webData.verses.find(v => v.verse === kjvVerse.verse);
            const kjvText = kjvVerse.text.replace(/\n/g, ' ').trim();
            const webText = webVerse ? webVerse.text.replace(/\n/g, ' ').trim() : kjvText;

            return {
                book: ref.book,
                chapter: ref.chapter,
                verse: kjvVerse.verse,
                text: {
                    KJV: kjvText,
                    ESV: webText,
                    NIV: webText,
                    ...(teluguVerse && { BSI_TELUGU: teluguVerse }),
                },
            };
        });
        return mergedVerses;
    });

    const results = await Promise.all(fetchPromises);
    return results.flat();
};


// --- SEARCH UTILITIES ---

const abbreviationToBookName: { [key: string]: string } = Object.entries(bookNameToAbbreviation)
  .reduce((acc, [name, abbr]) => {
    acc[abbr.toLowerCase().replace(/\s/g, '')] = name; // '1sam' -> '1 Samuel'
    acc[abbr.toLowerCase()] = name; // '1 sam' -> '1 Samuel'
    return acc;
  }, {} as { [key:string]: string });


// Create the old BIBLE_META format for compatibility with other components
export const BIBLE_META = BIBLE_META_WITH_VERSE_COUNTS.map(book => ({
    name: book.name,
    chapters: book.chapters.length,
}));

export const findBookMetadata = (query: string): { name: string; chapters: number } | null => {
    const cleanedQuery = query.trim().toLowerCase();
    const cleanedQueryNoSpace = cleanedQuery.replace(/\s/g, '');

    // Full name match
    const fullNameMatch = BIBLE_META.find(b => b.name.toLowerCase() === cleanedQuery);
    if (fullNameMatch) return fullNameMatch;

    // Abbreviation match
    const bookNameFromAbbr =
        abbreviationToBookName[cleanedQueryNoSpace] ||
        abbreviationToBookName[cleanedQuery];

    if (bookNameFromAbbr) {
        const bookMeta = BIBLE_META.find(b => b.name === bookNameFromAbbr);
        if (bookMeta) return bookMeta;
    }

    // Common variation
    if (cleanedQuery === 'song of songs') {
        return BIBLE_META.find(b => b.name === 'Song of Solomon') || null;
    }

    // Starts-with fallback
    const startsWithMatch = BIBLE_META.find(b =>
        b.name.toLowerCase().startsWith(cleanedQuery)
    );
    if (startsWithMatch) return startsWithMatch;

    return null;
}
