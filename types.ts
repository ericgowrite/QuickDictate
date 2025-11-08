
export interface Note {
    id: string;
    text: string;
    category: string;
    timestamp: Date;
    emailSent?: boolean;
}

export enum AppState {
    IDLE = 'IDLE',
    RECORDING = 'RECORDING',
    PROCESSING = 'PROCESSING',
    REVIEW = 'REVIEW',
}

export interface UserSettings {
    onboardingComplete: boolean;
    defaultEmail: string;
    otherEmails: string[];
    categories: string[];
}
