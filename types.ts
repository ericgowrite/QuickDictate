/**
 * @file This file contains the core TypeScript types and enums used throughout the application.
 */

/**
 * Represents a single transcribed and categorized note.
 */
export interface Note {
    /** A unique identifier for the note, generated using crypto.randomUUID(). */
    id: string;
    /** The main transcribed content of the note. */
    text: string;
    /** The category assigned to the note by the AI model. */
    category: string;
    /** The date and time when the note was saved. */
    timestamp: Date;
    /** An optional flag to indicate if the note has been sent via email. */
    emailSent?: boolean;
}

/**
 * Defines the possible states of the application's main state machine.
 */
export enum AppState {
    /** The application is idle, waiting for user input. */
    IDLE = 'IDLE',
    /** The application is actively listening to the microphone and transcribing. */
    RECORDING = 'RECORDING',
    /** The application is processing the transcription (e.g., categorizing). */
    PROCESSING = 'PROCESSING',
    /** The user is reviewing the transcribed note before saving or discarding. */
    REVIEW = 'REVIEW',
}

/**
 * Represents the user's configurable settings.
 */
export interface UserSettings {
    /** A flag indicating whether the user has completed the initial setup. */
    onboardingComplete: boolean;
    /** The primary email address for one-click sending of notes. */
    defaultEmail: string;
    /** A list of secondary email addresses for sending notes. */
    otherEmails: string[];
    /** The list of categories the AI will use to classify notes. */
    categories: string[];
}