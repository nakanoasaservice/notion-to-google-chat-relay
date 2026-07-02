import { describe, expect, it } from "vitest";

import { escapeHtml, formatProperty } from "../src/formatter";

type Property = Parameters<typeof formatProperty>[0];

function richText(
	content: string,
	link: { url: string } | null = null,
): object {
	return {
		type: "text",
		text: { content, link },
		annotations: {
			bold: false,
			italic: false,
			strikethrough: false,
			underline: false,
			code: false,
			color: "default",
		},
		plain_text: content,
		href: link?.url ?? null,
	};
}

describe("escapeHtml", () => {
	it("escapes &, <, > and quotes", () => {
		expect(escapeHtml('a & <b> "c"')).toBe("a &amp; &lt;b&gt; &quot;c&quot;");
	});
});

describe("formatProperty", () => {
	it("renders rich text links as <a> tags", () => {
		const property = {
			type: "rich_text",
			rich_text: [richText("Docs", { url: "https://example.com" })],
		} as unknown as Property;

		expect(formatProperty(property)).toBe(
			'<a href="https://example.com">Docs</a>',
		);
	});

	it("escapes HTML in plain rich text", () => {
		const property = {
			type: "rich_text",
			rich_text: [richText("<script> & stuff")],
		} as unknown as Property;

		expect(formatProperty(property)).toBe("&lt;script&gt; &amp; stuff");
	});

	it("linkifies url properties", () => {
		const property = {
			type: "url",
			url: "https://example.com/?a=1&b=2",
		} as unknown as Property;

		expect(formatProperty(property)).toBe(
			'<a href="https://example.com/?a=1&amp;b=2">https://example.com/?a=1&amp;b=2</a>',
		);
	});

	it("renders files as comma-joined links", () => {
		const property = {
			type: "files",
			files: [
				{
					type: "file",
					name: "report.pdf",
					file: { url: "https://files.example.com/report.pdf" },
				},
				{
					type: "external",
					name: "spec",
					external: { url: "https://example.com/spec" },
				},
			],
		} as unknown as Property;

		expect(formatProperty(property)).toBe(
			'<a href="https://files.example.com/report.pdf">report.pdf</a>, <a href="https://example.com/spec">spec</a>',
		);
	});

	it("renders relations as app.notion.com links without dashes", () => {
		const property = {
			type: "relation",
			relation: [
				{ id: "12345678-90ab-cdef-1234-567890abcdef" },
				{ id: "abcdef12-3456-7890-abcd-ef1234567890" },
			],
		} as unknown as Property;

		expect(formatProperty(property)).toBe(
			'<a href="https://app.notion.com/p/1234567890abcdef1234567890abcdef">Open in Notion</a>, ' +
				'<a href="https://app.notion.com/p/abcdef1234567890abcdef1234567890">Open in Notion</a>',
		);
	});

	it("does not double-escape values inside rollup arrays", () => {
		const property = {
			type: "rollup",
			rollup: {
				type: "array",
				array: [
					{
						type: "rich_text",
						rich_text: [richText("a & b")],
					},
				],
			},
		} as unknown as Property;

		expect(formatProperty(property)).toBe("a &amp; b");
	});
});
