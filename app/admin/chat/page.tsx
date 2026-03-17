"use client";

import { useState } from "react";

export default function AdminChat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!question.trim()) return;

    const userMessage = { role: "user" as const, content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      const botMessage = {
        role: "assistant" as const,
        content: data.answer || "No hubo respuesta.",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al consultar el servidor." },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      
      <div className="w-full max-w-2xl h-[80vh] backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-white">
            Panel Inteligente
          </h1>
          <span className="text-xs text-gray-400">IA conectada</span>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-10">
              Preguntá algo sobre pasajeros o participantes...
            </p>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow ${
                  msg.role === "user"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white backdrop-blur-md border border-white/10"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <p className="text-sm text-gray-400 animate-pulse">
              Escribiendo...
            </p>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej: ¿Cuántos pasajeros hay?"
            className="flex-1 bg-white/10 text-white placeholder-gray-400 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-white text-black px-4 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}