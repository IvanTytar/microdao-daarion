/**
 * Сервіс для роботи з голосовим введенням та виведенням
 */

export class VoiceService {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;

  constructor() {
    // Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'uk-UA';
    }

    this.synthesis = window.speechSynthesis;
  }

  /**
   * Перевірка підтримки голосового вводу
   */
  isSupported(): boolean {
    return !!this.recognition;
  }

  /**
   * Початок запису голосу
   */
  startRecording(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): void {
    if (!this.recognition) {
      onError?.('Голосовий ввід не підтримується вашим браузером');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      
      onResult(transcript, isFinal);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch (error: any) {
      this.isListening = false;
      onError?.(error.message);
    }
  }

  /**
   * Зупинка запису голосу
   */
  stopRecording(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Промовити текст (Text-to-Speech)
   */
  speak(text: string, lang: string = 'uk-UA'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Text-to-Speech не підтримується'));
        return;
      }

      // Зупинити попереднє промовляння
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Зупинити промовляння
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Отримати список доступних голосів
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return [];
    }
    return this.synthesis.getVoices();
  }

  /**
   * Стан запису
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}

// Singleton instance
export const voiceService = new VoiceService();





