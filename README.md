# pi-hemingway-output-readability-score

Shows `Hemingway: Grade N` in Pi's existing footer for the whole final assistant reply. No model calls, downloads, reports or text changes.

## Use

Requires Pi 0.86.1+ and Node 24.2+. Install from npm:

```sh
pi install npm:pi-hemingway-output-readability-score
```

Or install from GitHub:

```sh
pi install git:github.com/xRyul/pi-hemingway-output-readability-score
```

Then run `/reload` in Pi. No build step or API key is needed.

For local development, symlink this directory into `~/.pi/agent/extensions/pi-hemingway-output-readability-score` instead. Use only one installation method to avoid duplicate loading.

- Updates after the agent settles, not during streaming or tool rounds. Ignores thinking, tools and incomplete responses.
- Recomputes on reload/session changes/tree navigation; clears while generating.
- Uses Hemingway's document-grade formula and sentence rules. English readability estimate, not a correctness or meaning check.
- Basic Markdown flattening keeps code contents. Abbreviations, ASCII word counts and physical line breaks affect the grade; complex rendered Markdown can differ.
- Hides the score for uncountable or oversized output (over 1,000,000 characters). Custom footers must display Pi's extension statuses.

`index.ts` handles the footer; `readability.ts` calculates the score. Both use only the existing Pi host and Node standard library at runtime.

## Check

```sh
npm test
```

One dependency-free test file checks representative grades and final-response footer behaviour. No SDK download, engine cache or model request is needed.
