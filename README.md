# pi-hemingway-output-readability-score

A Pi plugin that shows the English readability grade of the final assistant reply in the footer.

## Features

- Displays `Hemingway: Grade N` using Hemingway's document-grade formula.
- Scores the whole final reply, excluding thinking, tool calls and incomplete responses.
- Clears the score during generation and updates when the agent finishes.
- Refreshes on reload, session changes and tree navigation.
- Runs locally without model calls, downloads or API keys.
- Leaves the assistant's text unchanged.