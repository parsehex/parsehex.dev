// (imperfect) "house-of-cards-us" -> "House of Cards Us"
export function slugToTitle(slug: string) {
	if (!slug) return;
	const words = slug.toLowerCase().split('-');
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		if (i === 0) { }
		else if (['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'up'].includes(word)) { continue; }
		words[i] = word[0].toUpperCase() + word.substring(1);
	}
	return words.join(' ');
}

// "House of Cards (US)" -> "house-of-cards-us"
export function titleToSlug(title: string) {
	if (!title) return;
	title = title.replace(/[,.!?;;'"\[\]{}()/<>@&*^%$#]/g, '');
	title = title.trim().toLowerCase();
	title = title.replace(/\s/g, '-');
	return title;
}
