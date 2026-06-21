import { CircleCheck as CheckCircle } from "lucide-react";

export default function ReferenceFeatureList({ items, accent }: { items: any; accent?: string }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((item: string, i: number) => (
        <li key={i} className="flex items-start gap-2.5">
          <CheckCircle
            size={15}
            className="flex-shrink-0 mt-[2px]"
            style={{ color: accent || "#076EFF" }}
          />
          <span className="text-gray-700 text-[14px] leading-[1.6]">{item}</span>
        </li>
      ))}
    </ul>
  );
}
