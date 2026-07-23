"use client";

import { useEffect, useRef, useState } from "react";
import TabBar from "@/components/TabBar";
import SavedChip from "@/components/SavedChip";
import { PLogo, RippleLogo } from "@/components/Logo";
import { RippleGlyph } from "@/components/Icons";
import ShareSheet from "@/components/ShareSheet";
import ThinkingTease from "@/components/ThinkingTease";
import { POOL, memberShare, demoMode } from "@/lib/pricing";
import { MODELS, selectableTiers, type ModelId } from "@/lib/pricing";
import {
  getSessionSavings,
  setStoredSavings,
  getChatHistory,
  setChatHistory,
  getStoredModel,
  setStoredModel,
  recordUsage,
  type ChatMsg,
} from "@/lib/demo-store";

type Msg = ChatMsg;

const SEED: Msg[] = [
  { role: "user", text: "help me write a caption for my film photos from the coast trip" },
  {
    role: "ai",
    text: "three directions:\n\n1. deadpan: “shot on film because my camera roll has trust issues”\n2. wistful: “the coast develops slower than i do”\n3. chaotic: “36 exposures and not one of them is the sunset”",
    model: "cheap",
    saved: 0.04,
    latency: "0.4",
  },
  { role: "user", text: "the third one lol. make it sadder" },
  {
    role: "ai",
    text: "“36 exposures and the sunset watched me waste all of them”",
    model: "cheap",
    saved: 0.03,
    latency: "0.3",
  },
];

const demo = demoMode();

