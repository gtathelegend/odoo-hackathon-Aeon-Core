type ScreenCardProps = {
  title: string;
  description: string;
  bullets: string[];
};

export function ScreenCard({ title, description, bullets }: ScreenCardProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p>{description}</p>
      <ul>
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}
