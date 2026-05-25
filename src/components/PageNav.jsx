import { Link } from "react-router-dom"

export default function PageNav({ active = "home", right = null }) {
  const linkClass = (name) =>
    `rounded-full px-3 py-2 text-sm transition sm:px-4 ${
      active === name
        ? "bg-white font-semibold text-neutral-950"
        : "text-neutral-300 hover:bg-white/10 hover:text-white"
    }`

  return (
    <header className="mb-5 rounded-full border border-white/10 bg-neutral-950/95 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur sm:px-4">
      <div className="flex items-center justify-center sm:justify-between">
        <nav className="grid w-full grid-cols-3 gap-1 rounded-full bg-white/[0.04] p-1 text-center text-xs sm:w-auto sm:flex sm:items-center sm:text-sm">
          <Link to="/" className={linkClass("home")}>Home</Link>
          <Link to="/movies" className={linkClass("movies")}>Movies</Link>
          <Link to="/videos" className={linkClass("videos")}>Videos</Link>
        </nav>

        {right ? <div className="hidden sm:block">{right}</div> : null}
      </div>
    </header>
  )
}
