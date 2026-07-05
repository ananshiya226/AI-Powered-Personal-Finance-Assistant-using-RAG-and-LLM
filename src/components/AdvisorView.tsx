import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, Send, RefreshCw, BookOpen, User, HelpCircle, 
  Lightbulb, ShieldCheck, ChevronRight, Bookmark
} from "lucide-react";
import { RAGDocument } from "../types.js";

interface Message {
  id: string;
  sender: "user" | "advisor";
  text: string;
  sources?: string[];
  timestamp: string;
}

interface AdvisorViewProps {
  onSendMessage: (text: string) => Promise<{ text: string; retrievedSources: string[] }>;
  ragDocuments: RAGDocument[];
  currencySymbol: string;
}

const DEFAULT_CHIPS = [
  "How can I build a 3-to-6 month emergency fund?",
  "Suggest a customized zero-based budget for this month.",
  "What is the 50/30/20 rule and how does it apply to my salary?",
  "How can I cut unnecessary food delivery or shopping expenses?",
  "What are low-risk government-backed investments?",
];

export default function AdvisorView({
  onSendMessage,
  ragDocuments,
  currencySymbol,
}: AdvisorViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "advisor",
      text: "Hello! I am your AI Financial Advisor. I combine your actual logged expenditures and salary details with my extensive personal finance knowledge base (RAG) to provide exact, personalized savings tips.\n\nAsk me any questions like how to optimize your budget, where to allocate investments, or how to design an emergency fund!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<RAGDocument | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const reply = await onSendMessage(textToSend);
      
      const advisorMsg: Message = {
        id: Math.random().toString(),
        sender: "advisor",
        text: reply.text,
        sources: reply.retrievedSources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setMessages((prev) => [...prev, advisorMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "advisor",
        text: `Sorry, I encountered an issue while reviewing your transaction history. ${err.message || err}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-210px)] min-h-[500px]">
      {/* Left Chat Screen */}
      <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/10 shadow-xl flex flex-col h-full overflow-hidden text-white">
        {/* Advisor Top Header */}
        <div className="bg-gradient-to-r from-violet-600 to-pink-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
              <Sparkles className="h-5 w-5 text-pink-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm">Expert Financial Advisor</h3>
              <p className="text-[10px] text-purple-100 font-semibold">Grounded RAG Engine • Powered by Gemini</p>
            </div>
          </div>
          <div className="bg-white/10 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            Secure Analysis
          </div>
        </div>

        {/* Scrollable chat body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              {/* Avatar */}
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                msg.sender === "user" ? "bg-pink-500/10 text-pink-300 border border-pink-500/20" : "bg-violet-500/10 text-violet-300 border border-violet-500/20"
              }`}>
                {msg.sender === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-violet-400" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1">
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === "user" 
                    ? "bg-pink-600 text-white font-semibold rounded-tr-none shadow-lg shadow-pink-600/20" 
                    : "bg-white/5 border border-white/10 text-slate-100 rounded-tl-none"
                }`}>
                  {msg.text}
                </div>

                {/* Sources list */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    <span className="text-[10px] text-slate-400 font-bold inline-flex items-center gap-0.5 mt-0.5">
                      <BookOpen className="h-3 w-3" /> Grounded in:
                    </span>
                    {msg.sources.map((src, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center text-[10px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-md px-2 py-0.5"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}
                
                <span className={`text-[9px] font-semibold text-slate-400 block ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Chat Loader */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center flex-shrink-0 animate-spin">
                <RefreshCw className="h-4 w-4 text-violet-400" />
              </div>
              <div className="bg-white/5 border border-white/10 text-slate-300 rounded-2xl rounded-tl-none px-4 py-3 text-xs font-semibold animate-pulse flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
                <span>AI Advisor is reviewing your transaction ratios and retrieving financial schemes...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Dynamic Helpers & input footer */}
        <div className="border-t border-white/10 p-4 bg-[#120822]/80 space-y-3">
          {/* Helper Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
            {DEFAULT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSend(chip)}
                className="flex-shrink-0 bg-white/5 border border-white/10 hover:border-violet-500/50 text-slate-300 hover:text-white rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Form input field */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex gap-2"
          >
            <input 
              type="text" 
              placeholder="Ask Advisor e.g., 'Suggest a budget for next month'..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white focus:border-violet-500/50 outline-none transition placeholder-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white rounded-xl px-4 flex items-center justify-center transition disabled:opacity-50 shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar - RAG Documents Explorer */}
      <div className="bg-white/5 rounded-2xl border border-white/10 shadow-xl p-5 flex flex-col h-full overflow-hidden text-white animate-fade-in">
        <div className="flex items-center gap-1.5 border-b border-white/10 pb-4 mb-4 flex-shrink-0">
          <BookOpen className="h-5 w-5 text-violet-400" />
          <h4 className="font-display font-bold text-white text-base">RAG Knowledge Articles</h4>
        </div>
        
        <p className="text-xs text-slate-400 font-semibold mb-4 flex-shrink-0">Browse offline modules and schemes loaded inside the database. The AI extracts context from these for answers.</p>

        <div className="flex-1 overflow-y-auto space-y-3">
          {ragDocuments.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
              className={`w-full text-left rounded-xl p-3 border transition flex flex-col ${
                selectedDoc?.id === doc.id 
                  ? "bg-violet-500/10 border-violet-500/50 ring-1 ring-violet-500/50 text-white" 
                  : "bg-white/5 border border-white/10 hover:border-violet-500/30 text-white"
              }`}
            >
              <div className="flex items-start justify-between w-full">
                <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-md">{doc.category}</span>
                <Bookmark className={`h-3.5 w-3.5 ${selectedDoc?.id === doc.id ? "text-violet-400 fill-violet-400" : "text-slate-500"}`} />
              </div>
              <h5 className="font-bold text-slate-200 text-sm mt-2">{doc.title}</h5>
              
              {selectedDoc?.id === doc.id ? (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-xs text-slate-300 leading-relaxed mt-2 pt-2 border-t border-white/10 whitespace-pre-wrap"
                >
                  {doc.content}
                </motion.p>
              ) : (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{doc.content}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
