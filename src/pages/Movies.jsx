import { useState } from "react";

const initialMovies = [
  {
    id: 1,
    title: "The Room",
    year: 2003,
    poster: "https://image.tmdb.org/t/p/w500/9BgcTVk5KZV9g0u6Q4Q0V6g9Z9Q.jpg",
  },
  {
    id: 2,
    title: "Sharknado",
    year: 2013,
    poster: "https://image.tmdb.org/t/p/w500/8W4t7k9Q6VQz0cQ0fQ0Q0Q0Q0Q.jpg",
  },
  {
    id: 3,
    title: "Birdemic: Shock and Terror",
    year: 2010,
    poster: "https://image.tmdb.org/t/p/w500/7Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0.jpg",
  },
];

export default function Movies() {
  const [movies, setMovies] = useState(initialMovies);
  const [liked, setLiked] = useState([]);
  const [disliked, setDisliked] = useState([]);

  const current = movies[0];

  const handleVote = (type) => {
    if (!current) return;

    if (type === "like") {
      setLiked([...liked, current]);
    } else {
      setDisliked([...disliked, current]);
    }

    setMovies(movies.slice(1));
  };

  const reset = () => {
    setMovies(initialMovies);
    setLiked([]);
    setDisliked([]);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎬 Thursday Movie Vote</h1>

      {current ? (
        <div style={styles.card}>
          <img src={current.poster} alt={current.title} style={styles.image} />

          <h2>{current.title}</h2>
          <p>{current.year}</p>

          <div style={styles.buttons}>
            <button style={styles.nope} onClick={() => handleVote("dislike")}>
              ❌ Skip
            </button>

            <button style={styles.like} onClick={() => handleVote("like")}>
              ❤️ Watch
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.done}>
          <h2>Voting complete 🎉</h2>

          <h3>❤️ Liked</h3>
          {liked.map((m) => (
            <p key={m.id}>{m.title}</p>
          ))}

          <h3>❌ Skipped</h3>
          {disliked.map((m) => (
            <p key={m.id}>{m.title}</p>
          ))}

          <button onClick={reset} style={styles.reset}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 20,
    color: "white",
    background: "#111",
    minHeight: "100vh",
  },
  title: {
    marginBottom: 20,
  },
  card: {
    width: 300,
    background: "#222",
    padding: 15,
    borderRadius: 12,
    textAlign: "center",
  },
  image: {
    width: "100%",
    borderRadius: 10,
    marginBottom: 10,
  },
  buttons: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 15,
  },
  like: {
    background: "#22c55e",
    border: "none",
    padding: "10px 15px",
    borderRadius: 8,
    cursor: "pointer",
  },
  nope: {
    background: "#ef4444",
    border: "none",
    padding: "10px 15px",
    borderRadius: 8,
    cursor: "pointer",
  },
  done: {
    textAlign: "center",
  },
  reset: {
    marginTop: 10,
    padding: "10px 15px",
    borderRadius: 8,
  },
};