const LowercaseTitleWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'up'];

// (imperfect) "house-of-cards-us" -> "House of Cards Us"
export function slugToTitle(slug: string) {
	if (!slug) return;
	const words = slug.toLowerCase().split('-');
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		if (i === 0) { }
		else if (LowercaseTitleWords.includes(word)) { continue; }
		words[i] = word[0].toUpperCase() + word.substring(1);
	}
	return words.join(' ');
}

// "theRighteousGemstones" -> "The Righteous Gemstones"
export function camelToTitle(camel: string) {
	let wordsArr = [];
	let curWord = '';
	for (let i = 0; i < camel.length; i++) {
		const char = camel[i];
		// if (!char) continue;
		if (!curWord) {
			curWord += char;
			continue;
		}
		if (char === char.toUpperCase()) {
			wordsArr.push(curWord);
			curWord = char; // new word
			continue;
		}
		curWord += char;
	}
	if (curWord) wordsArr.push(curWord);
	wordsArr = wordsArr.map((w) => LowercaseTitleWords.includes(w) ? w : (w[0].toUpperCase() + w.substring(1)));
	return wordsArr.join(' ');
}

// "House of Cards (US)" -> "house-of-cards-us"
export function titleToSlug(title: string) {
	if (!title) return;
	title = title.replace(/[,.!?;;'"\[\]{}()/<>@&*^%$#]/g, '');
	title = title.trim().toLowerCase();
	title = title.replace(/\s/g, '-');
	return title;
}
