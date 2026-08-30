import { ImageResponse } from "next/og";
import { getOrGenerateTopic } from "@/lib/topic";
import { getTopicImage } from "@/lib/storage";
import { todayIST } from "@/lib/date";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cabinet — one curiosity a day";

export default async function OpengraphImage() {
  // Reuses today's cached card (no extra Gemini/YouTube cost) — falls back
  // to a plain wordmark if generation ever fails, so a broken card never
  // breaks the share preview too.
  const topic = await getOrGenerateTopic(todayIST()).catch(() => null);
  const image = topic ? await getTopicImage(topic.date).catch(() => null) : null;

  const onImage = Boolean(image);
  const textColor = onImage ? "#fbfbfa" : "#171717";
  const secondaryColor = onImage ? "rgba(251,251,250,0.8)" : "#787774";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#fbfbfa",
        }}
      >
        {image && (
          <img
            src={`data:${image.mimeType};base64,${image.base64}`}
            width={size.width}
            height={size.height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Legibility scrim: darkens the bottom where the text sits,
            regardless of how bright/colorful the illustration is. */}
        {image && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              background:
                "linear-gradient(to top, rgba(10,8,6,0.92), rgba(10,8,6,0.35) 55%, rgba(10,8,6,0) 78%)",
            }}
          />
        )}

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: onImage ? "flex-end" : "center",
            padding: "70px 80px",
            fontFamily: "Georgia, serif",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize: 20,
              letterSpacing: 4,
              color: secondaryColor,
              textTransform: "uppercase",
              marginBottom: onImage ? 20 : 48,
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
                  color: onImage ? "#171717" : "#1f6c9f",
                  background: onImage ? "#f0c785" : "#e1f3fe",
                  borderRadius: 999,
                  padding: "8px 22px",
                  marginBottom: 28,
                }}
              >
                {topic.category}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 56,
                  fontStyle: "italic",
                  lineHeight: 1.15,
                  letterSpacing: -1,
                  color: textColor,
                }}
              >
                {topic.title}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", fontSize: 44, color: secondaryColor }}>
              one curiosity a day
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
