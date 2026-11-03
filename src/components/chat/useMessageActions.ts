"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notify } from "@/components/ui/Toaster";
import { printMessage } from "./printMessage";
import { chunkForSpeech, cleanForSpeech, pickVoice, VOICE_KEY } from "./speech";

/** Copy, read-aloud and PDF export (through the print dialog) for a chat message. */
export function useMessageActions() {
  const [isListening, setIsListeningState] = useState<number | null>(null);
  // The same value in a ref: memoised bubbles can hold an old `speak`, which must still see who is speaking now.
  const listening = useRef<number | null>(null);
  const setIsListening = useCallback((index: number | null) => {
    listening.current = index;
    setIsListeningState(index);
  }, []);
  // Bumped on every start and stop; a chunk that finishes under an old number knows it was cancelled and goes quiet.
  const session = useRef(0);
  // Browsers drop an utterance that nothing references, which silently ends the speech early.
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    session.current++;
    current.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsListening(null);
  }, [setIsListening]);

  useEffect(() => stop, [stop]);

  const speak = (text: string, messageIndex: number) => {
    if (!("speechSynthesis" in window)) {
      notify.error("Speech synthesis not supported in this browser");
      return;
    }
    if (listening.current === messageIndex) {
      stop();
      return;
    }
    stop();

    const chunks = chunkForSpeech(cleanForSpeech(text));
    if (chunks.length === 0) {
      notify.error("No readable text found", 1500);
      return;
    }

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VOICE_KEY);
    } catch {
      // Storage can be blocked; the default voice is fine.
    }
    const voice = pickVoice(window.speechSynthesis.getVoices(), saved, navigator.language || "en-US");
    const mine = ++session.current;
    setIsListening(messageIndex);

    let next = 0;
    const speakNext = () => {
      if (mine !== session.current) return;
      if (next >= chunks.length) {
        setIsListening(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[next++]);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.onend = speakNext;
      utterance.onerror = (event) => {
        if (mine !== session.current || event.error === "canceled" || event.error === "interrupted") return;
        stop();
        notify.error("Speech failed. Try again.");
      };
      current.current = utterance;
      window.speechSynthesis.speak(utterance);
    };
    // Chrome ignores a speak() made in the same tick as cancel().
    setTimeout(speakNext, 60);
  };

  async function writeClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  const copyToClipboard = async (text: string) => {
    await writeClipboard(text);
    notify.success("Message copied");
  };

  const copyCodeToClipboard = async (code: string, language?: string) => {
    await writeClipboard(code);
    notify.success(`${language ? language.toUpperCase() + " " : ""}code copied`);
  };

  const exportAsPDF = async (_content: string, messageIndex: number) => {
    const source = document.querySelector<HTMLElement>(`[data-message-index="${messageIndex}"]`);
    if (!source) {
      notify.error("Couldn't find that message to export");
      return;
    }
    try {
      notify.info("In the print window, choose Save as PDF", 3500);
      await printMessage(source);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      notify.error("Failed to export PDF");
    }
  };

  return { isListening, speak, copyToClipboard, copyCodeToClipboard, exportAsPDF };
}
