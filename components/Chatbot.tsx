
import React, { useState, useRef, useEffect } from 'react';
import type { Message, GroundingChunk, Verse, VerseReference } from '../types';
import { ChatMode } from '../types';
import { sendMessageToBot } from '../services/geminiService';

const BotMessage: React.FC<{ message: string | React.ReactNode; sources?: GroundingChunk[] }> = ({ message, sources }) => (
    <div className="flex items-start gap-2.5">
        <div className="flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700">
            <div className="text-sm font-normal text-gray-900 dark:text-white prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{message}</div>
            {sources && sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <h4 className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">Sources:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {/* FIX: Filter sources to ensure 'uri' is present before rendering the link, preventing invalid hrefs. */}
                        {sources.filter(source => source.web?.uri).map((source, index) => (
                           <li key={index} className="text-xs">
                               <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                                   {source.web.title || source.web.uri}
                               </a>
                           </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </div>
);

const UserMessage: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-start justify-end gap-2.5">
        <div className="flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 bg-blue-600 rounded-s-xl rounded-ee-xl dark:bg-blue-700">
            <p className="text-sm font-normal text-white">{message}</p>
        </div>
    </div>
);

interface ChatbotProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVerseRef: VerseReference | null;
  verses: Verse[];
  englishVersion: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ selectedBook, selectedChapter, selectedVerseRef, verses, englishVersion }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(ChatMode.STANDARD);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    
    let contextualizedInput = input;
    if (selectedVerseRef) {
      const verseData = verses.find(v => v.verse === selectedVerseRef.verse);
      const verseText = verseData?.text[englishVersion as keyof typeof verseData.text] || verseData?.text.KJV;
      if (verseText) {
        contextualizedInput = `Given the context of ${selectedVerseRef.book} ${selectedVerseRef.chapter}:${selectedVerseRef.verse}, which reads "${verseText}", please answer the following question: ${input}`;
      } else {
        contextualizedInput = `Regarding ${selectedVerseRef.book} ${selectedVerseRef.chapter}:${selectedVerseRef.verse}, please answer the following question: ${input}`;
      }
    } else if (selectedBook && selectedChapter) {
      contextualizedInput = `Regarding the chapter ${selectedBook} ${selectedChapter}, please answer the following question: ${input}`;
    }

    setInput('');
    setIsLoading(true);

    const { text: botResponseText, sources } = await sendMessageToBot(contextualizedInput, messages, chatMode);

    const botMessage: Message = { id: (Date.now() + 1).toString(), text: botResponseText, sender: 'bot', sources };
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 z-20"
        aria-label="Open Bible Bot"
      >
        <i className={`fas fa-${isOpen ? 'times' : 'comment-dots'}`}></i>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-5 w-[90vw] max-w-md h-[70vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out transform-gpu z-50">
          <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold">Advanced Bible Bot</h3>
            <select
                value={chatMode}
                onChange={(e) => setChatMode(e.target.value as ChatMode)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                >
                <option value={ChatMode.FAST}>Fast</option>
                <option value={ChatMode.STANDARD}>Standard</option>
                <option value={ChatMode.DEEP_THOUGHT}>Deep Thought</option>
            </select>
          </header>
          <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.map(msg =>
              msg.sender === 'user' ? <UserMessage key={msg.id} message={msg.text as string} /> : <BotMessage key={msg.id} message={msg.text} sources={msg.sources} />
            )}
            {isLoading && <BotMessage message={<div className="flex items-center space-x-2"><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div></div>} />}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask a theological question..."
                className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
