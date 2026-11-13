import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Icon } from "../components/icons/Icon";

const highlights = [
  {
    number: "01",
    title: "Discover",
    text: "Browse school resources and find available books before visiting the library.",
  },
  {
    number: "02",
    title: "Reserve",
    text: "Join a title waitlist and follow your place when every copy is borrowed.",
  },
  {
    number: "03",
    title: "Keep track",
    text: "See current loans, return dates, reservations, and account activity in one place.",
  },
];

export function WelcomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [celebrating, setCelebrating] = useState(false);
  const destination = user ? "/dashboard" : "/login";
  const action = loading
    ? "Preparing library…"
    : user
      ? "Open my library"
      : "Sign in to the library";
  const year = new Date().getFullYear();

  function continueToLibrary() {
    if (loading || celebrating) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(destination);
      return;
    }
    setCelebrating(true);
    window.setTimeout(() => navigate(destination), 650);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-paper">
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center px-5 py-5 sm:px-8 lg:px-12">
        <Link
          className="flex items-center gap-3"
          to="/"
          aria-label="CSCMINHS Library home"
        >
          <span className="grid size-11 place-items-center bg-forest text-white">
            <Icon name="book" />
          </span>
          <span>
            <span className="block font-serif text-lg leading-tight">
              CSCMINHS Library
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-forest-light">
              Learn · Read · Grow
            </span>
          </span>
        </Link>
      </header>

      <section
        className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-14 pt-8 sm:px-8 lg:min-h-[650px] lg:grid-cols-[minmax(0,1fr)_minmax(420px,.9fr)] lg:px-12 lg:pb-20 lg:pt-12"
        aria-labelledby="welcome-title"
      >
        <div className="relative z-[1] max-w-3xl animate-page-enter">
          <p className="inline-flex items-center gap-2 border-l-4 border-gold bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[.18em] text-forest">
            <span className="size-2 bg-gold" aria-hidden="true" />
            Your school library, online
          </p>
          <h1
            id="welcome-title"
            className="mt-6 font-serif text-4xl leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            A cheerful place to{" "}
            <span className="text-forest">read, learn,</span> and grow.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Welcome to the Cristobal S. Conducto Memorial Integrated National
            High School Library. Discover books, manage your borrowing, and stay
            connected with the school’s collection.
          </p>
          <div className="mt-8">
            <button
              className="inline-flex items-center justify-center bg-forest px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-forest-light disabled:cursor-wait disabled:opacity-60"
              type="button"
              onClick={continueToLibrary}
              disabled={loading || celebrating}
            >
              {celebrating ? "Opening library…" : action}
              <span className="ml-3" aria-hidden="true">→</span>
            </button>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted">
            Available to registered students, teachers, librarians, and school
            administrators.
          </p>
        </div>

        <LibraryIllustration />
        <div
          className="pointer-events-none absolute -right-24 top-0 size-72 rounded-full bg-gold/15 blur-3xl"
          aria-hidden="true"
        />
      </section>

      <section
        id="library-services"
        className="border-y border-line bg-white"
        aria-labelledby="services-title"
      >
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-forest-light">
                Made for our school community
              </p>
              <h2
                id="services-title"
                className="mt-3 font-serif text-3xl sm:text-4xl"
              >
                Your next book is closer than you think.
              </h2>
            </div>
            <ol className="grid gap-px border border-line bg-line sm:grid-cols-3">
              {highlights.map((item) => (
                <li className="bg-white p-5 sm:p-6" key={item.number}>
                  <span className="font-mono text-xs font-bold text-gold">
                    {item.number}
                  </span>
                  <h3 className="mt-4 font-serif text-xl">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className="bg-forest px-5 py-7 text-center text-xs leading-5 text-white/65">
        <p>
          © {year} Cristobal S. Conducto Memorial Integrated National High
          School Library System.
        </p>
        <p>All rights reserved.</p>
      </footer>
      {celebrating && <Confetti />}
    </main>
  );
}

function Confetti() {
  return <div className="welcome-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span className="welcome-confetti-piece" key={index} />)}</div>
}

function LibraryIllustration() {
  return (
    <div
      className="relative mx-auto h-[390px] w-full max-w-xl animate-page-enter sm:h-[470px]"
      aria-hidden="true"
    >
      <div className="absolute left-[8%] top-[5%] size-24 rounded-full bg-gold sm:size-32">
        <span className="absolute -left-3 top-1/2 h-1 w-3 bg-gold" />
        <span className="absolute -right-3 top-1/2 h-1 w-3 bg-gold" />
        <span className="absolute left-1/2 -top-3 h-3 w-1 bg-gold" />
      </div>
      <div className="absolute inset-x-[4%] bottom-0 h-[72%] border-[10px] border-forest bg-white sm:border-[14px]">
        <div className="absolute inset-x-0 top-0 h-4 bg-gold" />
        <div className="absolute inset-x-[8%] top-[18%] h-3 bg-forest" />
        <div className="absolute inset-x-[8%] top-[48%] h-3 bg-forest" />
        <div className="absolute inset-x-[8%] top-[78%] h-3 bg-forest" />
        <BookRow
          className="top-[24%]"
          colors={[
            "bg-emerald-700",
            "bg-gold",
            "bg-green-500",
            "bg-amber-600",
            "bg-forest",
          ]}
        />
        <BookRow
          className="top-[54%]"
          colors={["bg-gold", "bg-forest", "bg-lime-600", "bg-emerald-600"]}
        />
      </div>
      <div className="absolute bottom-[8%] right-[12%] h-28 w-20 bg-forest-light">
        <div className="absolute -top-9 left-2 h-10 w-16 border-4 border-forest-light bg-paper" />
        <div className="absolute left-1/2 top-5 size-3 -translate-x-1/2 rounded-full bg-gold" />
      </div>
      <div className="absolute bottom-[9%] left-[12%] h-20 w-16 bg-gold">
        <div className="absolute -top-6 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full bg-amber-700" />
      </div>
    </div>
  );
}

function BookRow({
  className,
  colors,
}: {
  className: string;
  colors: string[];
}) {
  const heights = ["h-2/3", "h-5/6", "h-full"];
  return (
    <div
      className={`absolute inset-x-[12%] flex h-[20%] items-end gap-2 ${className}`}
    >
      {colors.map((color, index) => (
        <span
          className={`${color} ${heights[index % heights.length]} block flex-1 border-x-2 border-white/40`}
          key={`${color}-${index}`}
        />
      ))}
    </div>
  );
}
