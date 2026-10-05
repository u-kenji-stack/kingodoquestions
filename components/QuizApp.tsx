"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CATEGORIES,
  QUESTIONS,
  QUESTIONS_BY_CATEGORY,
  type Question,
} from "@/lib/questions";

type Screen = "name" | "select" | "quiz" | "result";
type CatSelection = string | "mix";
type PerCat = Record<string, { correct: number; total: number }>;
type BestScores = Record<string, { score: number; total: number }>;

const BEST_KEY = "kingodo-quiz-best";
const NAME_KEY = "kingodo-quiz-name";
const GAUGE_R = 64;
const CIRCUMFERENCE = 2 * Math.PI * GAUGE_R;

function loadName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistName(n: string) {
  try {
    window.localStorage.setItem(NAME_KEY, n);
  } catch {
    /* storage unavailable: silently skip */
  }
}

function submitResult(payload: {
  name: string;
  category: string;
  categoryName: string;
  score: number;
  total: number;
}) {
  fetch("/api/submit-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* best-effort logging: ignore network/server errors */
  });
}

const TIERS = [
  { min: 0.9, tier: "殿堂入り！せんべい博士", desc: "金吾堂のことなら何でも語れるレベルです。" },
  { min: 0.7, tier: "なかなかやるね！", desc: "ビジョンやこだわりがしっかり身についています。" },
  { min: 0.5, tier: "もう少し！復習しよう", desc: "惜しい！もう一度挑戦して理解を深めましょう。" },
  { min: 0, tier: "入門編からもう一周", desc: "焦らず一問ずつ、金吾堂の物語を覚えていきましょう。" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadBest(): BestScores {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistBest(next: BestScores) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: silently skip */
  }
}

const CAT_MAP: Record<string, (typeof CATEGORIES)[number]> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export default function QuizApp() {
  const [screen, setScreen] = useState<Screen>("name");
  const [best, setBest] = useState<BestScores>({});
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [catId, setCatId] = useState<CatSelection | null>(null);
  const [order, setOrder] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [perCat, setPerCat] = useState<PerCat>({});
  const [gaugeOffset, setGaugeOffset] = useState(CIRCUMFERENCE);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setBest(loadBest());
    const saved = loadName();
    if (saved) {
      setName(saved);
      setScreen("select");
    }
  }, []);

  function confirmName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setName(trimmed);
    persistName(trimmed);
    setScreen("select");
  }

  function changeName() {
    setNameInput(name);
    setScreen("name");
  }

  const currentQ = order[idx];
  const total = order.length;

  function startQuiz(id: CatSelection) {
    const pool = id === "mix" ? QUESTIONS : QUESTIONS_BY_CATEGORY[id] ?? [];
    const shuffled = shuffle(pool);
    const initialPerCat: PerCat = {};
    shuffled.forEach((q) => {
      if (!initialPerCat[q.cat]) initialPerCat[q.cat] = { correct: 0, total: 0 };
      initialPerCat[q.cat].total++;
    });
    setCatId(id);
    setOrder(shuffled);
    setIdx(0);
    setScore(0);
    setSelected(null);
    setPerCat(initialPerCat);
    setGaugeOffset(CIRCUMFERENCE);
    setScreen("quiz");
  }

  function selectAnswer(i: number) {
    if (selected !== null || !currentQ) return;
    setSelected(i);
    const isCorrect = i === currentQ.correct;
    if (isCorrect) {
      setScore((s) => s + 1);
      setPerCat((prev) => ({
        ...prev,
        [currentQ.cat]: {
          ...prev[currentQ.cat],
          correct: prev[currentQ.cat].correct + 1,
        },
      }));
    }
    requestAnimationFrame(() => nextBtnRef.current?.focus());
  }

  function goNext() {
    if (idx < total - 1) {
      setIdx((i) => i + 1);
      setSelected(null);
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    if (catId) {
      setBest((prev) => {
        const p = prev[catId];
        if (!p || score > p.score) {
          const next = { ...prev, [catId]: { score, total } };
          persistBest(next);
          return next;
        }
        return prev;
      });
      const categoryName = catId === "mix" ? "まるごとミックス" : CAT_MAP[catId]?.name ?? catId;
      submitResult({ name, category: catId, categoryName, score, total });
    }
    setScreen("result");
  }

  useEffect(() => {
    if (screen !== "result" || !total) return;
    const pct = score / total;
    const id = requestAnimationFrame(() => setGaugeOffset(CIRCUMFERENCE * (1 - pct)));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const pct = total ? Math.round((score / total) * 100) : 0;
  const tier = useMemo(
    () => TIERS.find((t) => pct / 100 >= t.min) ?? TIERS[TIERS.length - 1],
    [pct]
  );

  return (
    <div className="app">
      <header className="masthead">
        <div className="emblem" aria-hidden="true">
          <Image src="/logo.svg" alt="" width={243} height={56} priority />
        </div>
        <div className="eyebrow">株式会社金吾堂製菓</div>
        <h1 className="title display">金吾堂製菓まるわかり検定</h1>
        <p className="tagline">
          ビジョン「<b>みんなをまるく。世界をまるく。</b>」や社名の由来、おせんべいづくりのこだわりを選択式クイズで体感しよう。
        </p>
        {screen !== "name" && name && (
          <div className="welcome-row">
            <span>ようこそ、{name}さん</span>
            <button type="button" className="change-name" onClick={changeName}>
              (変更)
            </button>
          </div>
        )}
      </header>

      {screen === "name" && (
        <section>
          <div className="card">
            <form className="name-form" onSubmit={confirmName}>
              <label htmlFor="player-name">お名前を入力してください</label>
              <input
                id="player-name"
                className="name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="例：山田太郎"
                autoFocus
                maxLength={40}
              />
              <button type="submit" className="btn" disabled={!nameInput.trim()}>
                はじめる →
              </button>
            </form>
          </div>
        </section>
      )}

      {screen === "select" && (
        <section>
          <div className="card">
            <div className="cat-grid">
              {CATEGORIES.map((c) => {
                const b = best[c.id];
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="cat-card"
                    onClick={() => startQuiz(c.id)}
                  >
                    <div className="cat-badge" aria-hidden="true">
                      {c.badge}
                    </div>
                    <div>
                      <div className="cat-name">{c.name}</div>
                      <div className="cat-desc">{c.desc}</div>
                    </div>
                    <div className="cat-meta">
                      <span>全{QUESTIONS_BY_CATEGORY[c.id]?.length ?? 0}問</span>
                      {b && (
                        <span className="best-tag">
                          自己ベスト {b.score}/{b.total}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                className="cat-card mix"
                onClick={() => startQuiz("mix")}
              >
                <div className="cat-badge" aria-hidden="true">
                  全
                </div>
                <div>
                  <div className="cat-name">まるごとミックス</div>
                  <div className="cat-desc">全カテゴリからランダムに出題</div>
                  <div className="cat-meta">
                    <span>全{QUESTIONS.length}問</span>
                    {best.mix && (
                      <span className="best-tag">
                        自己ベスト {best.mix.score}/{best.mix.total}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>
          <footer className="hint">全{QUESTIONS.length}問 &middot; 4択形式 &middot; 制限時間なし</footer>
        </section>
      )}

      {screen === "quiz" && currentQ && (
        <section>
          <div className="quiz-top">
            <span className="q-count">
              問題 {idx + 1}/{total}
            </span>
            <span className="score-pill">正解 {score}</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(idx / total) * 100}%` }}
            />
          </div>
          <div className="card">
            <span className="cat-tag">{CAT_MAP[currentQ.cat]?.name}</span>
            <p className="question display">{currentQ.q}</p>
            <div className="choices">
              {currentQ.choices.map((choiceText, i) => {
                let cls = "choice";
                if (selected !== null) {
                  if (i === currentQ.correct) cls += " correct";
                  else if (i === selected) cls += " wrong";
                  else cls += " dim";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className={cls}
                    disabled={selected !== null}
                    onClick={() => selectAnswer(i)}
                  >
                    <span className="mark">{String.fromCharCode(65 + i)}</span>
                    <span>{choiceText}</span>
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <div
                className={`feedback ${
                  selected === currentQ.correct ? "is-correct" : "is-wrong"
                }`}
              >
                <p className="verdict">
                  {selected === currentQ.correct
                    ? "正解！"
                    : `残念、不正解。正解は「${currentQ.choices[currentQ.correct]}」`}
                </p>
                <p>{currentQ.explain}</p>
              </div>
            )}

            <div className="next-row">
              {selected !== null && (
                <button ref={nextBtnRef} className="btn" type="button" onClick={goNext}>
                  {idx === total - 1 ? "結果を見る →" : "次の問題へ →"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {screen === "result" && (
        <section>
          <div className="card">
            <div className="result-head">
              <span className="eyebrow">
                {catId === "mix" ? "まるごとミックス" : CAT_MAP[catId ?? ""]?.name}
              </span>
              <div className="gauge">
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r={GAUGE_R} fill="none" stroke="var(--surface-alt)" strokeWidth="14" />
                  <circle
                    cx="75"
                    cy="75"
                    r={GAUGE_R}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={gaugeOffset}
                    style={{ transition: "stroke-dashoffset .7s ease" }}
                  />
                </svg>
                <div className="pct">
                  <span className="num">{pct}%</span>
                  <span className="frac">
                    {score}/{total}問正解
                  </span>
                </div>
              </div>
              <p className="tier display">{tier.tier}</p>
              <p className="tier-desc">{tier.desc}</p>
            </div>

            {catId === "mix" && (
              <div className="breakdown">
                {CATEGORIES.map((c) => {
                  const pc = perCat[c.id];
                  if (!pc) return null;
                  const rpct = pc.total ? (pc.correct / pc.total) * 100 : 0;
                  return (
                    <div className="bd-row" key={c.id}>
                      <span className="bd-label">{c.name}</span>
                      <span className="bd-bar">
                        <span className="bd-fill" style={{ width: `${rpct}%` }} />
                      </span>
                      <span className="bd-frac">
                        {pc.correct}/{pc.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="result-actions">
              <button className="btn" type="button" onClick={() => catId && startQuiz(catId)}>
                もう一度挑戦
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setScreen("select")}
              >
                カテゴリ選択に戻る
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
