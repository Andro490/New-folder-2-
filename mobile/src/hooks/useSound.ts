import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

import AsyncStorage from '@react-native-async-storage/async-storage';

let globalPlayer: any = null;
let audioStarted = false;
let globalVolume = 0.4;
let isMuted = false;

let sfxEnabled = true;
let vibrationEnabled = true;

export async function loadSoundSettings() {
  try {
    const vol = await AsyncStorage.getItem('musicVolume');
    const muted = await AsyncStorage.getItem('musicMuted');
    const sfx = await AsyncStorage.getItem('sfxEnabled');
    const vib = await AsyncStorage.getItem('vibrationEnabled');
    if (vol !== null) globalVolume = parseFloat(vol);
    if (muted !== null) isMuted = muted === 'true';
    if (sfx !== null) sfxEnabled = sfx === 'true';
    if (vib !== null) vibrationEnabled = vib === 'true';
  } catch (e) {}
}

export async function setMusicVolume(vol: number) {
  globalVolume = Math.max(0, Math.min(1, vol));
  if (globalPlayer && !isMuted) {
    globalPlayer.volume = globalVolume;
  }
  await AsyncStorage.setItem('musicVolume', globalVolume.toString());
}

export async function setMusicMuted(muted: boolean) {
  isMuted = muted;
  if (globalPlayer) {
    globalPlayer.volume = muted ? 0 : globalVolume;
  }
  await AsyncStorage.setItem('musicMuted', muted.toString());
}

export function getMusicVolume() { return globalVolume; }
export function getMusicMuted() { return isMuted; }

export async function playBackgroundMusic() {
  if (isExpoGo) {
    console.log('🔇 Sound skipped in Expo Go');
    return;
  }

  if (audioStarted && globalPlayer) return;

  await loadSoundSettings();

  try {
    const { createAudioPlayer, setAudioModeAsync } = await import('expo-audio');

    if (Platform.OS !== 'web') {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    }

    if (!globalPlayer) {
      globalPlayer = createAudioPlayer(
        require('../../assets/sounds/game_music.mp3'),
      );
      globalPlayer.loop = true;
      globalPlayer.volume = isMuted ? 0 : globalVolume;
    }

    globalPlayer.play();
    audioStarted = true;
    console.log('✅ Background music started (expo-audio)');
  } catch (error) {
    console.log('Sound not available:', error);
    globalPlayer = null;
    audioStarted = false;
  }
}

export async function stopBackgroundMusic() {
  if (isExpoGo) return;
  try {
    if (globalPlayer) {
      globalPlayer.pause();
      globalPlayer.remove();
      globalPlayer = null;
      audioStarted = false;
    }
  } catch (error) {
    console.log('Stop sound error:', error);
  }
}

let winPlayer: any = null;
let lostPlayer: any = null;
let winMatchPlayer: any = null;
let lostMatchPlayer: any = null;

export async function playSoundEffect(effect: 'win' | 'lost' | 'bid' | 'countdown' | 'win-match' | 'lost-match') {
  if (isExpoGo) return;
  await loadSoundSettings();
  if (!sfxEnabled) return;

  try {
    const { createAudioPlayer } = await import('expo-audio');
    
    if (effect === 'win') {
      if (!winPlayer) winPlayer = createAudioPlayer(require('../../assets/sounds/win.mp3'));
      winPlayer.pause(); winPlayer.seekTo(0); winPlayer.play();
    } else if (effect === 'lost') {
      if (!lostPlayer) lostPlayer = createAudioPlayer(require('../../assets/sounds/lost.mp3'));
      lostPlayer.pause(); lostPlayer.seekTo(0); lostPlayer.play();
    } else if (effect === 'win-match') {
      if (!winMatchPlayer) winMatchPlayer = createAudioPlayer(require('../../assets/sounds/win-match.mp3'));
      winMatchPlayer.pause(); winMatchPlayer.seekTo(0); winMatchPlayer.play();
    } else if (effect === 'lost-match') {
      if (!lostMatchPlayer) lostMatchPlayer = createAudioPlayer(require('../../assets/sounds/lost-match.mp3'));
      lostMatchPlayer.pause(); lostMatchPlayer.seekTo(0); lostMatchPlayer.play();
    }
  } catch (error) {
    console.log('Error playing sound effect', error);
  }
}

export async function triggerVibration() {
  await loadSoundSettings();
  if (!vibrationEnabled) return;

  if (Platform.OS !== 'web') {
    Vibration.vibrate(400); // 400 milliseconds vibration
  }
}

export function useBackgroundMusic() {
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    played.current = true;

    if (Platform.OS === 'web') {
      const handleFirstInteraction = () => {
        playBackgroundMusic();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };
      document.addEventListener('click', handleFirstInteraction);
      document.addEventListener('touchstart', handleFirstInteraction);
      return () => {
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };
    } else {
      playBackgroundMusic();
    }
  }, []);
}