export default function ChatPage() {
  const [model, setModel] = useState<ModelId>(() => (demo ? getStoredModel<ModelId>("cheap") : "cheap"));
  const [msgs, setMsgs] = useState<Msg[]>(() => (demo ? (getChatHistory() ?? SEED) : []));
  const [historyLoaded, setHistoryLoaded] = useState(demo);
  const [historyError, setHistoryError] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(() => (demo ? getSessionSavings() : 0));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shareTarget, setShareTarget] = useState<{ title: string; response: string; model: ModelId } | null>(null);
  // kbInset: extra bottom padding for browsers where the keyboard OVERLAYS the
  // page (visual viewport shrinks but layout doesn't). On modern iOS the
  // layout itself resizes, so this stays 0 and inputFocused does the work.
  const [kbInset, setKbInset] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  // Touch devices get an on-screen keyboard when the input is focused; desktop
  // doesn't, so focusing there should NOT hide the tab bar / footer chrome.
  const [touchDevice, setTouchDevice] = useState(false);
  // Live mode pool membership: undefined = loading, null = no pool, "error" = fetch failed.
  const [livePool, setLivePool] = useState<{ name: string; shareDollars: number } | null | undefined | "error">(
    demo ? { name: POOL.name, shareDollars: memberShare() } : undefined
  );
  const [weather, setWeather] = useState<{ emoji: string; temp: number } | null>(null);
  const hasPool = typeof livePool === "object" && livePool !== null;
  const turnRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pinnedRef = useRef(true);
  const streamingRef = useRef(false);

  // Fetch weather once on load: IP-based geolocation → Open-Meteo (both free, no key).
  // Fails silently if either API is down — weather is a nice-to-have, not critical.
  useEffect(() => {
    fetch("https://ipwho.is/")
      .then((res) => res.json())
      .then((geo) => {
        const { latitude, longitude } = geo;
        if (!latitude || !longitude) return;
        return fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
        );
      })
      .then((res) => res?.json())
      .then((data) => {
        const temp = data?.current?.temperature_2m;
        const code = data?.current?.weather_code;
        if (temp === undefined || code === undefined) return;
        // WMO weather codes: 0-3 clear/clouds, 45-48 fog, 51-67 rain, 71-77 snow, 80-82 showers, 95-99 thunder
        const emoji =
          code <= 1 ? "☀️" : code <= 3 ? "⛅" : code <= 48 ? "🌫️" : code <= 67 ? "🌧️" : code <= 77 ? "❄️" : code <= 82 ? "🌦️" : "⛈️";
        setWeather({ emoji, temp: Math.round(temp) });
      })
      .catch(() => {}); // weather is ambient — never error the chat
  }, []);

  // Live mode: hydrate history from the server.
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    const load = () => {
      setHistoryError(false);
      fetch("/api/chat/history")
        .then((res) => {
          if (!res.ok) throw new Error("history failed");
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          const serverMsgs = (data.messages ?? []) as Msg[];
          setMsgs(serverMsgs.length > 0 ? serverMsgs : []);
          setHistoryLoaded(true);
        })
        .catch(() => {
          if (cancelled) return;
          setHistoryError(true);
          setHistoryLoaded(true);
        });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live mode: do we have a pool at all? Drives the create-pool CTA.
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    fetch("/api/pools/mine")
      .then((res) => {
        if (!res.ok) throw new Error("pool fetch failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const pool = data.pool as { name: string; monthlyBudgetCents: number; members: unknown[] } | null;
        if (!pool) {
          setLivePool(null);
        } else {
          const count = Math.max(1, pool.members?.length ?? 1);
          setLivePool({
            name: pool.name,
            shareDollars: (pool.monthlyBudgetCents / 100 + count) / count,
          });
        }
      })
      .catch(() => {
        // Network/server failure is NOT "you have no pool" — don't push onboarding.
        if (!cancelled) setLivePool("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Arriving via the chat bubble (#compose): jump straight into the input.
  useEffect(() => {
    if (window.location.hash !== "#compose") return;
    history.replaceState(null, "", window.location.pathname);
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setTouchDevice(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height);
      setKbInset(inset > 120 ? inset : 0);
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  // Keyboard open (either style): hide the tab bar + footer chrome so the
  // composer sits right on top of the keyboard.
  const kbOpen = (touchDevice && inputFocused) || kbInset > 0;

  // When the keyboard opens and the layout reflows, keep the latest messages
  // in view instead of leaving the list scrolled to a stale position.
  useEffect(() => {
    if (!kbOpen) return;
    const t = setTimeout(() => {
      const el = listRef.current;
      if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
    }, 60);
    return () => clearTimeout(t);
  }, [kbOpen]);

  useEffect(() => {
    const el = listRef.current;
    if (el && pinnedRef.current && !streamingRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (demo && !streamingRef.current) setChatHistory(msgs);
  }, [msgs]);

  useEffect(() => {
    if (demo) setStoredModel(model);
  }, [model]);

  function handleListScroll() {
    const el = listRef.current;
    if (el) pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    if (busy) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      pinnedRef.current = true;
      return;
    }
    setInput("");
    setError("");
    setNotice("");
    setBusy(true);
    streamingRef.current = true;
    pinnedRef.current = true;
    setMsgs((m) => [...m, { role: "user", text }, { role: "ai", text: "", model }]);
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    const t0 = performance.now();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          turn: turnRef.current++,
          prompt: text,
          ...(demo ? {} : { history: msgs.slice(-12).map((m) => ({ role: m.role, text: m.text })) }),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        if (res.status === 401) throw new Error("sign in to use the pool");
        if (data?.error === "no_pool") throw new Error("you're not in a pool yet");
        throw new Error("couldn't reach the pool — try again in a sec");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.error) {
            throw new Error(evt.message ?? "the pool couldn't answer");
          }
          if (evt.notice === "whale_warning") {
            setNotice(evt.message);
          }
          if (evt.delta) {
            setMsgs((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], text: copy[copy.length - 1].text + evt.delta };
              return copy;
            });
          }
          if (evt.done) {
            const latency = ((performance.now() - t0) / 1000).toFixed(1);
            setMsgs((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], saved: evt.saved, latency };
              return copy;
            });
            if (demo) recordUsage(evt.saved);
            setSessionSaved((s) => {
              const next = s + evt.saved;
              if (demo) setStoredSavings(next);
              return next;
            });
          }
        }
      }
    } catch (err) {
      setMsgs((m) => m.slice(0, -2));
      setError(err instanceof Error ? err.message : "couldn't reach the pool. your message is still here — tap send to retry.");
      setInput(text);
    } finally {
      streamingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <div
        className="screen"
        style={{ display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: kbOpen ? 0 : 96 }}
      >
        <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 16px 12px", borderBottom: "1.5px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PLogo size={32} />
            <div>
              <div className="display" style={{ fontSize: 15 }}>chat</div>
              <div style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 600 }}>
                🔒 private until you share{weather && ` · ${weather.emoji} ${weather.temp}°`}
              </div>
            </div>
            {livePool === null ? (
              <a
                href="/onboarding"
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                  background: "var(--volt)", borderRadius: 999, padding: "7px 13px", textDecoration: "none",
                }}
              >
                <span className="display" style={{ fontSize: 11, color: "var(--ink)" }}>+ create pool</span>
              </a>
            ) : typeof livePool === "object" && livePool !== null ? (
              <a
                href="/misc"
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 7,
                  background: "var(--card)", border: "1.5px solid var(--line)", borderRadius: 999,
                  padding: "6px 11px", textDecoration: "none",
                }}
              >
                <span className="display num" style={{ fontSize: 12, color: "var(--volt)" }}>
                  ${livePool.shareDollars.toFixed(0)}/mo
                </span>
                <span style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 700 }}>
                  {livePool.name.toLowerCase()} ›
                </span>
              </a>
            ) : (
              <span style={{ marginLeft: "auto" }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {selectableTiers().map((id) => (
              <button
                key={id}
                onClick={() => setModel(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 999,
                  border: `1.5px solid ${model === id ? "var(--volt)" : "var(--line)"}`,
                  background: model === id ? "var(--volt)" : "var(--card)",
                  color: model === id ? "var(--ink)" : "var(--dim)",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {MODELS[id].emoji} {MODELS[id].label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 600, marginTop: 8 }}>
            {MODELS[model].blurb}{model === "cheap" ? " · lowest draw on the pool" : ""}
          </div>
        </header>

        <div
          ref={listRef}
          onScroll={handleListScroll}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 14px 8px", display: "flex", flexDirection: "column", gap: 14 }}
        >
          {!historyLoaded && (
            <div style={{ alignSelf: "center", fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 20 }}>
              loading your chat…
            </div>
          )}

          {historyLoaded && !historyError && msgs.length === 0 && livePool === null && (
            <div style={{ alignSelf: "center", textAlign: "center", marginTop: "9dvh", maxWidth: 290, width: "100%" }}>
              <RippleLogo size={38} />
              <div className="display" style={{ fontSize: 19, marginTop: 10 }}>you need a pool first</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 600, marginTop: 8, lineHeight: 1.55 }}>
                a pool is your group&apos;s shared AI budget — start one and invite friends, or join one with a code.
              </div>
              <a href="/onboarding" className="btn3" style={{ marginTop: 20 }}>start a pool<RippleGlyph /></a>
              <a href="/onboarding?mode=join" className="btn3 ghost" style={{ marginTop: 9 }}>join with an invite code</a>
            </div>
          )}

          {historyLoaded && !historyError && msgs.length === 0 && livePool === undefined && (
            <div style={{ alignSelf: "center", fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 20 }}>
              checking your pool…
            </div>
          )}

          {historyLoaded && !historyError && msgs.length === 0 && livePool === "error" && (
            <div style={{ alignSelf: "center", textAlign: "center", marginTop: "12dvh", maxWidth: 260 }}>
              <div style={{ fontSize: 34 }}>📡</div>
              <div className="display" style={{ fontSize: 17, marginTop: 10 }}>couldn&apos;t load your pool</div>
              <div style={{ fontSize: 12, color: "var(--dim)", fontWeight: 600, marginTop: 8, lineHeight: 1.55 }}>
                check your connection and try again.
              </div>
              <button className="btn3 ghost" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
                retry
              </button>
            </div>
          )}

          {historyLoaded && !historyError && msgs.length === 0 && hasPool && (
            <div style={{ alignSelf: "center", textAlign: "center", marginTop: "10dvh", maxWidth: 280 }}>
              <div style={{ fontSize: 34 }}>⚡</div>
              <div className="display" style={{ fontSize: 17, marginTop: 10 }}>ask the pool anything</div>
              <div style={{ fontSize: 12, color: "var(--dim)", fontWeight: 600, marginTop: 8, lineHeight: 1.55 }}>
                homework help, captions, wild ideas, stickers — it all draws from your pool&apos;s shared budget.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {["write a caption for my last photo", "explain this like i'm 5:", "settle a debate:"].map((starter) => (
                  <button
                    key={starter}
                    onClick={() => {
                      setInput(starter + " ");
                      inputRef.current?.focus();
                    }}
                    style={{
                      fontSize: 11.5, fontWeight: 700, color: "var(--volt)", background: "var(--card)",
                      border: "1.5px solid var(--line)", borderRadius: 999, padding: "8px 13px",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {historyLoaded && historyError && msgs.length === 0 && (
            <div style={{ alignSelf: "center", textAlign: "center", marginTop: "12dvh", maxWidth: 260 }}>
              <div className="display" style={{ fontSize: 16 }}>couldn&apos;t load your chat</div>
              <button className="btn3 ghost" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>
                tap to retry
              </button>
            </div>
          )}

          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="msg-in"
                style={{
                  alignSelf: "flex-end", maxWidth: "80%", background: "var(--volt)", color: "var(--ink)",
                  borderRadius: "18px 18px 6px 18px", padding: "11px 14px", fontSize: 14.5, lineHeight: 1.45, fontWeight: 600,
                }}
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="msg-in"
                style={{
                  alignSelf: "flex-start", maxWidth: "86%", background: "var(--card)", border: "1.5px solid var(--line)",
                  borderRadius: "18px 18px 18px 6px", padding: "11px 14px", fontSize: 14.5, lineHeight: 1.55, color: "#E8EAE4",
                }}
              >
                {demo && m.model === "image" && m.saved !== undefined && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                    {["🌅", "🎞️", "🌊", "🎑"].map((emoji, j) => (
                      <div
                        key={j}
                        style={{
                          aspectRatio: "1", borderRadius: 12, border: "1.5px solid var(--line)",
                          background: `linear-gradient(${135 + j * 40}deg, #2E3A4A, #1C2E26 60%, #3A3A1C)`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34,
                        }}
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                )}
                {m.text.split("\n").map((line, j) => (
                  <span key={j}>{line}{j < m.text.split("\n").length - 1 && <br />}</span>
                ))}
                {m.saved === undefined && busy && i === msgs.length - 1 && (
                  m.text === "" ? <ThinkingTease /> : <span className="caret" />
                )}
                {m.saved !== undefined && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                    <span style={{ fontSize: 10, color: "var(--dim2)", fontWeight: 600 }}>
                      {MODELS[m.model!].emoji} {MODELS[m.model!].label}{m.latency ? ` · ${m.latency}s` : ""}
                    </span>
                    <SavedChip dollars={m.saved} gold={m.model === "image"} />
                    <button
                      onClick={() => {
                        const previous = msgs.slice(0, i).reverse().find((msg) => msg.role === "user");
                        setShareTarget({
                          title: previous?.text ?? "a good answer",
                          response: m.text,
                          model: m.model!,
                        });
                      }}
                      style={{
                        fontSize: 11, fontWeight: 800, color: "var(--dim)", background: "transparent",
                        border: "1px solid var(--line)", padding: "8px 13px", borderRadius: 999, minHeight: 32,
                        textTransform: "uppercase", letterSpacing: 0.4, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      ↗ share
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {notice && (
            <div
              className="msg-in"
              style={{
                alignSelf: "center", fontSize: 11, fontWeight: 700, color: "var(--hot)",
                background: "rgba(255,107,44,0.08)", border: "1px solid rgba(255,107,44,0.35)",
                borderRadius: 999, padding: "6px 13px",
              }}
            >
              {notice}
            </div>
          )}

          {demo && (
            <a href="/misc/receipt" className="weekly-drop">
              <span className="weekly-drop-icon">🧾</span>
              <span>
                <span className="display" style={{ display: "block", fontSize: 13 }}>weekly drop is in</span>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 2, opacity: 0.78 }}>
                  you paid $1.20 for $50 of ai · matt is cooked 🐋
                </span>
              </span>
              <span style={{ marginLeft: "auto", fontSize: 18 }}>›</span>
            </a>
          )}

          {sessionSaved > 0 && (
            <div
              className="msg-in num"
              style={{
                alignSelf: "center", display: "flex", alignItems: "center", gap: 7, marginTop: 4,
                fontSize: 10.5, fontWeight: 700, color: "var(--dim)",
                background: "var(--card)", border: "1.5px solid var(--line)", borderRadius: 999, padding: "6px 13px",
              }}
            >
              ▲ this session you&apos;ve saved <span style={{ color: "var(--volt)", fontWeight: 800 }}>${sessionSaved.toFixed(2)}</span> vs pay-per-use
            </div>
          )}
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: "10px 14px 8px",
            paddingBottom: kbInset > 0 ? kbInset + 8 : 8,
            background: "rgba(11,14,12,0.97)",
            borderTop: "1.5px solid var(--line)",
          }}
        >
          {error && (
            <div className="error-banner">
              {error}
              {livePool === null && (
                <a href="/onboarding" style={{ color: "var(--volt)", fontWeight: 800, marginLeft: 8, textDecoration: "none" }}>
                  create one →
                </a>
              )}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--card)", border: "1.5px solid var(--line)", borderRadius: 999, padding: "7px 8px 7px 16px" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={livePool === null || livePool === undefined}
              placeholder={livePool === null ? "create or join a pool first" : `ask ${MODELS[model].emoji} ${MODELS[model].label}…`}
              style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: "var(--paper)", fontSize: 16, fontFamily: "inherit", fontWeight: 500 }}
            />
            <button
              onClick={send}
              disabled={busy || livePool === null || livePool === undefined}
              aria-label="send"
              style={{
                width: 42, height: 42, borderRadius: "50%", background: "var(--volt)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                color: "var(--ink)", fontWeight: 800, cursor: "pointer",
                opacity: busy || livePool === null || livePool === undefined ? 0.5 : 1, flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
          {!kbOpen && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 8px 0", fontSize: 10, color: "var(--dim3)", fontWeight: 600 }}>
              <span>🔒 private by default</span>
              {demo ? (
                <span className="num" style={{ color: "var(--volt)", opacity: 0.85 }}>month so far: $41.20 saved</span>
              ) : sessionSaved > 0 ? (
                <span className="num" style={{ color: "var(--volt)", opacity: 0.85 }}>session: ${sessionSaved.toFixed(2)} saved</span>
              ) : null}
            </div>
          )}
        </div>
      </div>
      {!kbOpen && <TabBar />}
      {shareTarget && <ShareSheet {...shareTarget} onClose={() => setShareTarget(null)} />}
    </>
  );
}
