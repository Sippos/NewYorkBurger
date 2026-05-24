import { Link } from "react-router-dom"

export default function PageNav({ title = "New York Burger", active = "home", right = null }) {
  const linkClass = (name) =>
    `rounded-full px-3 py-2 text-sm transition sm:px-4 ${
      active === name
        ? "bg-white font-semibold text-neutral-950"
        : "text-neutral-300 hover:bg-white/10 hover:text-white"
    }`

  return (
    <header className="mb-5 rounded-[1.75rem] border border-white/10 bg-neutral-950/95 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur sm:rounded-full sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="truncate px-1 text-base font-semibold tracking-tight text-white sm:text-sm">
          {title}
        </Link>

        <nav className="grid grid-cols-3 gap-1 rounded-full bg-white/[0.04] p-1 text-center text-xs sm:flex sm:items-center sm:text-sm">
          <Link to="/" className={linkClass("home")}>Home</Link>
          <Link to="/movies" className={linkClass("movies")}>Movies</Link>
          <Link to="/videos" className={linkClass("videos")}>Videos</Link>
        </nav>

        {right ? <div className="hidden sm:block">{right}</div> : null}
      </div>
    </header>
  )
}
