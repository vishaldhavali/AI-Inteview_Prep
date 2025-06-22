"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Pause, Square } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TextToSpeechProps {
  text: string;
  className?: string;
  onStateChange?: (speaking: boolean) => void;
}

export function TextToSpeech({
  text,
  className = "",
  onStateChange,
}: TextToSpeechProps) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(
    null
  );

  // Notify parent component of speaking state changes
  useEffect(() => {
    onStateChange?.(speaking);
  }, [speaking, onStateChange]);

  // Cleanup function when component unmounts or text changes
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text]);

  const handleSpeak = useCallback(() => {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return;
    }

    if (speaking && paused) {
      // Resume speech
      window.speechSynthesis.resume();
      setPaused(false);
      return;
    }

    if (speaking) {
      // Pause speech
      window.speechSynthesis.pause();
      setPaused(true);
      return;
    }

    // Start new speech
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.rate = 0.8;
    newUtterance.pitch = 1;
    newUtterance.volume = 1;

    newUtterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };

    newUtterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
      setUtterance(null);
    };

    newUtterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      setUtterance(null);
    };

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        setPaused(false);
        setUtterance(null);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    setUtterance(newUtterance);
    window.speechSynthesis.speak(newUtterance);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [text, speaking, paused]);

  const handleStop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setPaused(false);
      setUtterance(null);
    }
  }, []);

  return (
    <TooltipProvider>
      <div className={`flex gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100"
              onClick={handleSpeak}
            >
              {speaking && !paused ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{speaking && !paused ? "Pause" : paused ? "Resume" : "Play"}</p>
          </TooltipContent>
        </Tooltip>

        {(speaking || paused) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-gray-100"
                onClick={handleStop}
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
