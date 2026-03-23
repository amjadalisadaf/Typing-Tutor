# Typing-Tutor
 TypeFlow — a full production-grade typing tutor in a single React component. Here's everything that's inside:
⌨ Typing Engine (fully ref-based, no stale closures)

Character-by-character validation with instant green/red highlighting
Animated blinking cursor following your position
Backspace handling (un-marks characters, adjusts counters)
WPM formula: (correctChars / 5) / elapsedMinutes
Accuracy formula: correctChars / totalTyped × 100
Timer rings down live; test ends on time-out or text completion

🎨 UI (Terminal × Productivity aesthetic)

Deep navy dark mode + crisp light mode with one toggle
JetBrains Mono for the typing area, Sora for all UI text
Gradient cyan→purple logo, animated XP fill bar, streak badge
30s / 60s / 120s durations, Easy / Medium / Hard text pools, Paragraph or Custom mode
Virtual QWERTY keyboard with heat-map coloring (yellow → orange → red) on your worst keys for this session

📊 Dashboard

WPM and Accuracy line charts (Recharts, last 20 sessions)
"Most mistyped keys" bar chart (cumulative across all sessions)
10 gamification badges (First Steps, Speed Demon, Century Club, Streak Master…)
All stats persisted in localStorage

🏆 Leaderboard — your personal bests sorted by WPM, with gold/silver/bronze rows and accuracy color-coding
🧠 AI Coach — calls the Anthropic API live: analyzes your worst keys, generates a custom exercise paragraph + 2 targeted tips, then lets you jump straight into practicing it
To use in your project:
bashnpm install recharts lucide-react
Drop TypeFlow.jsx into your Next.js or Vite React app and import it as the default export. No other config needed — fonts load from Google Fonts, localStorage handles persistence, and the Anthropic API key is injected automatically through claude.ai's proxy when running inside artifacts.
