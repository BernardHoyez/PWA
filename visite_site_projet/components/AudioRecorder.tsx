import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PlayIcon, StopIcon, TrashIcon, DownloadIcon } from './Icons';

interface AudioRecorderProps {
  audioUrl?: string;
  onAudioStop: (audioUrl: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioUrl, onAudioStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(audioUrl);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
      setCurrentAudioUrl(audioUrl);
  }, [audioUrl]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const newAudioUrl = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(newAudioUrl);
        
        // Convert to base64 to make it serializable for saving
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            onAudioStop(reader.result as string);
            URL.revokeObjectURL(newAudioUrl); // Clean up blob URL after converting
        };

        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Impossible d'accéder au microphone. Veuillez vérifier les permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleDeleteAudio = () => {
      onAudioStop('');
      setCurrentAudioUrl(undefined);
  };

  const handleDownloadAudio = () => {
    if (!currentAudioUrl) return;
    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = `commentaire-audio-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <button onClick={handleStopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 animate-pulse" aria-label="Arrêter l'enregistrement">
            <StopIcon/>
        </button>
      ) : (
        <button onClick={handleStartRecording} className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600" aria-label="Démarrer l'enregistrement">
            <MicrophoneIcon />
        </button>
      )}
      {currentAudioUrl && !isRecording && (
        <>
          <audio ref={audioRef} src={currentAudioUrl} />
          <button onClick={() => audioRef.current?.play()} className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500" aria-label="Écouter l'audio">
            <PlayIcon />
          </button>
          <button onClick={handleDownloadAudio} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600" aria-label="Télécharger l'audio">
            <DownloadIcon />
          </button>
           <button onClick={handleDeleteAudio} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600" aria-label="Supprimer l'audio">
            <TrashIcon />
          </button>
        </>
      )}
    </div>
  );
};

export default AudioRecorder;