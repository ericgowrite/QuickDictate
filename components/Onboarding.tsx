
import React, { useState } from 'react';
import { UserSettings } from '../types';
import { LogoIcon } from './icons';

interface OnboardingProps {
    onComplete: (settings: Omit<UserSettings, 'onboardingComplete'>) => void;
}

const defaultCategories = ["Work", "Podcast Notes", "Ideas", "To-Do", "Follow-ups", "Personal Reminder"];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [defaultEmail, setDefaultEmail] = useState('');
    const [otherEmails, setOtherEmails] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [error, setError] = useState('');

    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleSubmit = () => {
        if (!defaultEmail || !/^\S+@\S+\.\S+$/.test(defaultEmail)) {
            setError('Please enter a valid default email address.');
            return;
        }
        if (selectedCategories.length === 0) {
            setError('Please select at least one category.');
            return;
        }
        setError('');
        onComplete({
            defaultEmail,
            otherEmails: otherEmails.split(',').map(e => e.trim()).filter(Boolean),
            categories: selectedCategories,
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans animate-fade-in">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
                <div className="flex flex-col items-center mb-6">
                    <LogoIcon className="h-12 w-12 text-blue-400 mb-3" />
                    <h1 className="text-3xl font-bold">Welcome to QuickDictate AI</h1>
                    <p className="text-gray-400 mt-2 text-center">Let's set things up for you.</p>
                </div>
                
                {error && <p className="text-red-400 bg-red-900/30 p-3 rounded-md mb-4 text-center">{error}</p>}

                <div className="space-y-6">
                    <div>
                        <label htmlFor="default-email" className="block text-sm font-medium text-gray-300 mb-2">
                            Default Email Address
                        </label>
                        <input
                            type="email"
                            id="default-email"
                            value={defaultEmail}
                            onChange={(e) => setDefaultEmail(e.target.value)}
                            placeholder="me@example.com"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                        />
                         <p className="text-xs text-gray-500 mt-1">For one-click sending.</p>
                    </div>

                     <div>
                        <label htmlFor="other-emails" className="block text-sm font-medium text-gray-300 mb-2">
                            Other Email Addresses (Optional)
                        </label>
                        <input
                            type="text"
                            id="other-emails"
                            value={otherEmails}
                            onChange={(e) => setOtherEmails(e.target.value)}
                            placeholder="work@example.com, ideas@example.com"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                         <p className="text-xs text-gray-500 mt-1">Comma-separated.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Your Note Categories
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {defaultCategories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryToggle(category)}
                                    className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 text-left ${
                                        selectedCategories.includes(category)
                                            ? 'bg-blue-600 text-white font-semibold'
                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/50"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
};
