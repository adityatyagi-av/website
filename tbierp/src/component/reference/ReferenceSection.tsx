import ReferenceFeatureList from "./ReferenceFeatureList";

export default function ReferenceSection({ section }: {section: any}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">
        {section.heading}
      </h2>

      {section.content && (
        <p className="text-gray-700 leading-[1.75] text-base mb-3">
          {section.content}
        </p>
      )}

      {section.list && <ReferenceFeatureList items={section.list} />}
    </section>
  );
}
