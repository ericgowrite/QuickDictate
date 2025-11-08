
import React from 'react';
import { Note } from '../types';
import { TrashIcon, CheckCircleIcon } from './icons';

interface SavedNotesListProps {
    notes: Note[];
    onDelete: (id: string) => void;
}

export const SavedNotesList: React.FC<SavedNotesListProps> = ({ notes, onDelete }) => {
    if (notes.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-4xl mx-auto mt-8">
            <h2 className="text-xl font-semibold text-gray-300 mb-4 px-2">Saved Notes</h2>
            <div className="space-y-3">
                {notes.map(note => (
                    <div key={note.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-start gap-4 transition-all hover:bg-gray-700/50">
                        <div className="flex-grow">
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{note.category}</span>
                                <span className="text-xs text-gray-500">{note.timestamp.toLocaleDateString()}</span>
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
    );
};
