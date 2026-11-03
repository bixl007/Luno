"use client";

import { useState } from "react";
import { notify } from "@/components/ui/Toaster";

/** Copy, read-aloud and PDF export for a chat message. */
export function useMessageActions() {
  const [isListening, setIsListening] = useState<number | null>(null);
  const [speechCancelled, setSpeechCancelled] = useState(false);

  const speak = (text: string, messageIndex: number) => {
    if (!("speechSynthesis" in window)) {
      notify.error("Speech synthesis not supported in this browser");
      return;
    }

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking || isListening === messageIndex) {
      setSpeechCancelled(true);
      setIsListening(null);

      // Use a timeout to prevent race conditions
      setTimeout(() => {
        window.speechSynthesis.cancel();
        notify.info("Speech stopped", 1500);
        // Reset flag after a short delay
        setTimeout(() => setSpeechCancelled(false), 500);
      }, 50);
      return;
    }

    // Clean text for speech (remove markdown formatting)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, " Code block. ") // Replace code blocks first
      .replace(/`([^`]+)`/g, "$1") // Remove inline code backticks
      .replace(/#{1,6}\s*/g, "") // Remove headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
      .replace(/[*_~`#]/g, "") // Remove remaining markdown symbols
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    if (!cleanText || cleanText.length < 3) {
      notify.error("No readable text found", 1500);
      return;
    }

    try {
      // Reset cancellation flag
      setSpeechCancelled(false);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";

      utterance.onstart = () => {
        if (!speechCancelled) {
          setIsListening(messageIndex);
          notify.info("Reading message aloud");
        }
      };

      utterance.onend = () => {
        if (!speechCancelled) {
          setIsListening(null);
          notify.info("Finished reading", 1500);
        }
        setSpeechCancelled(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsListening(null);
        // Only show error toast if it's not a cancellation
        if (!speechCancelled && event.error !== "canceled" && event.error !== "interrupted") {
          notify.error("Speech failed. Try again.");
        }
        setSpeechCancelled(false);
      };

      // Speak with a small delay to ensure proper initialization
      setTimeout(() => {
        if (!speechCancelled) {
          try {
            window.speechSynthesis.speak(utterance);
          } catch (error) {
            console.error("Error speaking:", error);
            if (!speechCancelled) {
              setIsListening(null);
              notify.error("Speech failed to start");
            }
          }
        }
      }, 100);
    } catch (error) {
      console.error("Speech synthesis setup error:", error);
      if (!speechCancelled) {
        setIsListening(null);
        notify.error("Speech synthesis failed");
      }
    }
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

  const exportAsPDF = async (content: string, messageIndex: number) => {
    try {
      notify.info("Generating PDF…");

      // Loaded on demand: the PDF library is large and most sessions never export.
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;

      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Luno Chat Export", margin, margin + 10);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, margin + 20);

      pdf.line(margin, margin + 25, pageWidth - margin, margin + 25);

      // Clean content for PDF
      const cleanContent = content
        .replace(/#{1,6}\s?/g, "") // Remove headers
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/`(.*?)`/g, "$1") // Remove inline code
        .replace(/```[\s\S]*?```/g, "[Code Block]") // Replace code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
        .replace(/[#*`_~]/g, "") // Remove remaining markdown
        .trim();

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      const lines = pdf.splitTextToSize(cleanContent, maxWidth);
      let yPosition = margin + 35;

      for (let i = 0; i < lines.length; i++) {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += 7;
      }

      pdf.save(`luno-message-${messageIndex}-${Date.now()}.pdf`);
      notify.success("PDF exported");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      notify.error("Failed to export PDF");
    }
  };

  return { isListening, speak, copyToClipboard, copyCodeToClipboard, exportAsPDF };
}
