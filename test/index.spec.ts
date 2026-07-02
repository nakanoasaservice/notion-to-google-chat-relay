import { beforeEach, describe, expect, it, vi } from "vitest";

import app from "../src/index";

const notionPayload = {
	data: {
		url: "https://example.com",
		properties: {
			name: {
				type: "title",
				title: [
					{
						type: "text",
						text: { content: "Test", link: null },
						annotations: {
							bold: false,
							italic: false,
							strikethrough: false,
							underline: false,
							code: false,
							color: "default",
						},
						plain_text: "Test",
						href: null,
					},
				],
			},
		},
	},
};

describe("Notion to Google Chat Bot worker", () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => "",
		});
		global.fetch = mockFetch as unknown as typeof global.fetch;
	});

	it("forwards the Notion payload as a cardsV2 message", async () => {
		const response = await app.request(
			"/AAAA1234?key=test-key&token=abc123%3D&title=Task%20Updated",
			{
				method: "POST",
				body: JSON.stringify(notionPayload),
			},
		);

		expect(response.status).toBe(204);
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const [calledUrl, init] = mockFetch.mock.calls[0] as [
			URL | string,
			RequestInit,
		];

		const url = new URL(String(calledUrl));
		expect(url.origin).toBe("https://chat.googleapis.com");
		expect(url.pathname).toBe("/v1/spaces/AAAA1234/messages");
		expect(url.searchParams.get("key")).toBe("test-key");
		// Pin the decode-once/encode-once round trip: the "=" padding must be
		// percent-encoded exactly once in the outgoing URL
		expect(url.searchParams.get("token")).toBe("abc123=");
		expect(url.search).toContain("token=abc123%3D");
		expect(url.search).not.toContain("%253D");

		expect(init.method).toBe("POST");
		expect(init.headers).toMatchObject({
			"Content-Type": "application/json; charset=UTF-8",
		});

		const body = JSON.parse(String(init.body));
		const card = body.cardsV2[0].card;
		expect(body.cardsV2[0].cardId).toBe("notion-page");
		expect(card.header).toEqual({ title: "Task Updated" });

		const widgets = card.sections[0].widgets;
		expect(widgets[0]).toEqual({
			decoratedText: {
				topLabel: "name",
				text: "Test",
				wrapText: true,
			},
		});
		expect(widgets[widgets.length - 1]).toEqual({
			buttonList: {
				buttons: [
					{
						text: "Open in Notion",
						onClick: { openLink: { url: "https://example.com" } },
					},
				],
			},
		});
	});

	it("omits the card header when no title is given", async () => {
		const response = await app.request("/AAAA1234?key=test-key&token=abc", {
			method: "POST",
			body: JSON.stringify(notionPayload),
		});

		expect(response.status).toBe(204);

		const init = mockFetch.mock.calls[0]?.[1] as RequestInit;
		const body = JSON.parse(String(init.body));
		expect(body.cardsV2[0].card.header).toBeUndefined();
	});

	it("responds with 400 when key or token is missing", async () => {
		const response = await app.request("/AAAA1234", {
			method: "POST",
			body: JSON.stringify(notionPayload),
		});

		expect(response.status).toBe(400);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
