import { ImageResponse } from "next/og"

export const alt =
  "The Coffee Index, guía de cafeterías de especialidad en Chile"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f8f5ef",
          color: "#171717",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 64,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: 34,
              fontWeight: 600,
              gap: 18,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#171717",
                borderRadius: 999,
                color: "#f8f5ef",
                display: "flex",
                height: 64,
                justifyContent: "center",
                width: 64,
              }}
            >
              C
            </div>
            The Coffee Index
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 700,
              letterSpacing: -1,
              lineHeight: 1,
              maxWidth: 950,
            }}
          >
            Specialty coffee culture in Chile.
          </div>
          <div
            style={{
              color: "#5f5b55",
              display: "flex",
              fontSize: 34,
              lineHeight: 1.35,
              maxWidth: 860,
            }}
          >
            Cafeterías, barras y tostadores para guardar, visitar y volver a
            encontrar.
          </div>
        </div>
      </div>
    ),
    size
  )
}
