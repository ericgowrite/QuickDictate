/**
 * @file This file contains utility functions for handling audio data,
 * specifically for encoding and formatting it for the Gemini Live API.
 */

import { Blob } from '@google/genai';

/**
 * Encodes a Uint8Array of binary data into a Base64 string.
 * This is required for sending audio data in the JSON payload to the Gemini API.
 * @param {Uint8Array} bytes - The raw byte array to encode.
 * @returns {string} The Base64-encoded string.
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Creates a Gemini API-compatible Blob object from raw audio data.
 * It converts a Float32Array (from the Web Audio API) into a 16-bit PCM
 * Int16Array, then Base64-encodes it and sets the correct MIME type.
 * @param {Float32Array} data - The raw audio data from an AudioProcessingEvent.
 * @returns {Blob} An object containing the Base64-encoded data and MIME type.
 */
export function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }