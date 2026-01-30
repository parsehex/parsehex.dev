# AI Integration

I want to use LLM(s) to produce content distilled from other content.

Some specifics:

- `ai_summary`: Whereas `summary` is how I would describe a Thing, this provides a summary of this Thing on the site.
  - I want to run the LLM(s) locally, so I figured that using git commit hooks would work - there could be a command to trigger generating manually which would skip the hook (it would see that there's already one and not re-do).
  - We'll use a non-tracked folder for keeping track of file content for when it needs re-made. This point can be up for debate.
    - Maybe the folder could be uploaded to cloudflare with the rest of it? idk how wrangler works if it's possible
