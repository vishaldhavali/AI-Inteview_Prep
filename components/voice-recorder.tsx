"use client";

import { useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSpeechRecognition } from "@/hooks/use-speech";
import { Mic, Square } from "lucide-react";

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  onRecordingComplete: (transcript: string) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export interface VoiceRecorderRef {
  resetTranscript: () => void;
}

const VoiceRecorder = forwardRef<VoiceRecorderRef, VoiceRecorderProps>(
  (
    {
      onTranscriptChange,
      onRecordingComplete,
      isRecording,
      onStartRecording,
      onStopRecording,
    },
    ref
  ) => {
    const {
      isListening,
      transcript,
      error,
      startListening,
      stopListening,
      resetTranscript,
    } = useSpeechRecognition();

    // Expose resetTranscript to parent component
    useImperativeHandle(ref, () => ({
      resetTranscript: () => {
        resetTranscript();
        onTranscriptChange("");
      },
    }));

    useEffect(() => {
      onTranscriptChange(transcript);
    }, [transcript, onTranscriptChange]);

    const handleStartRecording = () => {
      resetTranscript();
      startListening();
      onStartRecording();
    };

    const handleStopRecording = () => {
      stopListening();
      onStopRecording();
      onRecordingComplete(transcript);
    };

    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-center">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  size="lg"
                  className="rounded-full h-16 w-16 bg-red-500 hover:bg-red-600"
                >
                  <Mic className="h-6 w-6" />
                </Button>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-16 w-16"
                >
                  <Square className="h-6 w-6" />
                </Button>
              )}
            </div>

            <div className="text-center">
              {isRecording ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-500 font-medium">
                      Recording...
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Speak clearly into your microphone
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">Click to start recording</p>
                  <p className="text-sm text-gray-500">
                    Your answer will be transcribed in real-time
                  </p>
                </div>
              )}
            </div>

            {transcript && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Live Transcription:</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {transcript}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="text-xs text-gray-500 text-center">
              Make sure to allow microphone access when prompted
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

VoiceRecorder.displayName = "VoiceRecorder";

export default VoiceRecorder;
