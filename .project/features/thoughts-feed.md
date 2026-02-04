# Thoughts Feed

Thing entries can have a field called `thoughts`, format explained below, expressing something about that Thing.

## Examples

```yaml
thoughts:
	- '1769716714': Thought content
	- '1769718712': Thought with extra info
		arbitrary-key: Anything can go here really
```

Ideally, all info is displayed (possibly using special handling for certain keys -- unsure).

## Individual Thing Page

Obviously thoughts should be displayed on the page of the Thing they're on.

**`TODO`**: Refactor/Redesign to display the current list as (right) sidebar, and doing the same thing with References (underneath)

## Index Pages

I'd love to show thoughts from different Things on pages that list several things, turning them (in my view) into more like feeds.

I want this on more than just the home page, so it might be good to create a component for this that simply takes a list of things to use their thoughts. I'm thinking that we show it on whatever pages that show a listing of things.
Off the top of my head, that would be the home page and the type-index page.

I'm not sure what this should look like.
