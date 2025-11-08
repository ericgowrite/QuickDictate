import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { categorizeNote } from './services/geminiService';
import { Note, AppState, UserSettings } from './types';
import { createBlob } from './utils/audioUtils';
import { DictationButton } from './components/DictationButton';
import { CurrentNoteCard } from './components/CurrentNoteCard';
import { SavedNotesList } from './components/SavedNotesList';
import { Onboarding } from './components/Onboarding';
import { LoadingSpinner, LogoIcon } from './components/icons';

/**
 * Default user settings, used when no settings are found in localStorage.
 */
const defaultSettings: UserSettings = {
  onboardingComplete: false,
  defaultEmail: '',
  otherEmails: [],
  categories: ["Work", "Podcast Notes", "Ideas", "To-Do", "Follow-ups"]
};

/**
 * The main application component for QuickNotes AI.
 * It manages the application's state, handles audio recording and processing,
 * and orchestrates the UI components.
 * @returns {React.FC} The root component of the application.
 */
const App: React.FC = () => {
    /** Manages the current state of the application (e.g., IDLE, RECORDING). */
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    /** Holds the real-time transcription text from the microphone. */
    const [currentTranscription, setCurrentTranscription] = useState<string>('');
    /** Stores the processed and categorized note before it's saved or discarded. */
    const [currentNote, setCurrentNote] = useState<Omit<Note, 'id' | 'timestamp'> | null>(null);
    /** An array of all notes saved by the user. */
    const [savedNotes, setSavedNotes] = useState<Note[]>([]);
    /** Stores any error messages to be displayed to the user. */
    const [error, setError] = useState<string | null>(null);
    /** Tracks whether the app has finished its initial load from localStorage. */
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    /** Holds the user's settings, loaded from and persisted to localStorage. */
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    /** A flag to track if the current note was just emailed, for display purposes. */
    const [justEmailed, setJustEmailed] = useState<boolean>(false);

    /** A ref to hold the promise that resolves to the Gemini LiveSession. */
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    /** A ref for the browser's AudioContext to manage audio processing. */
    const audioContextRef = useRef<AudioContext | null>(null);
    /** A ref for the ScriptProcessorNode used to handle audio data chunks. */
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    /** A ref for the audio source from the user's media stream (microphone). */
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    /**
     * Effect hook to load user settings and saved notes from localStorage on initial app load.
     */
    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem('quickNotesSettings');
            if (storedSettings) {
                setSettings(JSON.parse(storedSettings));
            }
            const storedNotes = localStorage.getItem('quickNotesNotes');
            if (storedNotes) {
                const parsedNotes = JSON.parse(storedNotes).map((note: Note) => ({
                    ...note,
                    timestamp: new Date(note.timestamp),
                }));
                setSavedNotes(parsedNotes);
            }
        } catch (e) {
            console.error("Failed to parse data from localStorage", e);
        }
        setIsInitialized(true);
    }, []);

    /**
     * Effect hook to persist the `savedNotes` array to localStorage whenever it changes.
     */
    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem('quickNotesNotes', JSON.stringify(savedNotes));
            } catch (e) {
                console.error("Failed to save notes to localStorage", e);
            }
        }
    }, [savedNotes, isInitialized]);

    /**
     * Callback function to handle the completion of the onboarding process.
     * Saves the new settings to state and localStorage.
     * @param {Omit<UserSettings, 'onboardingComplete'>} newSettings - The settings collected from the onboarding form.
     */
    const handleOnboardingComplete = (newSettings: Omit<UserSettings, 'onboardingComplete'>) => {
        const finalSettings = { ...newSettings, onboardingComplete: true };
        setSettings(finalSettings);
        try {
            localStorage.setItem('quickNotesSettings', JSON.stringify(finalSettings));
        } catch (e) {
            console.error("Failed to save settings to localStorage", e);
        }
    };

    /**
     * Toggles the recording state. When starting, it initializes the Gemini Live API session
     * and sets up the audio processing pipeline. When stopping, it closes the session,
     * processes the final transcription, and moves to the review state.
     */
    const handleToggleRecording = useCallback(async () => {
        if (appState === AppState.RECORDING) {
            setAppState(AppState.PROCESSING);
            // Stop recording logic
            if (sessionPromiseRef.current) {
                const session = await sessionPromiseRef.current;
                session.close();
                sessionPromiseRef.current = null;
            }
            if (audioContextRef.current && scriptProcessorRef.current && mediaStreamSourceRef.current) {
                scriptProcessorRef.current.disconnect();
                mediaStreamSourceRef.current.disconnect();
                if (audioContextRef.current.state !== 'closed') {
                    await audioContextRef.current.close();
                }
            }
            
            // Process the transcribed text if it's not empty
            if (currentTranscription.trim().length > 0) {
                try {
                    const category = await categorizeNote(currentTranscription, settings.categories);
                    setCurrentNote({ text: currentTranscription, category });
                    setAppState(AppState.REVIEW);
                } catch (e) {
                    setError('Failed to categorize note. Please try again.');
                    setAppState(AppState.IDLE);
                } finally {
                    setCurrentTranscription('');
                }
            } else {
                 setCurrentTranscription('');
                 setAppState(AppState.IDLE);
            }
        } else {
            // Start recording logic
            setError(null);
            setCurrentNote(null);
            setCurrentTranscription('');
            setAppState(AppState.RECORDING);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                
                sessionPromiseRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                             mediaStreamSourceRef.current = audioContextRef.current!.createMediaStreamSource(stream);
                             scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                             
                             scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
                                 const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                 const pcmBlob = createBlob(inputData);
                                 if (sessionPromiseRef.current) {
                                     sessionPromiseRef.current.then((session) => {
                                         session.sendRealtimeInput({ media: pcmBlob });
                                     });
                                 }
                             };
                             mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                             scriptProcessorRef.current.connect(audioContextRef.current!.destination);
                        },
                        onmessage: (message: LiveServerMessage) => {
                            if (message.serverContent?.inputTranscription) {
                                const text = message.serverContent.inputTranscription.text;
                                setCurrentTranscription(prev => {
                                    let newText = prev + text;
                                    // Replace period followed by a space with period and newline to create a list format.
                                    newText = newText.replace(/\. /g, '.\n');
                                    return newText;
                                });
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                            console.error('Gemini Live API Error:', e);
                            setError('An error occurred during dictation.');
                            setAppState(AppState.IDLE);
                        },
                        onclose: () => {
                            stream.getTracks().forEach(track => track.stop());
                        },
                    },
                    config: {
                        inputAudioTranscription: {},
                        responseModalities: [Modality.AUDIO],
                    },
                });

            } catch (err) {
                console.error("Failed to start recording:", err);
                setError("Could not access microphone. Please grant permission and try again.");
                setAppState(AppState.IDLE);
            }
        }
    }, [appState, currentTranscription, settings.categories]);

    /**
     * Saves the current note to the `savedNotes` list, assigning it a unique ID and timestamp.
     * Also prepends the category to the note text.
     */
    const handleSaveNote = () => {
        if (currentNote) {
            const newNote: Note = {
                ...currentNote,
                id: crypto.randomUUID(),
                timestamp: new Date(),
                emailSent: justEmailed,
                text: `${currentNote.category}:\n\n${currentNote.text}`,
            };
            setSavedNotes(prev => [newNote, ...prev]);
            resetCurrentNote();
        }
    };
    
    /**
     * Composes and triggers a `mailto:` link to send the current note via the user's default email client.
     * @param {string} [email] - An optional email address to send to. If not provided, the default email from settings is used.
     */
    const handleEmailNote = (email?: string) => {
        if (!currentNote) return;

        setJustEmailed(true);
        const subject = `Note: ${currentNote.category}`;
        const body = `${currentNote.category}:\n\n${currentNote.text}`;
        const recipient = email || settings.defaultEmail;

        if (recipient) {
            window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        } else {
            alert("Please set a default email in your settings.");
        }
    };

    /**
     * Deletes a saved note from the list by its ID.
     * @param {string} id - The unique identifier of the note to be deleted.
     */
    const handleDeleteSavedNote = (id: string) => {
        setSavedNotes(notes => notes.filter(note => note.id !== id));
    };

    /**
     * Resets the current note and application state back to IDLE.
     * Used after saving, emailing, or discarding a note.
     */
    const resetCurrentNote = () => {
        setCurrentNote(null);
        setAppState(AppState.IDLE);
        setJustEmailed(false);
    }
    
    /**
     * Effect hook for cleanup. Ensures that any active session or audio context
     * is closed when the component unmounts.
     */
    useEffect(() => {
        return () => {
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => session.close());
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Display a loading spinner until the app is initialized from localStorage.
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // Display the onboarding screen if the user hasn't completed it yet.
    if (!settings.onboardingComplete) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    const allEmails = [settings.defaultEmail, ...settings.otherEmails].filter(Boolean);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col font-sans">
            <header className="p-4 flex items-center justify-center space-x-3 border-b border-gray-700/50">
                <LogoIcon/>
                <h1 className="text-2xl font-bold text-white tracking-tight">QuickNotes AI</h1>
            </header>

            <main className="flex-grow flex flex-col p-4 md:p-6 space-y-4 overflow-y-auto">
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                    {appState === AppState.IDLE && !currentNote && (
                        <div className="text-gray-400">
                            <p className="text-lg">Tap the microphone to start dictating.</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 bg-red-900/20 p-3 rounded-lg">{error}</p>}
                    {appState === AppState.RECORDING && (
                         <p className="text-xl md:text-2xl text-gray-300 p-4 min-h-[120px] whitespace-pre-wrap text-left w-full max-w-2xl">{currentTranscription || 'Listening...'}</p>
                    )}
                    {appState === AppState.PROCESSING && (
                        <div className="flex flex-col items-center space-y-2 text-gray-400">
                           <LoadingSpinner />
                           <p>Categorizing your note...</p>
                        </div>
                    )}
                    {appState === AppState.REVIEW && currentNote && (
                        <CurrentNoteCard 
                            note={currentNote} 
                            onSave={handleSaveNote} 
                            onEmail={handleEmailNote}
                            onDiscard={resetCurrentNote}
                            emailAddresses={allEmails}
                        />
                    )}
                </div>

                <SavedNotesList notes={savedNotes} onDelete={handleDeleteSavedNote}/>
            </main>

            <footer className="sticky bottom-0 bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700/50 flex flex-col items-center justify-center">
                <DictationButton
                    isRecording={appState === AppState.RECORDING}
                    onClick={handleToggleRecording}
                    disabled={appState === AppState.PROCESSING}
                />
            </footer>
        </div>
    );
};

export default App;