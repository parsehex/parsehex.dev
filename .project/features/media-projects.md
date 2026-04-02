# Media Projects

This page is to explain the feature that can be found under the path `/projects/ai-content/*`.

## What is This

This is where a Thing has a final result, as well as a history of intermediary results, all of which can be played on the page.

## Song History

This is a component used for generated songs, allowing the user to play previous versions of a song and view associated metadata.

## Metadata

Generally, any media will have some kind of info that's specific to that piece of media. Some media will have data embedded in the file, while others will need to be input manually.

## Media Storage / Developer Experience

The public site will use R2 to store media content.

I would like to place media into this project's folder, to:

1. use in `dev` mode: the links will be to the local copies.
2. use in production by ensuring the R2 bucket's content (of a subfolder, if needed) matches the local one. I expect some url or other conversion to get it working.

The media folder would be ignored in git, though it'd be helpful to explore options to achieve similar as git but for that folder. Currently, the site is being deployed from a local machine and this will probably remain unchanged, but it would be good to be able to recreate/maintain the code + untracked content on another machine.
