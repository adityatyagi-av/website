import ReferenceFeatureList from "./ReferenceFeatureList";

export default function ReferenceSection({ section, accent }: { section: any; accent?: string }) {
  return (
    <section className="mb-9">
      <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-3 pb-2.5 border-b border-gray-100">
        {section.heading}
      </h2>

      {section.content && (
        <p className="text-gray-600 leading-[1.75] text-[15px] mb-3">
          {section.content}
        </p>
      )}

      {section.list && <ReferenceFeatureList items={section.list} accent={accent} />}
    </section>
  );
}
