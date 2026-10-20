/* เส้นบอกระยะแบบงานเขียนแบบ — DESIGN-SPEC §3: เป็น component จริง ใช้เฉพาะหน้าแปลน/ผัง/สเปก
   พิกัดที่รับเป็นพิกัดภายใน SVG (หน่วยเมตร) ตัวเลขบนเส้นต้องมาจาก geometry ห้ามพิมพ์มือ */

type Props = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  /** ความยาวขีดปลายเส้น */
  tick?: number;
  fontSize?: number;
  /** ผังทั้งแผ่นถูกหมุนอยู่กี่องศา (ผังโครงการแนวตั้งบนมือถือ = 90) — ตัวเลขจะกลับด้านให้อ่านตั้งตรงบนจอ */
  frameDeg?: number;
};

export function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  tick = 0.2,
  fontSize = 0.3,
  frameDeg = 0,
}: Props) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const head = 0.26;
  const wing = 0.075;
  const arrow = (px: number, py: number, dir: 1 | -1) =>
    [
      `${px},${py}`,
      `${px + dir * head * ux + wing * nx},${py + dir * head * uy + wing * ny}`,
      `${px + dir * head * ux - wing * nx},${py + dir * head * uy - wing * ny}`,
    ].join(" ");

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  /* มุมบนจอ = มุมในผัง + มุมที่ผังถูกหมุน · พลิกให้อยู่ในช่วงอ่านได้ แล้วแปลงกลับเป็นมุมในผัง */
  let screen = (Math.atan2(dy, dx) * 180) / Math.PI + frameDeg;
  while (screen > 180) screen -= 360;
  while (screen <= -180) screen += 360;
  if (screen > 90 || screen < -90) screen += 180;
  const angle = screen - frameDeg;

  return (
    <g className="stroke-pine fill-pine" strokeWidth={0.02}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 + tick * nx} y1={y1 + tick * ny} x2={x1 - tick * nx} y2={y1 - tick * ny} />
      <line x1={x2 + tick * nx} y1={y2 + tick * ny} x2={x2 - tick * nx} y2={y2 - tick * ny} />
      <polygon points={arrow(x1, y1, 1)} stroke="none" />
      <polygon points={arrow(x2, y2, -1)} stroke="none" />
      <text
        x={mx + 0.16 * nx}
        y={my + 0.16 * ny}
        transform={`rotate(${angle} ${mx + 0.16 * nx} ${my + 0.16 * ny})`}
        textAnchor="middle"
        dominantBaseline="auto"
        className="font-display fill-pine"
        fontSize={fontSize}
        fontWeight={600}
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}
