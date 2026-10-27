'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/shared/components/ui';
import { type ChatCall } from '../services';
import {
  playIncomingRingtone,
  playRingbackTone,
  playCallConnectedTone,
  playCallEndedTone,
  stopCallSounds,
} from '../services/callSounds';

interface VoiceCallModalProps {
  isOpen: boolean;
  call: ChatCall | null;
  currentRole: 'user' | 'admin';
  onAccept: () => void;
  onReject: () => void;
  onEnd: (durationSeconds: number) => void;
}

export default function VoiceCallModal({
  isOpen,
  call,
  currentRole,
  onAccept,
  onReject,
  onEnd,
}: VoiceCallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 45, 30, 60, 40, 20, 10]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isIncoming = call?.caller_role !== currentRole && call?.status === 'ringing';
  const isOutgoing = call?.caller_role === currentRole && call?.status === 'ringing';
  const isConnected = call?.status === 'connected';

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Sound effects management based on call status
  useEffect(() => {
    if (!isOpen || !call) {
      stopCallSounds();
      return;
    }

    if (isIncoming) {
      playIncomingRingtone();
    } else if (isOutgoing) {
      playRingbackTone();
    } else if (isConnected) {
      playCallConnectedTone();
    } else if (call.status === 'ended' || call.status === 'rejected') {
      playCallEndedTone();
    }

    return () => {
      stopCallSounds();
    };
  }, [isOpen, call, isIncoming, isOutgoing, isConnected]);

  // Duration timer
  useEffect(() => {
    if (isConnected) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected]);

  // Microphone and audio stream setup when connected
  useEffect(() => {
    if (!isConnected) {
      // Clean up stream if not connected
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let isMounted = true;

    async function initAudio() {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;

          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevels = () => {
              if (!isMounted) return;
              analyser.getByteFrequencyData(dataArray);
              const bars = Array.from(dataArray.slice(0, 8)).map((val) =>
                Math.max(12, Math.min(100, Math.round((val / 255) * 100)))
              );
              setAudioLevels(bars);
              animFrameRef.current = requestAnimationFrame(updateLevels);
            };
            updateLevels();
          }
        }
      } catch (err) {
        console.warn('Microphone access not available or denied, using simulated waves:', err);
        // Fallback simulation waves animation
        const interval = setInterval(() => {
          if (!isMounted) return;
          setAudioLevels([
            20 + Math.random() * 40,
            30 + Math.random() * 50,
            40 + Math.random() * 50,
            25 + Math.random() * 60,
            45 + Math.random() * 45,
            35 + Math.random() * 50,
            20 + Math.random() * 35,
            15 + Math.random() * 30,
          ]);
        }, 120);

        return () => clearInterval(interval);
      }
    }

    initAudio();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isConnected]);

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  };

  // Toggle Speaker
  const handleToggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  const handleEndCall = () => {
    stopCallSounds();
    onEnd(duration);
  };

  if (!isOpen || !call) return null;

  const partnerName =
    currentRole === 'user' ? 'Tổng đài Vietjet Air 24/7' : call.caller_name || 'Khách hàng';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-gray-900 via-slate-900 to-black text-white shadow-2xl border border-gray-800 p-6 flex flex-col items-center">
        {/* Glow effect */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs mb-6 text-gray-300">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="font-medium">
            {isConnected
              ? 'Đang đàm thoại'
              : isIncoming
                ? 'Cuộc gọi thoại đến...'
                : 'Đang kết nối cuộc gọi...'}
          </span>
        </div>

        {/* Avatar with pulsing rings */}
        <div className="relative mb-4 flex items-center justify-center">
          {/* Animated Wave Rings */}
          <div
            className={`absolute w-32 h-32 rounded-full border border-red-500/40 ${
              !isConnected ? 'animate-ping' : ''
            }`}
          />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg border-2 border-white/20">
            {currentRole === 'user' ? (
              <span className="font-black italic text-lg tracking-tighter text-white">vietjet</span>
            ) : (
              <Icon name="UserIcon" size={40} className="text-white/90" />
            )}
          </div>
        </div>

        {/* Name and subtitle */}
        <h3 className="text-lg font-bold font-koho text-white text-center leading-tight mb-1">
          {partnerName}
        </h3>
        <p className="text-xs text-gray-400 text-center mb-4">
          {currentRole === 'user'
            ? 'Hỗ trợ chuyến bay, hành lý & dịch vụ 24/7'
            : `Đàm thoại trực tiếp cùng hành khách`}
        </p>

        {/* Timer or Status */}
        {isConnected ? (
          <div className="mb-6 flex flex-col items-center gap-3">
            <span className="text-2xl font-mono font-bold text-amber-400 tracking-wider">
              {formatTime(duration)}
            </span>

            {/* Audio Wave Visualizer */}
            <div className="flex items-center gap-1.5 h-8 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
              {audioLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  className="w-1.5 rounded-full transition-all duration-100 ease-out"
                  style={{
                    height: `${Math.max(6, Math.min(28, (lvl / 100) * 28))}px`,
                    backgroundColor: isMuted ? '#6b7280' : '#ef4444',
                  }}
                />
              ))}
            </div>
            {isMuted && <span className="text-3xs text-red-400 font-medium">Micro đang tắt</span>}
          </div>
        ) : (
          <div className="mb-8 flex items-center gap-2 text-xs text-gray-400">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span>{isIncoming ? 'Chuông đang reo' : 'Đang đổ chuông bên người nhận'}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="w-full mt-2">
          {isIncoming ? (
            /* Incoming call: Accept or Decline */
            <div className="flex items-center justify-around w-full px-4">
              {/* Reject */}
              <button
                type="button"
                onClick={onReject}
                className="flex flex-col items-center gap-2 group"
                title="Từ chối cuộc gọi"
              >
                <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 active:scale-95">
                  <Icon name="PhoneXMarkIcon" size={26} />
                </div>
                <span className="text-xs text-gray-300 font-medium">Từ chối</span>
              </button>

              {/* Accept */}
              <button
                type="button"
                onClick={onAccept}
                className="flex flex-col items-center gap-2 group"
                title="Trả lời cuộc gọi"
              >
                <div className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white shadow-lg animate-bounce transition-transform group-hover:scale-105 active:scale-95">
                  <Icon name="PhoneIcon" size={26} />
                </div>
                <span className="text-xs text-green-400 font-bold">Trả lời</span>
              </button>
            </div>
          ) : (
            /* Active call or Outgoing call controls */
            <div className="flex flex-col items-center gap-6 w-full">
              {isConnected && (
                <div className="flex items-center justify-center gap-6">
                  {/* Mute button */}
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isMuted
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isMuted ? 'Bật micro' : 'Tắt micro'}
                  >
                    <Icon name={isMuted ? 'MicrophoneSlashIcon' : 'MicrophoneIcon'} size={20} />
                  </button>

                  {/* Speaker button */}
                  <button
                    type="button"
                    onClick={handleToggleSpeaker}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      !isSpeakerOn
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isSpeakerOn ? 'Tắt loa ngoài' : 'Bật loa ngoài'}
                  >
                    <Icon name={isSpeakerOn ? 'SpeakerWaveIcon' : 'SpeakerXMarkIcon'} size={20} />
                  </button>
                </div>
              )}

              {/* End call button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-transform hover:scale-105 active:scale-95"
              >
                <Icon name="PhoneXMarkIcon" size={20} />
                <span>Kết thúc cuộc gọi</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
