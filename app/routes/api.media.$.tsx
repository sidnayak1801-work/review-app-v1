import type { LoaderFunctionArgs } from "react-router";

import { mediaStorage } from "../services/media-storage.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const key = params["*"]?.replace(/^\/+/, "") ?? "";
  if (!key || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  if (typeof mediaStorage.readObject !== "function") {
    return new Response("Not found", { status: 404 });
  }

  const object = await mediaStorage.readObject(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
};
