import React from 'react';
import { Note } from '../types';
import { TrashIcon, CheckCircleIcon } from './icons';

/**
 * Props for the SavedNotesList component.
 */
interface SavedNotesListProps {
    /** An array of saved notes to display. */
    notes: Note[];
    /** Callback function to handle the deletion of a note. */
    onDelete: (id: string) => void;
}

/** Defines the desired display order for note categories. */
const categoryOrder = ["To-do", "Follow ups", "Ideas", "Notes"];

/**
 * A component that displays a list of saved notes, grouped by category.
 *
 * @param {SavedNotesListProps} props The props for the component.
 * @returns {React.FC | null} The rendered list of saved notes, or null if there are no notes.
 */
export const SavedNotesList: React.FC<SavedNotesListProps> = ({ notes, onDelete }) => {
    if (notes.length === 0) {
        return null;
    }

    // Group notes by their category.
    const groupedNotes = notes.reduce((acc, note) => {
        const category = note.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(note);
        return acc;
    }, {} as Record<string, Note[]>);

    // Sort the categories based on the predefined `categoryOrder`.
    const sortedCategories = Object.keys(groupedNotes).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <div className="w-full max-w-4xl mx-auto mt-8">
            <h2 className="text-xl font-semibold text-gray-300 mb-4 px-2">Saved Notes</h2>
            <div className="space-y-6">
                {sortedCategories.map(category => (
                    <div key={category}>
                        <h3 className="text-lg font-semibold text-blue-300 mb-2 pl-2 sticky top-0 bg-gray-900/80 backdrop-blur-sm py-2 z-10 border-b border-gray-700/50">
                            {category}
                        </h3>
                        <div className="space-y-3 pt-2">
                            {groupedNotes[category].map(note => (
                                <div key={note.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-start gap-4 transition-all hover:bg-gray-700/50">
                                    <div className="flex-grow">
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                                            <span className="text-xs text-gray-500">{note.timestamp.toLocaleString()}</span>
                                            {note.emailSent && (
                                                <span className="flex items-center gap-1 text-xs text-green-400">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                    Emailed
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-200 whitespace-pre-wrap">{note.text}</p>
                                    </div>
                                    <button onClick={() => onDelete(note.id)} className="text-gray-500 hover:text-red-400 p-2 rounded-full transition-colors flex-shrink-0">
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};