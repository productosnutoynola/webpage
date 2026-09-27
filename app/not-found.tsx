import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[720px] px-[22px] pb-[90px] pt-[60px] text-center">
      <h1 className="m-0 font-display text-[clamp(32px,4.6vw,52px)] font-extrabold tracking-[-.04em] text-vino">Esta página se la comieron</h1>
      <p className="mt-3.5 text-tinta/70">No encontramos lo que buscas. La granola sí sigue aquí.</p>
      <Link href="/#tienda" className="btn-primary press mt-7 px-7 py-[15px] text-[15.5px] hover:text-crema">Ir a la tienda</Link>
    </main>
  );
}
