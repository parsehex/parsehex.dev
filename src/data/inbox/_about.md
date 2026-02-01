# About `inbox/` Files

The files within `inbox/` contain entries which haven't been added to the site yet, intended for use with the `new` script (`scripts/new.ts`) or a new one.

Each file contains 1 or more lists, keyed using tag names. Each item is either a string or an array of 1 object. The value (if string) or the object's key is used as the entry's title, using the object's single value as notes (if present).

## Example

The following represents a list of 2 movies tagged as `comedy`, Police Academy and Superbad. Only Superbad contains a value for notes, which is "Movie that I watched when younger".

```yaml
comedy:
  - Police Academy
  - Superbad: Movie that I watched when younger
```

## CLI Usage (plan)

What I want is to be able see a list of types that have items (e.g. movies, shows) and be able to drill into them to see their list of items to choose from in order to start an entry from.

This could be its own script, which calls the `new` script when a selection is made (which should remove from the inbox file).
