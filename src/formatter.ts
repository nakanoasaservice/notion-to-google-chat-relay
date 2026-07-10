import type {
	GroupObjectResponse,
	PageObjectResponse,
	PartialUserObjectResponse,
	RichTextItemResponse,
	UserObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

type RemoveId<T> = T extends unknown ? Omit<T, "id"> : never;
type Property = RemoveId<PageObjectResponse["properties"][number]>;

type DateResponse = Extract<Property, { type: "date" }>["date"];

// Google Chat card text parses HTML-like tags, so literal & < > " must be escaped
export function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

const TRUNCATION_SUFFIX = "…";

// Google Chat documents no per-field character limits for cards v2 — the hard
// limit is 32,000 bytes per message (including cards). The caps below keep
// long values readable and the message safely under that limit.
export function truncate(text: string): string {
	const maxLength = 200;
	const chars = [...text];
	if (chars.length <= maxLength) {
		return text;
	}
	return (
		chars.slice(0, maxLength - TRUNCATION_SUFFIX.length).join("") +
		TRUNCATION_SUFFIX
	);
}

// Google Chat renders card text as HTML, so truncation counts a tag as zero
// characters and an escaped entity as one — cutting inside either would
// corrupt the markup — and re-closes an <a> left open by the cut.
export function truncateHtml(html: string): string {
	const maxLength = 1000;
	const tokens = html.match(/<[^>]*>|&(?:amp|lt|gt|quot);|./gsu) ?? [];
	const visibleLength = tokens.filter((token) => !token.startsWith("<")).length;
	if (visibleLength <= maxLength) {
		return html;
	}

	const budget = maxLength - TRUNCATION_SUFFIX.length;
	let result = "";
	let visible = 0;
	let inLink = false;
	for (const token of tokens) {
		if (visible >= budget) {
			break;
		}
		if (token.startsWith("<")) {
			result += token;
			if (token.startsWith("<a ")) {
				inLink = true;
			} else if (token === "</a>") {
				inLink = false;
			}
		} else {
			result += token;
			visible++;
		}
	}

	// Drop a link opened right at the cut so we don't emit an "…"-only link
	const withoutDanglingOpen = result.replace(/<a [^>]*>$/, "");
	if (withoutDanglingOpen !== result) {
		result = withoutDanglingOpen;
		inLink = false;
	}

	return result + TRUNCATION_SUFFIX + (inLink ? "</a>" : "");
}

function formatLink(text: string, url: string): string {
	return `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`;
}

function formatPerson(
	person: PartialUserObjectResponse | UserObjectResponse | GroupObjectResponse,
): string {
	if ("name" in person) {
		return escapeHtml(person.name ?? person.id);
	}
	return person.id;
}

function formatDate(date: DateResponse): string {
	if (!date) return "[No Date]";

	const dateStr = date.end ? `${date.start} - ${date.end}` : date.start;

	if (date.time_zone) {
		return `${dateStr} (${date.time_zone})`;
	}

	return dateStr;
}

function formatRichText(richText: RichTextItemResponse): string {
	switch (richText.type) {
		case "text":
			if (richText.text.link) {
				return formatLink(richText.text.content, richText.text.link.url);
			}
			return escapeHtml(richText.text.content);
		case "mention":
			switch (richText.mention.type) {
				case "user":
					return formatPerson(richText.mention.user);
				case "date":
					return formatDate(richText.mention.date);
				case "link_preview":
					return formatLink(
						richText.plain_text,
						richText.mention.link_preview.url,
					);
				case "template_mention":
					return escapeHtml(richText.plain_text);
				case "page":
					return formatLink(
						richText.plain_text,
						`https://app.notion.com/p/${richText.mention.page.id.replaceAll("-", "")}`,
					);
				case "database":
					return formatLink(
						richText.plain_text,
						`https://app.notion.com/p/${richText.mention.database.id.replaceAll("-", "")}`,
					);
				case "link_mention":
					return formatLink(
						richText.mention.link_mention.title ?? richText.plain_text,
						richText.mention.link_mention.href,
					);
				case "custom_emoji":
					return formatLink(
						richText.mention.custom_emoji.name,
						richText.mention.custom_emoji.url,
					);
				default:
					return "[Unsupported Mention Type]";
			}
		case "equation":
			return escapeHtml(richText.plain_text);
		default:
			return `[Unsupported Rich Text Type: ${escapeHtml(JSON.stringify(richText, null, 2))}]`;
	}
}

export function formatProperty(property: Property): string {
	switch (property.type) {
		case "title":
			return property.title.map(formatRichText).join("") || "[Empty Title]";
		case "rich_text":
			return property.rich_text.map(formatRichText).join("") || "[Empty Text]";
		case "url":
			return property.url ? formatLink(property.url, property.url) : "[No URL]";
		case "select":
			return property.select
				? escapeHtml(property.select.name)
				: "[No Selection]";
		case "multi_select":
			return (
				property.multi_select
					?.map((select) => escapeHtml(select.name))
					.join(", ") || "[No Selections]"
			);
		case "date":
			return formatDate(property.date);
		case "checkbox":
			return property.checkbox ? "✅" : "❌";
		case "email":
			return property.email ? escapeHtml(property.email) : "[No Email]";
		case "phone_number":
			return property.phone_number
				? escapeHtml(property.phone_number)
				: "[No Phone]";
		case "number":
			return property.number?.toString() ?? "[No Number]";
		case "status":
			return property.status ? escapeHtml(property.status.name) : "[No Status]";
		case "created_time":
			return property.created_time ?? "[No Time]";
		case "last_edited_time":
			return property.last_edited_time ?? "[No Time]";
		case "created_by":
			return formatPerson(property.created_by);
		case "last_edited_by":
			return formatPerson(property.last_edited_by);
		case "unique_id":
			return property.unique_id.number === null
				? "[No ID]"
				: property.unique_id.prefix === null
					? property.unique_id.number.toString()
					: `${escapeHtml(property.unique_id.prefix)}-${property.unique_id.number}`;
		case "relation":
			return (
				property.relation
					.map((relation) =>
						formatLink(
							"Open in Notion",
							`https://app.notion.com/p/${relation.id.replaceAll("-", "")}`,
						),
					)
					.join(", ") || "[No Relations]"
			);
		case "people":
			return property.people.map(formatPerson).join(", ") || "[No People]";
		case "formula":
			switch (property.formula.type) {
				case "string":
					return property.formula.string
						? escapeHtml(property.formula.string)
						: "[No Formula String]";
				case "number":
					return property.formula.number?.toString() ?? "[No Formula Number]";
				case "boolean":
					return property.formula.boolean === null
						? "[No Formula Boolean]"
						: property.formula.boolean
							? "✅"
							: "❌";
				case "date":
					return formatDate(property.formula.date);
				default:
					return "[Unsupported Formula Type]";
			}
		case "files":
			return (
				property.files
					.map((file) => {
						switch (file.type) {
							case "file":
								return formatLink(file.name, file.file.url);
							case "external":
								return formatLink(file.name, file.external.url);
							default:
								if ("name" in file) {
									return escapeHtml((file as { name: string }).name);
								}
								return "[Unsupported File Type]";
						}
					})
					.join(", ") || "[No Files]"
			);
		case "rollup":
			switch (property.rollup.type) {
				case "number":
					return property.rollup.number?.toString() ?? "[No Rollup Number]";
				case "date":
					return formatDate(property.rollup.date);
				case "array":
					return (
						property.rollup.array?.map(formatProperty).join(", ") ??
						"[Empty Rollup Array]"
					);
				default:
					return "[Unsupported Rollup Type]";
			}
		case "verification":
			return property.verification
				? property.verification.state === "unverified"
					? "🔴 Unverified"
					: property.verification.state === "expired"
						? "🟡 Expired"
						: "🟢 Verified"
				: `[No Verification]`;
		case "button":
			return "[Button]";
		case "place":
			return property.place
				? property.place.name
					? property.place.address == null ||
						property.place.name === property.place.address
						? escapeHtml(property.place.name)
						: escapeHtml(`${property.place.name}\n${property.place.address}`)
					: property.place.address
						? escapeHtml(property.place.address)
						: `(${property.place.lat}, ${property.place.lon})`
				: "[No Place]";
		default:
			return `[Unsupported Type: ${escapeHtml(JSON.stringify(property, null, 2))}]`;
	}
}
