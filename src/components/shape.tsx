export type ShapeKind = "triangle" | "diamond" | "circle" | "square";

export const SHAPE_ORDER: ShapeKind[] = [
  "triangle",
  "diamond",
  "circle",
  "square",
];
export const LETTERS = ["A", "B", "C", "D"] as const;

export function Shape({
  kind,
  size = 26,
  stroke = "currentColor",
  fill = "none",
  weight = 2.4,
}: {
  kind: ShapeKind;
  size?: number;
  stroke?: string;
  fill?: string;
  weight?: number;
}) {
  const c = size / 2;
  const common = {
    stroke,
    strokeWidth: weight,
    fill,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  const el =
    kind === "triangle" ? (
      <polygon
        points={`${c},${size * 0.14} ${size * 0.9},${size * 0.86} ${size * 0.1},${size * 0.86}`}
        {...common}
      />
    ) : kind === "diamond" ? (
      <polygon
        points={`${c},${size * 0.1} ${size * 0.9},${c} ${c},${size * 0.9} ${size * 0.1},${c}`}
        {...common}
      />
    ) : kind === "circle" ? (
      <circle cx={c} cy={c} r={size * 0.38} {...common} />
    ) : (
      <rect
        x={size * 0.14}
        y={size * 0.14}
        width={size * 0.72}
        height={size * 0.72}
        rx={size * 0.1}
        {...common}
      />
    );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {el}
    </svg>
  );
}
