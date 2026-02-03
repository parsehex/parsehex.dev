# Editor

This is a local-use tool for editing the same with a GUI. It's meant to take the place of using CLI scripts (which can be found in (from project root) `/scripts/*`).

## Features

- Browse existing content
- Add, Edit or Delete content
  - Can add from Inbox (like `inbox` script)
  - Metadata and page content (if mdx page)
    - Can add Thoughts to an entry (`think` script)
  - Add/Manage SongHistory component
    - Enable on an entry will add the component
    - Able to upload new versions, set main song

## Creating

To start, the user runs a command which starts a web server for this.

It doesn't seem like Astro is needed for this, though I could be wrong. I will point out again that this editor is internal and won't be public-facing itself.
