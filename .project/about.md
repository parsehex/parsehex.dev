# parsehex.dev

This is an experimental personal website built by and for a solo developer, who is the author of this document.

## Content

The majority of the content that I imagine is essentially mapping out things / information that have some importance to me -- TV shows and movies that I like, projects / tools / software that I use or make, etc. I'm not looking to thoroughly catalogue everything I can think of, but rather the things that pass the test of **"Do I give a shit about this?"**. For a specific example, I like the shows that Danny McBride (co-)creates, but I don't like `Eastbound and Down` enough to say much about it, so it likely won't be its own page.

### Presentation

I don't know exactly what I want as far as how to display this content. I can list some influences though:

- MySpace
- Wikipedia
- TiddlyWiki - Seems like TW should be a big point of inspiration as far as how to handle showing the types of content that I have and will/may have (the non-linearity in particular).

These are my thoughts as I figure out more of what I want to make:

- Everything is a Thing that I can track, organized into collections.
- I think there should be a base/general view that can display any kind of thing, in addition to views that are specific to a type of thing.
  - Example: `/shows[/:slug]` are 2 views for listing TV shows and viewing them, but a Base set of views could also render them but more generically.
  - The `shows` (and other specific) view(s) might implement displaying external data for example, whereas Base wouldn't.

## Hosting

The plan is to have this hosted on Cloudflare, ideally keeping within the free tier.
