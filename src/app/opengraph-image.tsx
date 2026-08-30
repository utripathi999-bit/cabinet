import { ImageResponse } from "next/og";
import { getOrGenerateTopic } from "@/lib/topic";
import { todayIST } from "@/lib/date";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cabinet — one curiosity a day";

export default async function OpengraphImage() {
  // Reuses today's cached card (no extra Gemini/YouTube cost) — falls back
  // to a plain wordmark if generation ever fails, so a broken card never
  // breaks the share preview too.
  const topic = await getOrGenerateTopic(todayIST()).catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#fbfbfa",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: 4,
            color: "#171717",
            textTransform: "uppercase",
            marginBottom: 48,
          }}
        >
          Cabinet
        </div>

        {topic ? (
          <>
            <div
              style={{
                display: "flex",
                fontFamily: "monospace",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "#1f6c9f",
                background: "#e1f3fe",
                borderRadius: 999,
                padding: "8px 22px",
                marginBottom: 36,
              }}
            >
              {topic.category}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 58,
                fontStyle: "italic",
                lineHeight: 1.15,
                letterSpacing: -1,
                color: "#171717",
              }}
            >
              {topic.title}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", fontSize: 44, color: "#787774" }}>
            one curiosity a day
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
