import { CircleCheck as CheckCircle } from "lucide-react";

export default function ReferenceFeatureList({ items }: {items: any}) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <CheckCircle
            size={16}
            className="text-[#076EFF] flex-shrink-0 mt-0.5"
          />
          <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}
