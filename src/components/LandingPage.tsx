import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  Download, 
  Users, 
  ChevronDown, 
  Sparkles, 
  ArrowRight,
  MessageSquare,
  Bot,
  Layers
} from 'lucide-react';
import { FAQItem, FeatureItem } from '../types';

interface LandingPageProps {
  onStart: () => void;
  darkMode: boolean;
}

export default function LandingPage({ onStart, darkMode }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features: FeatureItem[] = [
    {
      icon: 'smartphone',
      title: 'Pairing Code Protocol',
      description: 'Authenticate seamlessly using the official WhatsApp Pairing Code method. No camera or QR code scans required.'
    },
    {
      icon: 'shield',
      title: 'End-to-End Credential Sync',
      description: 'Your Baileys credentials and creds.json are fully encrypted. Download them directly or copy your secure Session token instantly.'
    },
    {
      icon: 'zap',
      title: 'Real-time Socket Pipeline',
      description: 'Get immediate pairing states, feedback, and connection updates powered by high-speed Socket.IO communication.'
    },
    {
      icon: 'bot',
      title: 'Interactive Control Hub',
      description: 'Once connected, test your bot live: send messages, files, voice notes, stickers, fetch contacts, and inspect groups.'
    },
    {
      icon: 'users',
      title: 'Role-Based Administration',
      description: 'Comprehensive administrator dashboard to manage connected users, audit live status logs, and download database backups.'
    },
    {
      icon: 'terminal',
      title: 'Developer Friendly Backends',
      description: 'The output token is directly compatible with any standard Node.js WhatsApp bot, including Baileys and multi-device models.'
    }
  ];

  const faqs: FAQItem[] = [
    {
      question: 'What is the WhatsApp Pairing Code method?',
      answer: 'It is WhatsApp\'s official login protocol that allows you to link a WhatsApp session on a secondary device by inputting an 8-character numeric-alphabetical code directly on your mobile device (WhatsApp > Linked Devices > Link with Phone Number), removing the need to scan a QR code.'
    },
    {
      question: 'Is my WhatsApp connection secure?',
      answer: 'Yes. All authentication events run locally inside your sandboxed Cloud container using the official Baileys multi-device library. Credentials are saved in a private data directory and can be completely wiped from the database at any moment by clicking "Disconnect" or "Delete Session".'
    },
    {
      question: 'Can I use this generated creds.json on any WhatsApp bot?',
      answer: 'Absolutely. The exported `creds.json` file is fully compatible with any bot engine using `@whiskeysockets/baileys` (or standard Baileys forks). Simply place it in your bot\'s authentication directory.'
    },
    {
      question: 'What can I test inside the Bot Control Panel?',
      answer: 'You can interactively send text messages, images, videos, audio/voice clips, documents, stickers, view joined group structures, and monitor status. It is a fully functional web-based WhatsApp playground.'
    },
    {
      question: 'How do I access the Admin Panel?',
      answer: 'Sign in with the seeded administrator credentials (Email: `admin@hijjaze.com` | Password: `admin123`). From there, you can view registered users, track connection states, delete active client sessions, and pull server backups.'
    }
  ];

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'smartphone': return <Smartphone className="h-6 w-6 text-green-400" />;
      case 'shield': return <ShieldCheck className="h-6 w-6 text-green-400" />;
      case 'zap': return <Zap className="h-6 w-6 text-green-400" />;
      case 'bot': return <Bot className="h-6 w-6 text-green-400" />;
      case 'users': return <Users className="h-6 w-6 text-green-400" />;
      case 'terminal': return <Terminal className="h-6 w-6 text-green-400" />;
      default: return <Sparkles className="h-6 w-6 text-green-400" />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans">
      {/* Decorative Grid and Ambient Lights */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
      
      <div className="absolute top-0 left-1/4 -z-10 h-[450px] w-[450px] rounded-full bg-green-500/5 blur-[100px]" />
      <div className="absolute top-1/3 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-zinc-800/10 blur-[120px]" />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-20 text-center sm:px-8 sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5 text-xs font-semibold text-green-400 backdrop-blur-md"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Modern Baileys Pairing Protocol (2026 Edition)
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl"
        >
          Link WhatsApp Bots{' '}
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
            Without QR Scans
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400"
        >
          Securely connect your WhatsApp accounts via our visual pairing code module. Automatically generate, copy, and download decrypted Baileys credentials inside a professional control hub.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <button
            onClick={onStart}
            className="group flex items-center gap-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-4 shadow-lg shadow-green-500/10 transition-all duration-300"
            id="hero_start_btn"
          >
            Open Pairing Console
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <a
            href="#faq-section"
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-8 py-4 font-semibold text-zinc-300 hover:bg-zinc-900/75 hover:text-white transition-all duration-300"
            id="hero_learn_more_btn"
          >
            How it works
          </a>
        </motion.div>

        {/* Dashboard Graphic Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative mx-auto mt-16 max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-2xl shadow-green-950/5 backdrop-blur-xl"
        >
          <div className="absolute -top-3 left-6 flex gap-1.5 rounded-full bg-zinc-950 px-3 py-1 border border-zinc-800">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
            <div className="flex flex-col items-center justify-between gap-4 border-b border-zinc-800 pb-6 md:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-zinc-100">WhatsApp Account Connector</span>
                  <span className="block text-xs text-zinc-500 font-mono">Live Socket Pipeline</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400 border border-green-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Active Instance Running
              </div>
            </div>

            <div className="grid gap-8 pt-8 md:grid-cols-12 text-left">
              <div className="md:col-span-7 space-y-4">
                <h3 className="text-xl font-bold text-white">Instant Pairing Code Generation</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Enter your phone number with your country code, trigger the Baileys pairing sequence, and paste the generated 8-digit token inside your phone. No logins, no passwords, completely standalone.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <span className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-300 font-mono">1. Input Phone</span>
                  <span className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-300 font-mono">2. Request Code</span>
                  <span className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-300 font-mono">3. Link Account</span>
                </div>
              </div>
              <div className="md:col-span-5 flex flex-col items-center justify-center rounded-xl bg-zinc-900/60 p-6 border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono">Linked Status</span>
                <span className="mt-3 text-2xl font-black text-green-400 tracking-wider font-mono">H3T8-P9X4</span>
                <span className="mt-2 text-[10px] text-zinc-500 font-mono">Pairs instantly inside Linked Devices panel</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Cards Grid (Bento style) */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 border-t border-zinc-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Engineered For Modern Bots
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400">
            Hijjaze Bot Session Generator provides developer utilities and real-time triggers to keep your WhatsApp connectors in pristine condition.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 hover:bg-zinc-900/50 transition-all duration-300"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 group-hover:scale-110 transition-transform duration-300">
                {renderIcon(feature.icon)}
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq-section" className="mx-auto max-w-4xl px-6 py-20 sm:px-8 border-t border-zinc-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Clear up any questions on how the Hijjaze pairing code and bot systems sync.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div 
                key={i} 
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left text-white hover:bg-zinc-900/40 transition-colors"
                  id={`faq_btn_${i}`}
                >
                  <span className="font-semibold text-sm sm:text-base">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-green-400' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="border-t border-zinc-800 px-6 py-5 text-sm leading-relaxed text-zinc-400">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl border-t border-zinc-800 px-6 py-12 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-black font-bold text-sm">
            H
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Hijjaze Bot</span>
        </div>
        
        <p className="text-xs text-zinc-500 text-center sm:text-left font-mono">
          &copy; 2026 Hijjaze Bot. Built on official Baileys and Socket.IO multi-device APIs.
        </p>

        <div className="flex items-center gap-4 text-xs">
          <a href="#" className="text-zinc-400 hover:text-green-400 transition-colors">Documentation</a>
          <span className="text-zinc-700">|</span>
          <a href="#" className="text-zinc-400 hover:text-green-400 transition-colors">Support</a>
          <span className="text-zinc-700">|</span>
          <a href="#" className="text-zinc-400 hover:text-green-400 transition-colors font-mono">Github</a>
        </div>
      </footer>
    </div>
  );
}
