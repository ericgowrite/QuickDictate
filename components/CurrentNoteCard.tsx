import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { SaveIcon, TrashIcon, ChevronDownIcon, EmailIcon } from './icons';

/**
 * Props for the CurrentNoteCard component.
 */
interface CurrentNoteCardProps {
    /** The note object currently under review (without id or timestamp). */
    note: Omit<Note, 'id' | 'timestamp'>;
    /** Callback function to save the current note. */
    onSave: () => void;
    /** Callback function to email the current note. Can accept an optional email address. */
    onEmail: (email?: string) => void;
    /** Callback function to discard the current note. */
    onDiscard: () => void;
    /** A list of email addresses for the email dropdown menu. */
    emailAddresses: string[];
}

/**
 * A card component that displays the currently transcribed and categorized note.
 * It provides actions to save, email, or discard the note.
 *
 * @param {CurrentNoteCardProps} props The props for the component.
 * @returns {React.FC} The rendered card for the current note.
 */
export const CurrentNoteCard: React.FC<CurrentNoteCardProps> = ({ note, onSave, onEmail, onDiscard, emailAddresses }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Effect to handle clicks outside the dropdown menu to close it.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 my-4 border border-gray-700 animate-fade-in">
            <div className="flex justify-between items-center mb-3">
                <span className="inline-block bg-blue-500/20 text-blue-300 text-sm font-semibold px-3 py-1 rounded-full">{note.category}</span>
            </div>
            <p className="text-gray-200 text-left whitespace-pre-wrap mb-6">{note.text}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button onClick={onSave} className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors duration-200">
                    <SaveIcon />
                    Save Note
                </button>

                <div className="relative inline-flex rounded-lg shadow-sm w-full sm:w-auto" ref={dropdownRef}>
                    <button
                        onClick={() => onEmail()}
                        className="flex items-center justify-center gap-2 flex-grow px-5 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-l-lg font-semibold transition-colors duration-200"
                        title="Email this note"
                    >
                        <EmailIcon />
                        Email
                    </button>
                    <div className="relative">
                         <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="inline-flex items-center justify-center h-full px-3 py-3 bg-indigo-700 hover:bg-indigo-800 rounded-r-lg border-l border-indigo-500"
                            aria-haspopup="true"
                            aria-expanded={isDropdownOpen}
                        >
                            <span className="sr-only">Open options</span>
                            <ChevronDownIcon className="h-5 w-5" />
                        </button>
                         {isDropdownOpen && (
                            <div className="absolute right-0 bottom-full mb-2 w-56 origin-bottom-right rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <p className="px-4 pt-2 pb-1 text-xs text-gray-400">Email to...</p>
                                    {emailAddresses.map((email) => (
                                        <a
                                            key={email}
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onEmail(email);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 w-full text-left"
                                            role="menuitem"
                                        >
                                            <EmailIcon className="w-4 h-4 text-gray-400"/>
                                            {email}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                 
                <button onClick={onDiscard} className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors duration-200">
                    <TrashIcon />
                    Discard
                </button>
            </div>
        </div>
    );
};