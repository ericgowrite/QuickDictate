
import React from 'react';
import { MicrophoneIcon, StopIcon } from './icons';

interface DictationButtonProps {
    isRecording: boolean;
    onClick: () => void;
    disabled?: boolean;
}

export const DictationButton: React.FC<DictationButtonProps> = ({ isRecording, onClick, disabled }) => {
    const buttonClass = isRecording
        ? 'bg-red-500 hover:bg-red-600'
        : 'bg-blue-500 hover:bg-blue-600';
    
    const disabledClass = 'disabled:bg-gray-600 disabled:cursor-not-allowed';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isRecording ? 'focus:ring-red-400' : 'focus:ring-blue-400'} ${buttonClass} ${disabledClass}`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
            {isRecording ? (
                <div className="relative w-12 h-12">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <StopIcon className="relative inline-flex w-12 h-12" />
                </div>
            ) : (
                <MicrophoneIcon className="w-10 h-10" />
            )}
        </button>
    );
};
