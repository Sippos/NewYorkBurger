export default function App() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
      <h1 className="mb-10 text-center text-5xl md:text-7xl font-black italic tracking-tight">
        NEW YORK
        <span className="mx-4 inline-block text-red-600 animate-spin">★</span>
        BURGER
      </h1>

      <img
        src={`${import.meta.env.BASE_URL}assets/IMG_4107.jpeg`}
        alt="New York Burger storefront"
        className="w-full max-w-[420px] rounded-2xl shadow-2xl"
/>
    </main>
  )
}