import { ApiHealth } from "./api-health";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Sajag</h1>
      <p className="mt-2">Project scaffold (milestone M0). The real interface arrives in M0.5.</p>
      <div className="mt-4">
        <ApiHealth />
      </div>
    </main>
  );
}
