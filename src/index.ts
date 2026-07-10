import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Hono } from "hono";

import { formatProperty, truncate, truncateHtml } from "./formatter";

interface NotionWebhookBody {
	data: PageObjectResponse;
}

type Widget =
	| {
			decoratedText: {
				topLabel: string;
				text: string;
				wrapText?: boolean;
			};
	  }
	| {
			buttonList: {
				buttons: {
					text: string;
					onClick: { openLink: { url: string } };
				}[];
			};
	  };

interface GoogleChatMessage {
	cardsV2: {
		cardId: string;
		card: {
			header?: { title: string };
			sections: { widgets: Widget[] }[];
		};
	}[];
}

async function sendGoogleChatMessage(
	spaceId: string,
	key: string,
	token: string,
	message: GoogleChatMessage,
) {
	const url = new URL(
		`https://chat.googleapis.com/v1/spaces/${spaceId}/messages`,
	);
	// searchParams.set encodes exactly once ("=" -> "%3D"), matching the URL Google issues
	url.searchParams.set("key", key);
	url.searchParams.set("token", token);

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=UTF-8",
		},
		body: JSON.stringify(message),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(errorBody);

		throw new Error("Google Chat API error", { cause: errorBody });
	}

	return response;
}

const app = new Hono();

app.post("/:spaceId", async (c) => {
	const spaceId = c.req.param("spaceId");

	// Use URLSearchParams (not c.req.query) so decoding is the exact inverse
	// of the client's URLSearchParams encoding — the token contains "=" padding
	const searchParams = new URL(c.req.url).searchParams;
	const key = searchParams.get("key");
	const token = searchParams.get("token");

	if (!key || !token) {
		return c.text("Missing 'key' or 'token' query parameter", 400);
	}

	const title = searchParams.get("title");
	const body = await c.req.json<NotionWebhookBody>();

	await sendGoogleChatMessage(spaceId, key, token, {
		cardsV2: [
			{
				cardId: "notion-page",
				card: {
					...(title ? { header: { title: truncate(title) } } : {}),
					sections: [
						{
							widgets: [
								...Object.entries(body.data.properties).map(
									([name, property]): Widget => ({
										decoratedText: {
											topLabel: truncate(name),
											text: truncateHtml(formatProperty(property)),
											wrapText: true,
										},
									}),
								),
								{
									buttonList: {
										buttons: [
											{
												text: "Open in Notion",
												onClick: { openLink: { url: body.data.url } },
											},
										],
									},
								},
							],
						},
					],
				},
			},
		],
	});

	return c.body(null, 204);
});

export default app;
