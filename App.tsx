
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


const defaultSettings: UserSettings = {
  onboardingComplete: false,
  defaultEmail: '',
  otherEmails: [],
  categories: ["Work", "Podcast Notes", "Ideas", "To-Do", "Follow-ups"]
};


const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    const [currentTranscription, setCurrentTranscription] = useState<string>('');
    const [currentNote, setCurrentNote] = useState<Omit<Note, 'id' | 'timestamp'> | null>(null);
    const [savedNotes, setSavedNotes] = useState<Note[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [justEmailed, setJustEmailed] = useState<boolean>(false);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem('quickDictateSettings');
            if (storedSettings) {
                setSettings(JSON.parse(storedSettings));
            }
        } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
        }
        setIsInitialized(true);
    }, []);

    const handleOnboardingComplete = (newSettings: Omit<UserSettings, 'onboardingComplete'>) => {
        const finalSettings = { ...newSettings, onboardingComplete: true };
        setSettings(finalSettings);
        try {
            localStorage.setItem('quickDictateSettings', JSON.stringify(finalSettings));
        } catch (e) {
            console.error("Failed to save settings to localStorage", e);
        }
    };

    const handleToggleRecording = useCallback(async () => {
        if (appState === AppState.RECORDING) {
            setAppState(AppState.PROCESSING);
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

    const handleSaveNote = () => {
        if (currentNote) {
            const newNote: Note = {
                ...currentNote,
                id: crypto.randomUUID(),
                timestamp: new Date(),
                emailSent: justEmailed,
            };
            setSavedNotes(prev => [newNote, ...prev]);
            resetCurrentNote();
        }
    };
    
    const handleShareNote = async (email?: string) => {
        if (!currentNote) return;
    
        setJustEmailed(true);
        const subject = `Note: ${currentNote.category}`;
        const body = currentNote.text;
    
        // If a specific email is provided (from the dropdown), always use mailto:
        if (email) {
            window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            return;
        }
    
        // If no email is provided (main button), try the Web Share API first
        if (navigator.share) {
            try {
                await navigator.share({
                    title: subject,
                    text: body,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback to mailto: with the default email for browsers without Share API
            const defaultEmail = settings.defaultEmail;
            if (defaultEmail) {
                window.location.href = `mailto:${defaultEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            } else {
                // If no default email, prompt the user or handle error
                alert("Please set a default email in settings to use this feature on desktop.");
            }
        }
    };

    const handleDeleteSavedNote = (id: string) => {
        setSavedNotes(notes => notes.filter(note => note.id !== id));
    };

    const resetCurrentNote = () => {
        setCurrentNote(null);
        setAppState(AppState.IDLE);
        setJustEmailed(false);
    }
    
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

    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!settings.onboardingComplete) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    const allEmails = [settings.defaultEmail, ...settings.otherEmails].filter(Boolean);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col font-sans">
            <header className="p-4 flex items-center justify-center space-x-3 border-b border-gray-700/50">
                <LogoIcon/>
                <h1 className="text-2xl font-bold text-white tracking-tight">QuickDictate AI</h1>
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
                            onShare={handleShareNote}
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
