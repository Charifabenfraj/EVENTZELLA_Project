"use client";

import { chatWithOllama } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

export default function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("domain");
  const [model, setModel] = useState("llama3:latest");
  const [language, setLanguage] = useState("fr-FR");
  const [listening, setListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Salut, je suis ton assistant Eventzella. Mode Domaine utilise tes donnees locales, mode General pour questions libres.",
    },
  ]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithOllama({ message: text, mode, model });
      setMessages((prev) => [...prev, { role: "assistant", text: response.reply }]);
      if (voiceOutput) {
        speakReply(response.reply);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: error.message || "Erreur de communication avec Ollama." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const speakReply = (text) => {
    if (typeof window === "undefined") {
      return;
    }
    if (!window.speechSynthesis) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.stop();
    };
  }, [language]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    recognitionRef.current.start();
    setListening(true);
  };

  return (
    <div className="chatbot-wrapper">
      {open && (
        <section className="chatbot-panel">
          <header className="chatbot-header">
            <h3>Eventzella Assistant</h3>
            <button type="button" className="chatbot-close" onClick={() => setOpen(false)}>
              x
            </button>
          </header>

          <div className="chatbot-controls">
            <label>
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option value="domain">Domaine</option>
                <option value="general">General</option>
              </select>
            </label>

            <label>
              Ollama Model
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="llama3:latest" />
            </label>
          </div>

          <div className="chatbot-voice-controls">
            <label>
              Voice Lang
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="fr-FR">Francais</option>
                <option value="en-US">English</option>
                <option value="ar-TN">Arabic (TN)</option>
              </select>
            </label>

            <button
              type="button"
              className="ghost-button chatbot-voice-button"
              onClick={toggleListening}
              disabled={!speechSupported}
            >
              {listening ? "Stop Mic" : "Start Mic"}
            </button>

            <label className="chatbot-voice-toggle">
              <input
                type="checkbox"
                checked={voiceOutput}
                onChange={(event) => setVoiceOutput(event.target.checked)}
              />
              Voice Replies
            </label>
          </div>

          {!speechSupported && (
            <p className="chatbot-voice-hint">Voice input is not supported by this browser.</p>
          )}

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={message.role === "user" ? "chat-msg chat-msg-user" : "chat-msg chat-msg-assistant"}
              >
                <p>{message.text}</p>
              </article>
            ))}
            {loading && (
              <article className="chat-msg chat-msg-assistant">
                <p>Generation en cours...</p>
              </article>
            )}
          </div>

          <div className="chatbot-input-row">
            <textarea
              rows={3}
              placeholder="Pose une question..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="button" className="gold-button" onClick={onSend} disabled={loading}>
              Envoyer
            </button>
          </div>
        </section>
      )}

      <button type="button" className="chatbot-fab" onClick={() => setOpen((prev) => !prev)}>
        LLM
      </button>
    </div>
  );
}
